import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { EVENTS, gameEvents } from '../config/Events';
import PlayerState from './PlayerState';
import PlayerStatusUI from '../ui/PlayerStatusUI'; // ✅ 引入新类
import DataManager from '../managers/DataManager';
import { KiteVisual } from './KiteVisual';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  // 计算出世界的实际宽度
  private worldWidth: number;

  // ✅ 新增
  public playerState: PlayerState;
  private statusUI: PlayerStatusUI; // ✅ 替换 uiGraphics


  // ✅ 新增：磁场传感器 (不可见，但有物理判定)
  public magnetZone: Phaser.GameObjects.Zone; 
  private magnetPhysicsBody: Phaser.Physics.Arcade.Body; // 方便类型提示

  public goldMagnetZone: Phaser.GameObjects.Zone; 
  private goldMagnetPhysicsBody: Phaser.Physics.Arcade.Body; // 方便类型提示

  public visual: KiteVisual;

  // ✅ 类型安全 Getter：从此告别 this.body!
  public get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // super(scene, x, y, TextureKeys.PlayerKite);
    super(scene, x, y, 'pixel');
    this.setVisible(false);      // 隐藏物理体
    // 创建表现层
    const skinId = DataManager.data.selectedKite.skinId;
    this.visual = new KiteVisual(scene, skinId);
    scene.add.existing(this.visual);

    // 计算实际活动宽度：720 * 1.5 = 1080
    this.worldWidth = scene.scale.width * GameConfig.level.worldWidthRatio;

    // 1. 将自己添加到场景和物理世界中
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 初始化状态
    this.playerState = new PlayerState(this);
    
    // ✅ 实例化 UI 类
    this.statusUI = new PlayerStatusUI(scene, this);
    // 启用物理平滑插值 (Phaser 3.60+ 新特性)
    // 即使物理只有 60fps，渲染时会自动补间
    // this.arcadeBody.setDamping(true); // 配合阻力更加丝滑

    // 2. 初始化物理属性 (从配置读取)
    // this.setCollideWorldBounds(false); // 允许飞出屏幕
    this.setDragX(GameConfig.player.dragX);
    
    // 设置最大速度 (注意：X轴受限，Y轴上升飞快但下落受限)
    // 这里我们先设一个巨大的Y上限，具体的下落限制在 update 里做
    this.setMaxVelocity(GameConfig.player.moveSpeed, GameConfig.player.maxFlySpeed);

    // 假设风筝图片是 128x128
    // 我们希望受击判定只有中间 30px 大小 (手感更好，不容易死)
    const hitRadius = GameConfig.player.hitRadius; // 半径 15

    // ✅ 1. 设置圆形半径
    this.arcadeBody.setCircle(hitRadius);

    // ✅ 2. 修正偏移 (Offset)
    // 默认 setCircle 会把圆放在图片左上角。我们需要把它挪到图片中心。
    // 公式：Offset = (图片宽/2) - 半径
    // 假设图片宽高你是知道的，或者动态获取
    const offsetX = (this.width / 2) - hitRadius;
    const offsetY = (this.height / 2) - hitRadius;
    
    this.arcadeBody.setOffset(offsetX, offsetY);


    // --- 初始化磁场传感器 ---
    // 创建一个 Zone (没有纹理的物体)
    this.magnetZone = scene.add.zone(x, y, 100, 100);
    scene.physics.add.existing(this.magnetZone);
    
    // 获取 Zone 的物理 Body
    this.magnetPhysicsBody = this.magnetZone.body as Phaser.Physics.Arcade.Body;
    
    // 设置为圆形的触发器
    // 初始半径先给个 0，update 里会动态更新
    this.magnetPhysicsBody.setCircle(1); 
    this.magnetPhysicsBody.setAllowGravity(false); // 磁场不受重力
    this.magnetPhysicsBody.setImmovable(true);     // 磁场不会被撞飞
    // 关键：不参与物理碰撞反应，只负责触发 overlap
    // 在 Phaser Arcade 中，overlap 默认就是不阻挡的，所以不需要像 Unity 那样设 isTrigger

    // --- 初始化金色磁场传感器 ---
    this.goldMagnetZone = scene.add.zone(x, y, 100, 100);
    scene.physics.add.existing(this.goldMagnetZone);
    this.goldMagnetPhysicsBody = this.goldMagnetZone.body as Phaser.Physics.Arcade.Body;
    this.goldMagnetPhysicsBody.setCircle(1);
    this.goldMagnetPhysicsBody.setAllowGravity(false);
    this.goldMagnetPhysicsBody.setImmovable(true);

    // 3. 初始化输入
    // 注意：这里假设键盘必然存在。如果是移动端触摸，可以在这里扩展触摸逻辑
    this.cursors = scene.input.keyboard!.createCursorKeys();
  }
  

  /**
   * 每一帧自动调用 (需要在 Scene 的 update 中手动触发)
   */
  update(_time: number, delta: number) {
    // ✅ 1. 驱动 Buff 系统 (处理计时器、过期移除)
    // 传入单位：秒
    this.updateMagnetZone(); // ✅ 同步磁场位置
    this.playerState.update(delta);
    // this.updateDashVisuals(); // ✅ 更新冲刺视觉效果
    // ✅ 调用 UI 更新
    this.statusUI.update();


    // A. 重力变化
    this.arcadeBody.setGravityY(
      this.playerState.getFinalGravityY()
    );
    // ✅ B. 新增：应用侧风 (Gravity X)
    // 这会让玩家在不操作时也产生漂移，且顺风快逆风慢
    // 注意：如果阻力(Drag)很大，风力必须足够大(>800)才能吹动玩家
    this.arcadeBody.setGravityX(this.playerState.getFinalGravityX());
    // B. 阻力
    this.setDragX(this.playerState.getFinalDragX());
    // C. 速度限制
    const maxSpeed = this.playerState.getXMaxSpeed();
    this.setMaxVelocity(maxSpeed, GameConfig.player.maxFlySpeed);

    // C. 冲刺时的特殊物理
    if (this.playerState.isDashing) {
        // ✅ 实现“恒定速度” (Lv1=1800, Lv2=2200, Lv3=2500)
        let targetSpeed = this.playerState.getDashSpeed();
        // 冲刺期间，强制向上速度，且无视阻力
        this.setVelocityY(targetSpeed);
        // 冲刺期间无敌 (穿墙逻辑不变，但撞障碍物逻辑在 InteractableEntity 里判断)
    } else {
        // 非冲刺状态：限制最大下落速度
        if (this.arcadeBody.velocity.y > GameConfig.player.maxFallSpeed) {
            this.setVelocityY(GameConfig.player.maxFallSpeed);
        }
    }

    // 1. 同步位置
    this.visual.setPosition(this.x, this.y);
    // 获取环境风力 (如果你有 WindManager)
    // 如果没有，可以用玩家移动速度的反方向模拟风
    // 比如：windX = -this.body.velocity.x * 0.01;
    const windX = Math.sin(_time / 500) * 0.5; // 模拟微风摆动
    const windY = 0;

    // inputX: -1, 0, 1
    const inputX = this.cursors.left.isDown ? -1 : (this.cursors.right.isDown ? 1 : 0);
    
    // 更新视觉
    this.visual.updateVisuals(inputX, windX, windY);
    const accel = this.playerState.getFinalAcceleration();
    // D. 水平移动输入
    if (this.cursors.left.isDown) {
      this.setAccelerationX(-accel);
      // this.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.setAccelerationX(accel);
      // this.setFlipX(false);
    } else {
      this.setAccelerationX(0);
    }

    this.checkScreenWrap();
  }



  // ✅ 新增：获取磁场半径 (基础 + 升级)
  public getMagnetRadius(): number {
    // 直接转发
    return this.playerState.getMagnetRadius();
  }

  public getGoldMagnetRadius(): number {
    // 金色磁场半径更大一些
    return this.playerState.getGoldMagnetRadius();
  }

  private updateMagnetZone() {
    // 将 Zone 移动到玩家中心
    // 因为 setCircle 后 anchor 可能会变，最稳妥的方式是直接对齐 center
    const center = this.getCenter();

    // ✅ 1. 核心：让磁场跟随玩家
    // 注意：Body 的位置是左上角，所以要根据半径居中
    const magnetRadius = this.getMagnetRadius();
    
    // 更新磁场半径 (以支持动态升级)
    // setCircle(radius, offsetX, offsetY)
    // Phaser 的 Zone 中心点对齐比较诡异，通常需要手动计算 offset
    this.magnetPhysicsBody.setCircle(magnetRadius);
    
    
    // 手动计算 body 位置使其居中
    // body.x = center.x - radius
    this.magnetPhysicsBody.x = center.x - magnetRadius;
    this.magnetPhysicsBody.y = center.y - magnetRadius;

    // ✅ 2. 金色磁场
    const goldMagnetRadius = this.getGoldMagnetRadius();
    this.goldMagnetPhysicsBody.setCircle(goldMagnetRadius);
    this.goldMagnetPhysicsBody.x = center.x - goldMagnetRadius;
    this.goldMagnetPhysicsBody.y = center.y - goldMagnetRadius;
  }

  // private updateDashVisuals() {
  //   const vm = (this.scene as any).visualManager; // 假设你有 VisualManager
    
  //   if (this.buffs.hasTag('State.Dash.Lv3')) {
  //      // 金色粒子 + 速度线
  //      vm.setTrailStyle('gold_particle');
  //   } else if (this.buffs.hasTag('State.Dash.Lv2')) {
  //      // 宽拖尾 + 速度线
  //      vm.setTrailStyle('wide_trail');
  //   } else if (this.buffs.hasTag('State.Dash.Lv1')) {
  //      // 白色气流
  //      vm.setTrailStyle('white_stream');
  //   } else {
  //      // 关闭拖尾
  //      vm.setTrailStyle('none');
  //   }
  // }

  /**
   * 穿墙逻辑封装
   */
  private checkScreenWrap() {
    const halfWidth = this.width / 2;
    // const screenWidth = this.scene.scale.width;

    // 左边界限制
    if (this.x < halfWidth) {
      this.x = halfWidth;
      this.setVelocityX(0); // 撞墙停下
    } 
    // 右边界限制 (使用 worldWidth)
    else if (this.x > this.worldWidth - halfWidth) {
      this.x = this.worldWidth - halfWidth;
      this.setVelocityX(0); // 撞墙停下
    }
  }

  /**
   * 提供给外部调用的：被弹起/加速
   */
  public boost(force: number) {
    // ✅ 逻辑修正：防止减速
    // Phaser中向上是负数，越小越快。
    // 如果当前速度是 -1000，目标是 -600，我们应该保留 -1000。
    // Math.min(-1000, -600) = -1000 (保留更快的速度)
    // 如果当前速度是 200 (下落)，目标是 -600，Math.min(200, -600) = -600 (起飞)
    const currentVel = this.arcadeBody.velocity.y;
    const tarForce = force * DataManager.getBoostScale();
    this.setVelocityY(Math.min(currentVel, tarForce));
  }

  /**
   * 提供给外部调用的：设置激活状态
   * 用于游戏开始前暂停，或结束后冻结
   */
  public setEnabled(isEnabled: boolean) {
    // 开启/关闭物理模拟
    if (this.arcadeBody) {
        this.arcadeBody.enable = isEnabled;
        this.arcadeBody.setAllowGravity(isEnabled);
    }
    
    // ✅ 修正：始终隐藏自己 (物理核)，只控制表现层 (visual) 的显隐
    this.setVisible(false); 
    if (this.visual) {
        this.visual.setVisible(isEnabled);
    }
  }

  public die(cause: string) {
    // 触发游戏结束事件，传递死亡原因
    gameEvents.emit(EVENTS.GAME_OVER, cause);
  }

  // 销毁时记得清空 Graphics
  destroy(fromScene?: boolean) {
    this.magnetZone.destroy();
    this.statusUI.destroy();
    super.destroy(fromScene);
  }
}