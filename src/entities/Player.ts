import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { EVENTS, gameEvents } from '../managers/events';
import PlayerState from './PlayerState';
import PlayerStatusUI from '../ui/PlayerStatusUI'; // ✅ 引入新类

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  // 计算出世界的实际宽度
  private worldWidth: number;

  // ✅ 新增
  public playerState: PlayerState;
  private statusUI: PlayerStatusUI; // ✅ 替换 uiGraphics

  // ✅ 类型安全 Getter：从此告别 this.body!
  public get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'kite');

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
    this.arcadeBody.setDamping(true); // 配合阻力更加丝滑

    // 2. 初始化物理属性 (从配置读取)
    // this.setCollideWorldBounds(false); // 允许飞出屏幕
    this.setDragX(GameConfig.player.dragX);
    
    // 设置最大速度 (注意：X轴受限，Y轴上升飞快但下落受限)
    // 这里我们先设一个巨大的Y上限，具体的下落限制在 update 里做
    this.setMaxVelocity(GameConfig.player.moveSpeed, GameConfig.player.maxFlySpeed);

    // 3. 初始化输入
    // 注意：这里假设键盘必然存在。如果是移动端触摸，可以在这里扩展触摸逻辑
    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

  /**
   * 每一帧自动调用 (需要在 Scene 的 update 中手动触发)
   */
  update() {
    this.playerState.update(this.scene.game.loop.delta);

    // ✅ 调用 UI 更新
    this.statusUI.update();

    // A. 重力变化
    const gravityMult = this.playerState.getGravityMultiplier();
    // 基础重力 * 倍率
    this.arcadeBody.setGravityY(GameConfig.physics.gravity.y * (gravityMult - 1)); 
    // 注意：Phaser 的 body.gravity 是额外叠加的，world.gravity 是基础
    // 如果你之前在 consts 设了 world gravity，这里 setGravityY 是设置“个体重力”
    // 更准确的做法是修改 body.gravity.y 直接覆盖，或者利用 accelerationY
    // 简单做法：
    // 假设 consts 里的 gravity.y 是 500。
    // 如果倍率是 1.3 (+30%)，我们需要让总重力变成 500 * 1.3 = 650
    // 所以 body.setGravityY(500 * 0.3) = 150。总重力 = 500 + 150 = 650。
    this.arcadeBody.setGravityY(GameConfig.physics.gravity.y * (gravityMult - 1));

    // B. 操控手感变化 (冻僵变沉)
    const controlMult = this.playerState.getControlModifier();
    const currentAccel = GameConfig.player.acceleration * controlMult;
    const currentMaxSpeed = GameConfig.player.moveSpeed * controlMult;

    // C. 冲刺时的特殊物理
    if (this.playerState.isDashing) {
        // 冲刺期间，强制向上速度，且无视阻力
        this.setVelocityY(GameConfig.playerState.dashSpeed);
        // 冲刺期间无敌 (穿墙逻辑不变，但撞障碍物逻辑在 InteractableEntity 里判断)
    } else {
        // 非冲刺状态：限制最大下落速度
        if (this.arcadeBody.velocity.y > GameConfig.player.maxFallSpeed) {
            this.setVelocityY(GameConfig.player.maxFallSpeed);
        }
    }

    // ✅ 2. 核心玩法：计算动态加速度
    // 获取当前垂直速度的绝对值（不管是飞升还是坠落）
    const absVerticalSpeed = Math.abs(this.arcadeBody.velocity.y);

    // 基础加速度 + (垂直速度 * 系数)
    // 速度越快，加速度越大，操作越灵敏
    const dynamicAccel = currentAccel + (absVerticalSpeed * GameConfig.player.verticalToHorizontalRatio);

    // B. 输入控制
    if (this.cursors.left.isDown) {
      this.setAccelerationX(-dynamicAccel);
      this.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.setAccelerationX(dynamicAccel);
      this.setFlipX(false);
    } else {
      this.setAccelerationX(0);
    }

    // C. 穿墙逻辑 (Screen Wrap)
    this.checkScreenWrap();
  }

  /**
   * 穿墙逻辑封装
   */
  private checkScreenWrap() {
    const halfWidth = this.width / 2;
    const screenWidth = this.scene.scale.width;

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
    this.setVelocityY(Math.min(currentVel, force));
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
    
    // 显隐控制 (可选)
    this.setVisible(isEnabled ? true : this.visible);
  }

  public die(cause: string) {
    // 触发游戏结束事件，传递死亡原因
    gameEvents.emit(EVENTS.GAME_OVER, cause);
  }

  // 销毁时记得清空 Graphics
  destroy(fromScene?: boolean) {
      this.statusUI.destroy();
      super.destroy(fromScene);
  }
}