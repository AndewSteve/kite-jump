import Phaser from "phaser";
import { GameConfig } from "../config/GameConfig";
import CameraManager from "../managers/CameraManager";
import { EVENTS, gameEvents } from "../managers/events";
// ✅ 引入实体类
import Player from "../entities/Player";
// ✅ 引入新系统
import InteractableEntity from "../entities/InteractableEntity";

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

    // --- 碰撞 ---
    this.physics.add.overlap(
      this.player,
      this.interactables,
      this.hitInteractable,
      undefined,
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
    this.player.update();

    // 2. 视差滚动
    this.background.tilePositionY = this.cameras.main.scrollY * 0.5;

    // X轴也需要跟随一点点，增加立体感
    // (可选) 如果背景是无缝的，可以这样做
    this.background.tilePositionX = this.cameras.main.scrollX * 0.5;

    // 3. 云朵回收与生成
    this.recycleEntities();

    // 4. 相机更新
    console.log('CameraManager Update');
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

    // ✅ 获取/创建 Cloud 实例
    // 使用 get() 可以自动利用对象池 (如果是刚被 kill 的云，会复用它)
    const entity = this.interactables.get(x, y) as InteractableEntity;

    if (entity) {
      // ✅ 调用 Cloud 自己的 setup 方法
      entity.setActive(true);
      entity.setVisible(true);
      entity.configure(selectedDef.init());
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
}
