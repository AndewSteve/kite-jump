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
import SpawnManager from "../managers/SpawnManager";
import PhaseManager from "../managers/PhaseManager";
import BackgroundManager from "../managers/BackgroundManager";
import ScoreManager from "../managers/ScoreManager";
import SummonManager from "../managers/SummonManager";
import { ThermalVent } from "../entities/summons/ThermalVent";

export default class GameScene extends Phaser.Scene {
  // ✅ 1. 类型改为 Player 类
  public player!: Player;
  // ✅ 修改类型：现在这是“可交互实体”组，不仅放云，以后也能放鸟
  public interactables!: Phaser.Physics.Arcade.Group;
  public backgroundManager!: BackgroundManager; // ✅ 新增
  public scoreManager!: ScoreManager;           // ✅ 新增
  public cameraManager!: CameraManager;
  public spawnManager!: SpawnManager;
  public phaseManager!: PhaseManager; // 公开，给其他系统调用
  public summonManager!: SummonManager;
  private isGameRunning: boolean = false;

  // 新增：缓存世界宽度
  private worldWidth!: number;

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("bg", "assets/bg.png");
    this.load.image("bg_frost", "assets/bg_frost.png");
    this.load.image("云层", "assets/云层.png");
    this.load.image("kite", "assets/kite.png");
    this.load.image("cloud", "assets/cloud.png");
  }

  create() {
    this.scene.launch("UIScene");
    const { width, height } = this.scale;
    // 计算世界宽度
    this.worldWidth = width * GameConfig.level.worldWidthRatio;

    // ✅ 移交给 Manager
    this.backgroundManager = new BackgroundManager(this);

    // --- 云朵组 ---
    // ✅ 关键：指定 classType 为 Cloud，这样 create 出来的就是 Cloud 实例
    this.interactables = this.physics.add.group({
      classType: InteractableEntity,
      maxSize: 50,
      runChildUpdate: false,
    });
    
    // --- 玩家 ---
    // ✅ 使用 Player 类创建
    this.player = new Player(this, this.worldWidth / 2, height - 200);
    this.scoreManager = new ScoreManager(this, this.player.y); // ✅ 传入初始 Y
    this.spawnManager = new SpawnManager(this, this.interactables, this.player);
    this.phaseManager = new PhaseManager(this);
    this.summonManager = new SummonManager(this);
    this.summonManager.register('vent', ThermalVent, 'screen', 5);
    // 初始化状态
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

    // 2. ✅ 感应层：磁场 vs 互动物体
    // 这就是你想要的“乐观碰撞”：先判定碰到了，再在回调里检查类型
    this.physics.add.overlap(
        this.player.goldMagnetZone, 
        this.interactables, 
        this.handleMagnetSensing, // 磁场感应到了
        this.checkCanMagnet,      // 过滤器 (Process Callback)
        this
    );

    // --- 事件 ---
    this.setupEvents();
    this.enterReadyPhase();
  }

  private setupEvents() {
    gameEvents.off(EVENTS.GAME_START);
    gameEvents.off(EVENTS.GAME_OVER);
    gameEvents.off(EVENTS.GAME_RESTART);

    gameEvents.on(
      EVENTS.GAME_START,
      () => {
        console.log("游戏开始！");
        this.isGameRunning = true;
        this.scoreManager.startTracking();
        this.phaseManager.startFirstPhase();
        this.spawnManager.initClouds(this.worldWidth, 0);
        // this.player.setEnabled(true);
        // this.player.boost(GameConfig.player.startForce);
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
  }

  private enterReadyPhase() {
    console.log("进入：准备阶段");
    // this.phaseManager.startFirstPhase(); // 进入第一阶段
    // 可以在这里添加准备阶段的逻辑，比如倒计时等
  }

  update(time: number, delta: number) {
    if (!this.isGameRunning) return;

    // 1. 导演层：决定游戏所处阶段 (切换状态、刷怪开关、物理环境)
    this.phaseManager.update(delta);

    // 2. 实体层：玩家逻辑 (Buff倒计时、物理运动、输入)
    this.player.update(time, delta);
    this.spawnManager.update(this.worldWidth); // 简化参数
    this.scoreManager.update(this.player.y);      // ✅ 更新分数/高度

    // 3. 视差滚动
    this.cameraManager.update(delta);
    this.backgroundManager.update(this.cameras.main);


    // 6. 死亡判定
    if (this.player.y > this.scoreManager.getDeathThresholdY()) {
      this.handleGameOver(`Fell too low`);
    }
  }

  public handleGameOver(cause: string) {
    if (!this.isGameRunning) return;
    this.isGameRunning = false;
    this.physics.pause();
    this.player.setTint(0x555555);

    this.scoreManager.stopTracking(); // ✅ 停止计分

    // ✅ 获取最终数据
    const stats = this.scoreManager.getFinalStats();

    // ✅ 保存记录 (存入历史，更新金币)
    // 注意：这里我们用 Score 作为金币基准，你可以根据需要调整
    DataManager.addRecord(stats.score, stats.height);

    gameEvents.emit(EVENTS.SHOW_GAME_OVER, {
      finalHeight: stats.height,
      finalScore: stats.score,
      cause: cause
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
    // 3. 金币只被金色磁场吸取
    if (entity.entityType === EntityType.Coin &&
      _magnetZone === this.player.goldMagnetZone) {
      return true;
    }
    if (entity.entityType === EntityType.Coin &&
      _magnetZone !== this.player.goldMagnetZone) {
      return false;
    }
    // 4. 非金币只被普通磁场吸取
    if (_magnetZone === this.player.goldMagnetZone &&
      entity.entityType !== EntityType.Coin) {
      return false;
    }
    
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
   * 磁场回调
  */
  private handleMagnetSensing(_magnetZone: any, target: any) {
    const entity = target as InteractableEntity;
    if (!entity.active) return;
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
