import Phaser from "phaser";
import { GameConfig } from "../config/GameConfig";
import CameraManager from "../managers/CameraManager";
import { EVENTS, gameEvents } from "../managers/events";
// ✅ 引入实体类
import Player from "../entities/Player";
// ✅ 引入新系统
import InteractableEntity from "../entities/InteractableEntity";
import DataManager from "../managers/DataManager";
import { EntityType } from "../types/GameTypes";

export default class GameScene extends Phaser.Scene {
  // ✅ 1. 类型改为 Player 类
  private player!: Player;
  // ✅ 修改类型：现在这是“可交互实体”组，不仅放云，以后也能放鸟
  private interactables!: Phaser.Physics.Arcade.Group;

  private background!: Phaser.GameObjects.TileSprite;
  private cameraManager!: CameraManager;
  private currentScore: number = 0; // ✅ 新增：总分
  private highestY!: number;
  private isGameRunning: boolean = false;
  private startY: number = 0;

  // 新增：缓存世界宽度
  private worldWidth!: number;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.image("kite", "assets/kite.png");
    this.load.image("cloud", "assets/cloud.png");
  }

  create() {
    this.scene.launch("UIScene");
    const { width, height } = this.scale;
    // 计算世界宽度
    this.worldWidth = width * GameConfig.level.worldWidthRatio;

    // --- 背景 ---
    // 1. 计算需要的覆盖尺寸
    // 当相机缩小时(0.85)，视野变大，所以背景图必须比屏幕大，才能填满缩小的镜头
    // 加上 .setScrollFactor(0) 后，物体是跟着镜头缩放的，所以物理尺寸必须加大
    const minZoom = GameConfig.camera.zoom.sprinting; // 0.85
    const bgWidth = this.worldWidth / minZoom; // 确保宽度足够覆盖
    const bgHeight = height / minZoom;         // 确保高度足够覆盖 (1280 / 0.85 ≈ 1506)

    // --- 背景 ---
    // ✅ 修改：背景图需要铺满整个 1.5倍 宽度
    // 或者我们保持背景图大小，让它跟随相机移动（简单的视差）
    this.background = this.add.tileSprite(
        width / 2,   // ✅ 修正 X：使用屏幕中心 (360)，而不是世界中心 (540)
        height / 2,  // ✅ 修正 Y：使用屏幕中心
        bgWidth,     // ✅ 修正 W：足够大的宽度
        bgHeight,    // ✅ 修正 H：足够大的高度 (解决上下黑边)
        'bg'
    ).setScrollFactor(0);

    // --- 云朵组 ---
    // ✅ 关键：指定 classType 为 Cloud，这样 create 出来的就是 Cloud 实例
    this.interactables = this.physics.add.group({
      classType: InteractableEntity,
      maxSize: 50,
      runChildUpdate: false,
    });
    this.initClouds();

    // --- 玩家 ---
    // ✅ 使用 Player 类创建
    this.player = new Player(this, this.worldWidth / 2, height - 200);

    // 初始化状态
    this.startY = this.player.y;
    this.highestY = this.player.y;
    this.currentScore = 0; // 重置分数
    this.player.setEnabled(false); // 初始暂停
    this.isGameRunning = false;

    // --- 相机 ---
    this.cameraManager = new CameraManager(this);
    this.cameraManager.follow(this.player);
    // ✅ 设置相机的水平边界，防止看到黑边
    this.cameras.main.setBounds(0, -Infinity, this.worldWidth, Infinity);

    // 1. 物理层：玩家身体 vs 互动物体
    // 这里的 processCallback (第三个参数) 可以用来做更细的过滤，比如冲刺时无敌不触发陷阱
    this.physics.add.overlap(
      this.player,
      this.interactables,
      this.hitInteractable,
      undefined,
      this
    );

    // 2. ✅ 感应层：磁场 vs 互动物体
    // 这就是你想要的“乐观碰撞”：先判定碰到了，再在回调里检查类型
    this.physics.add.overlap(
        this.player.magnetZone, 
        this.interactables, 
        this.handleMagnetSensing, // 磁场感应到了
        this.checkCanMagnet,      // 过滤器 (Process Callback)
        this
    );

    // --- 事件 ---
    this.setupEvents();
  }

  private setupEvents() {
    gameEvents.off(EVENTS.GAME_START);
    gameEvents.off(EVENTS.GAME_OVER);
    gameEvents.off(EVENTS.GAME_RESTART);
    gameEvents.off(EVENTS.ADD_SCORE); // ✅ 防止重复监听

    gameEvents.on(
      EVENTS.GAME_START,
      () => {
        this.isGameRunning = true;
        this.player.setEnabled(true);
        this.player.boost(GameConfig.player.startForce);
      },
      this
    );

    gameEvents.on(
      EVENTS.GAME_OVER,
      (cause: string) => {
        this.handleGameOver(cause);
      },
      this
    );

    gameEvents.on(
      EVENTS.GAME_RESTART,
      () => {
        this.scene.restart();
      },
      this
    );

    // ✅ 监听加分请求
    gameEvents.on(
      EVENTS.ADD_SCORE,
      (amount: number) => {
        this.currentScore += amount;
        // 通知 UI 更新
        gameEvents.emit(EVENTS.UPDATE_SCORE, this.currentScore);
      },
      this
    );
  }

  update(_time: number, delta: number) {
    if (!this.isGameRunning) return;

    // ✅ 1. 委托 Player 处理物理和输入
    this.player.update(_time, delta);

    // 2. 视差滚动
    this.background.tilePositionY = this.cameras.main.scrollY * 0.5;

    // X轴也需要跟随一点点，增加立体感
    // (可选) 如果背景是无缝的，可以这样做
    this.background.tilePositionX = this.cameras.main.scrollX * 0.5;

    // 3. 云朵回收与生成
    this.recycleEntities();

    // 4. 相机更新
    this.cameraManager.update(delta);

    // 5. 分数逻辑
    const previousHighestY = this.highestY;
    this.highestY = Math.min(this.highestY, this.player.y);

    if (this.highestY < previousHighestY) {
      const heightSignal = Math.floor((this.startY - this.highestY) / 10);
      gameEvents.emit(EVENTS.UPDATE_HEIGHT, heightSignal);
    }

    // 6. 死亡判定
    if (this.player.y > this.highestY + GameConfig.level.deathDepth) {
      this.handleGameOver(`Fell too low`);
    }
  }

  public handleGameOver(cause: string) {
    if (!this.isGameRunning) return;
    const heightScore = Math.floor((this.startY - this.highestY) / 10);
    this.isGameRunning = false;
    this.physics.pause();
    this.player.setTint(0x555555);

    // ✅ 保存记录 (存入历史，更新金币)
    // 注意：这里我们用 Score 作为金币基准，你可以根据需要调整
    DataManager.addRecord(this.currentScore, heightScore);

    gameEvents.emit(EVENTS.SHOW_GAME_OVER, {
      finalHeight: heightScore,
      finalScore: this.currentScore,
      cause: cause
    });
  }

  private initClouds() {
    for (let i = 0; i < GameConfig.level.cloudCount; i++) {
      const y = GameConfig.height / 2 - i * GameConfig.level.cloudGap;
      this.spawnRow(y);
    }
  }

  // ✅ 新增：负责生成“一行”里的多个物体
  private spawnRow(y: number) {
    // 1. 决定这一行生成几个 (1 到 Max)
    // 你可以加个权重，让生成 1 个的概率大一点，2 个的小一点
    const count = Phaser.Math.Between(1, GameConfig.level.maxSpawnsPerRow);

    // 用于记录已占用的 X 坐标，防止重叠
    const usedX: number[] = [];

    for (let i = 0; i < count; i++) {
      // 尝试寻找一个不重叠的 X 坐标 (最多尝试 10 次，防止死循环)
      let x = 0;
      let valid = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        x = Phaser.Math.Between(50, this.worldWidth - 50);

        // 检查与已有物体的距离
        let tooClose = false;
        for (const existingX of usedX) {
          if (Math.abs(x - existingX) < GameConfig.level.minSpawnDistance) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          valid = true;
          break;
        }
      }

      if (valid) {
        this.spawnEntity(x, y);
        usedX.push(x);
      }
    }
  }

  private spawnEntity(x: number, y: number) {
    // 1. 权重随机算法 (Weighted Random)
    const spawnDefinitions = Object.values(GameConfig.spawnTable);

    // A. 计算总权重
    let totalWeight = 0;
    for (const def of spawnDefinitions) {
      totalWeight += def.weight;
    }

    // B. 随机取值
    let randomWeight = Phaser.Math.Between(0, totalWeight);
    let selectedDef = spawnDefinitions[0];

    // C. 遍历扣除权重
    for (const def of spawnDefinitions) {
      randomWeight -= def.weight;
      if (randomWeight <= 0) {
        selectedDef = def;
        break;
      }
    }

    let finalDef = selectedDef;

    // ✅ Lv3 风神降临逻辑：正面道具 -> 金币
    if (this.player && this.player.playerState.buffs.hasTag('State.GoldMode')) {
        // 创建一个临时的配置对象来检查类型
        const tempConfig = selectedDef.init();
        
        if (tempConfig.type === EntityType.Buff) {
            // 替换为金币 (假设 spawnTable 里有 'coin')
            finalDef = GameConfig.spawnTable['coin']; 
        }
    }

    // ✅ 获取/创建 Cloud 实例
    // 使用 get() 可以自动利用对象池 (如果是刚被 kill 的云，会复用它)
    const entity = this.interactables.get(x, y) as InteractableEntity;

    if (entity) {
      // ✅ 调用 Cloud 自己的 setup 方法
      entity.setActive(true);
      entity.setVisible(true);
      entity.configure(finalDef.init());
    }
  }

  private recycleEntities() {
    const cameraTop = this.cameras.main.scrollY;

    // 强制转换为 Cloud 数组
    const activeEntities =
      this.interactables.getChildren() as InteractableEntity[];

    // --- 1. 生成新云 ---
    let minY = cameraTop;

    // 必须检查 active，因为 getChildren() 会返回对象池里所有对象（包括死的）
    if (activeEntities.length > 0) {
      activeEntities.forEach((child) => {
        if (child && child.active && child.y < minY) {
          minY = child.y;
        }
      });
    }

    // ✅ 使用 GameConfig.level.spawnBuffer 替换硬编码 100
    if (minY > cameraTop - GameConfig.level.spawnBuffer) {
      this.spawnRow(minY - GameConfig.level.cloudGap);
    }

    // --- 2. 回收旧云 ---
    // ✅ 使用 GameConfig.level.cleanupThreshold 替换硬编码 200
    const threshold =
      this.cameras.main.scrollY +
      this.scale.height +
      GameConfig.level.cleanupThreshold;

    // 过滤出：存在的、活跃的、且位置在屏幕下方的云
    const entitiesToKill = activeEntities.filter(
      (child) => child && child.active && child.y > threshold
    );

    entitiesToKill.forEach((child) => {
      // ✅ 使用我们刚才在 Cloud.ts 里定义的 disable 方法
      // 这会同时处理 setVisible(false), setActive(false), body.enable = false
      child.disable();

      // 注意：killAndHide 只是 helper，如果 disable 里已经写了 setVisible/setActive，这里其实可以不写
      // 但为了双重保险保留也没问题：
      this.interactables.killAndHide(child);
    });
  }

  private hitInteractable(player: any, target: any) {
    const entity = target as InteractableEntity;
    const playerEntity = player as Player;

    // 委托给实体自己处理，场景不需要知道它是云还是鸟
    entity.onHit(playerEntity);
  }

  /**
   * 过滤器：只有符合条件的才触发回调
   * 类似于 Unity 的 "Layer Collision Matrix"
   */
  private checkCanMagnet(_magnetZone: any, target: any): boolean {
    const entity = target as InteractableEntity;
    
    // 1. 只吸 Buff
    if (entity.entityType !== EntityType.Buff) return false;
    
    // 2. 已经被吸过的/不活跃的 不吸
    if (!entity.active) return false;

    // 3. (可选) 更严格的圆形判定
    // Arcade Physics 的 overlap 默认是 AABB (矩形包围盒)。
    // 哪怕你 setCircle，它在这一步依然是按“正方形”检测的（为了性能）。
    // 如果你想要完美的圆形判定，可以在这里加一道 Distance Check。
    // const distSq = Phaser.Math.Distance.BetweenPointsSquared(
    //   this.player.getCenter(),
    //   entity.getCenter()
    // );
    // const r = this.player.getMagnetRadius();
    // if (distSq > r * r){ 
    //   console.log('Magnet check failed by distance.');
    //   return false;
    // }

    return true;
  }

  /**
   * 磁场回调：吸过来！
   */
  private handleMagnetSensing(_magnetZone: any, target: any) {
    const entity = target as InteractableEntity;
    // const playerPos = this.player.getCenter();
    const playerEntity = this.player;

    // 委托给实体自己处理，场景不需要知道它是云还是鸟
    entity.onHit(playerEntity);

    // 简单的吸附逻辑：让物体向玩家移动
    // 使用 Arcade Physics 的 moveTo Object
    // this.physics.moveToObject(
    //   entity, 
    //   this.player, 
    //   GameConfig.player.magnetForce
    // ); // 600 是吸附速度

    // 注意：这里我们只是让它飞过来。
    // 等它真的撞到 this.player (物理身体) 时，会触发上面的 handlePhysicalCollision，
    // 从而执行吃金币/加冲刺的逻辑。
  }
}
