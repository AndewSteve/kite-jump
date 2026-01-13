import Phaser from 'phaser';
import { GameConfig } from '../config/consts';
import { type CloudTypeConfig } from '../types/GameTypes';
import CameraManager from '../managers/CameraManager';
import { EVENTS, gameEvents } from '../managers/events';
// ✅ 引入实体类
import Player from '../entities/Player';
import Cloud from '../entities/Cloud';

export default class GameScene extends Phaser.Scene {
  // ✅ 1. 类型改为 Player 类
  private player!: Player; 
  // ✅ 2. 这里的 Group 将包含 Cloud 实例
  private clouds!: Phaser.Physics.Arcade.Group; 
  
  private background!: Phaser.GameObjects.TileSprite;
  private cameraManager!: CameraManager;
  
  private highestY!: number;
  private isGameRunning: boolean = false;
  private startY: number = 0;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('bg', 'assets/bg.png');
    this.load.image('kite', 'assets/kite.png');
    this.load.image('cloud', 'assets/cloud.png');
  }

  create() {
    this.scene.launch('UIScene');
    const { width, height } = this.scale;

    // --- 背景 ---
    this.background = this.add.tileSprite(width / 2, height / 2, width, height, 'bg')
      .setScrollFactor(0);

    // --- 云朵组 ---
    // ✅ 关键：指定 classType 为 Cloud，这样 create 出来的就是 Cloud 实例
    this.clouds = this.physics.add.group({
      classType: Cloud,
      maxSize: 30, // (可选) 限制对象池大小
      runChildUpdate: false // 云朵不需要每帧 update，省性能
    });
    this.initClouds();

    // --- 玩家 ---
    // ✅ 使用 Player 类创建
    this.player = new Player(this, width / 2, height - 200);
    
    // 初始化状态
    this.startY = this.player.y;
    this.highestY = this.player.y;
    this.player.setEnabled(false); // 初始暂停
    this.isGameRunning = false;

    // --- 相机 ---
    this.cameraManager = new CameraManager(this);
    this.cameraManager.follow(this.player);

    // --- 碰撞 ---
    this.physics.add.overlap(this.player, this.clouds, this.hitCloud, undefined, this);

    // --- 事件 ---
    this.setupEvents();
  }

  private setupEvents() {
    gameEvents.off(EVENTS.GAME_START);
    gameEvents.off(EVENTS.GAME_RESTART);

    gameEvents.on(EVENTS.GAME_START, () => {
      this.isGameRunning = true;
      this.player.setEnabled(true);
      this.player.boost(GameConfig.player.startForce);
    }, this);

    gameEvents.on(EVENTS.GAME_RESTART, () => {
      this.scene.restart();
    }, this);
  }

  update() {
    if (!this.isGameRunning) return;

    // ✅ 1. 委托 Player 处理物理和输入
    this.player.update();

    // 2. 视差滚动
    this.background.tilePositionY = this.cameras.main.scrollY * 0.5;

    // 3. 云朵回收与生成
    this.recycleClouds();

    // 4. 相机更新
    this.cameraManager.update();

    // 5. 分数逻辑
    const previousHighestY = this.highestY;
    this.highestY = Math.min(this.highestY, this.player.y);

    if (this.highestY < previousHighestY) {
        const score = Math.floor((this.startY - this.highestY) / 10);
        gameEvents.emit(EVENTS.UPDATE_SCORE, score);
    }

    // 6. 死亡判定
    if (this.player.y > this.highestY + GameConfig.level.deathDepth) {
        const finalScore = Math.floor((this.startY - this.highestY) / 10);
        this.handleGameOver(finalScore);
    }
  }

  private handleGameOver(score: number) {
    if (!this.isGameRunning) return; 
    
    this.isGameRunning = false;
    this.physics.pause();
    this.player.setTint(0x555555);
    
    gameEvents.emit(EVENTS.GAME_OVER, score);
  }

  private initClouds() {
    for (let i = 0; i < GameConfig.level.cloudCount; i++) {
      const y = 600 - (i * GameConfig.level.cloudGap);
      this.spawnCloud(y);
    }
  }

  private spawnCloud(y: number) {
    const x = Phaser.Math.Between(50, this.scale.width - 50);
    
    // 权重随机算法
    const cloudTypes = Object.values(GameConfig.clouds.types);
    const rand = Phaser.Math.Between(0, 100);
    let accumulatedProbability = 0;
    let selectedType: CloudTypeConfig = cloudTypes[0]; 

    for (const type of cloudTypes) {
        accumulatedProbability += type.probability;
        if (rand <= accumulatedProbability) {
            selectedType = type;
            break;
        }
    }
    
    // ✅ 获取/创建 Cloud 实例
    // 使用 get() 可以自动利用对象池 (如果是刚被 kill 的云，会复用它)
    const cloud = this.clouds.get(x, y) as Cloud;
    
    if (cloud) {
        // ✅ 调用 Cloud 自己的 setup 方法
        cloud.setActive(true);
        cloud.setVisible(true);
        cloud.setup(selectedType);
    }
  }

  private recycleClouds() {
    const cameraTop = this.cameras.main.scrollY;
    
    // 强制转换为 Cloud 数组
    const activeClouds = this.clouds.getChildren() as Cloud[];
    
    // --- 1. 生成新云 ---
    let minCloudY = cameraTop;
    
    // 必须检查 active，因为 getChildren() 会返回对象池里所有对象（包括死的）
    if (activeClouds.length > 0) {
        activeClouds.forEach(child => {
            if (child && child.active && child.y < minCloudY) {
                minCloudY = child.y;
            }
        });
    }

    // ✅ 使用 GameConfig.level.spawnBuffer 替换硬编码 100
    if (minCloudY > cameraTop - GameConfig.level.spawnBuffer) {
        this.spawnCloud(minCloudY - GameConfig.level.cloudGap);
    }

    // --- 2. 回收旧云 ---
    // ✅ 使用 GameConfig.level.cleanupThreshold 替换硬编码 200
    const threshold = this.cameras.main.scrollY + this.scale.height + GameConfig.level.cleanupThreshold;
    
    // 过滤出：存在的、活跃的、且位置在屏幕下方的云
    const cloudsToKill = activeClouds.filter(child => child && child.active && child.y > threshold);

    cloudsToKill.forEach((child) => {
      // ✅ 使用我们刚才在 Cloud.ts 里定义的 disable 方法
      // 这会同时处理 setVisible(false), setActive(false), body.enable = false
      child.disable();
      
      // 注意：killAndHide 只是 helper，如果 disable 里已经写了 setVisible/setActive，这里其实可以不写
      // 但为了双重保险保留也没问题：
      this.clouds.killAndHide(child); 
    });
  }

  private hitCloud(player: any, cloud: any) {
    // 类型转换
    const cloudEntity = cloud as Cloud; 

    if (!cloudEntity.canBoost) return;

    // ✅ 调用 Player 的加速
    this.player.boost(cloudEntity.boostForce);
    
    // ✅ 调用 Cloud 的受击 (包含 setAlpha(0) 动画)
    cloudEntity.hit();
  }
}