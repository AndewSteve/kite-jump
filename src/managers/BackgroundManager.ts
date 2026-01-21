import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { TextureKeys } from '../config/AssetKeys';

interface BackgroundChunk {
  sprite: Phaser.GameObjects.Image;
  initialY: number; // 逻辑世界坐标（用于锚定视差基准）
  textureKey: string;
}

export default class BackgroundManager {
  private scene: Phaser.Scene;
  
  // --- 核心队列 ---
  private chunks: BackgroundChunk[] = []; 
  private spawnQueue: string[] = [];      
  private fallbackTexture: string = TextureKeys.BgL1Land; 

  // --- 视差配置 (复刻原版参数) ---
  private readonly PARALLAX_Y = 0.5; 
  private readonly PARALLAX_X = 0.5;
  private readonly CLOUD_SPEED_MULT = 2.0;
  // ✅ 新增：缝隙修复像素 (让图片产生微小重叠，消除接缝闪烁)
  private readonly OVERLAP_FIX = 4;

  // --- 尺寸与定位 ---
  private scaleRatio: number = 1;
  private chunkDisplayHeight: number = 0;
  private chunkDisplayWidth: number = 0;
  private screenHeight: number = 0;
  private screenWidth: number = 0;
  
  // X轴锚点：为了保证左对齐，背景的中心X必须固定在 背景宽的一半
  private fixedX: number = 0; 

  // --- 独立图层 ---
  private cloudOverlay!: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initMetrics();
    this.initCloudOverlay();
    // this.enqueue(TextureKeys.BgL1Land); // 初始地面
  }

  /**
   * 1. 📐 精确计算缩放与锚点
   */
  private initMetrics() {
    const { width, height } = this.scene.scale;
    this.screenWidth = width;
    this.screenHeight = height;

    // ... (保留之前的 worldWidth 和 minZoom 计算逻辑) ...
    const worldWidth = width * GameConfig.level.worldWidthRatio;
    const minZoom = GameConfig.camera.zoom.sprinting;
    const targetBgWidth = worldWidth / minZoom;

    // ... (保留 ASSET_WIDTH 和 scaleRatio 计算) ...
    const ASSET_WIDTH = 571;
    const ASSET_HEIGHT = 1024;
    this.scaleRatio = targetBgWidth / ASSET_WIDTH;
    this.chunkDisplayWidth = targetBgWidth;
    this.chunkDisplayHeight = ASSET_HEIGHT * this.scaleRatio;

    // ✅ 修改点 1：使用“世界中心对齐”公式计算 fixedX
    // 原理：当摄像机处于世界正中心时，背景图也应该处于屏幕正中心
    // scrollCenter = (worldWidth - screenWidth) / 2
    // fixedX = ScreenCenter + (ScrollCenter * Parallax)
    const scrollCenter = (worldWidth - this.screenWidth) / 2;
    this.fixedX = (this.screenWidth / 2) + (scrollCenter * this.PARALLAX_X);

    console.log(`[BG] Scale: ${this.scaleRatio.toFixed(3)}, FixedX: ${this.fixedX.toFixed(1)}`);
  }

  private initCloudOverlay() {
    const { width, height } = this.scene.scale;
    // 云层遮罩建议直接铺满屏幕即可，或者稍大一点
    // 这里沿用全屏覆盖逻辑
    this.cloudOverlay = this.scene.add.tileSprite(
        width / 2, height / 2, 
        this.chunkDisplayWidth, // 宽度与背景一致
        height / GameConfig.camera.zoom.sprinting, // 高度足够高
        TextureKeys.TransiOverlay
    )
    .setScrollFactor(0)
    .setDepth(-90)
    .setAlpha(0);
  }

  // ==========================================
  // 🎮 外部控制接口
  // ==========================================

  public enqueue(textureKey: string) {
    this.spawnQueue.push(textureKey);
  }

  public setFallback(textureKey: string) {
    this.fallbackTexture = textureKey;
  }

  public resetFlow(newFallback: string) {
    this.spawnQueue = [];
    this.fallbackTexture = newFallback;
    // 此时不销毁现有背景，让它们自然流出
  }

  // ==========================================
  // ⚙️ Update 核心循环
  // ==========================================

  public update(camera: Phaser.Cameras.Scene2D.Camera) {
    const scrollY = camera.scrollY;
    const scrollX = camera.scrollX;

    // 1. 生成/销毁管理
    this.manageChunks(scrollY);

    // 2. 视差定位计算
    this.chunks.forEach(chunk => {
        // --- Y轴视差 (保留之前的修复) ---
        chunk.sprite.y = chunk.initialY - (scrollY * this.PARALLAX_Y);

        // ✅ 修改点 2：应用新的 X 轴对齐公式
        // 公式：ScreenX = Anchor - (ScrollX * Parallax)
        chunk.sprite.x = this.fixedX - (scrollX * this.PARALLAX_X);
    });

    // 3. 云层更新 (TileSprite 逻辑不同，它靠 tilePosition 滚动纹理)
    if (this.cloudOverlay.alpha > 0) {
        this.cloudOverlay.tilePositionY = scrollY * this.CLOUD_SPEED_MULT;
        this.cloudOverlay.tilePositionX = scrollX * this.CLOUD_SPEED_MULT;
    }
  }

  private manageChunks(cameraScrollY: number) {
    // 如果没有任何块，初始化第一块 (生成在屏幕垂直中心)
    if (this.chunks.length === 0) {
        // 初始时的逻辑中心：屏幕高度的一半
        // 当 cameraScrollY = 0 时，我们希望第一张图正好在屏幕中间
        const startY = this.screenHeight / 2;
        this.spawnChunk(startY);
        return;
    }

    // --- A. 顶部生成逻辑 (检查是否需要铺新路) ---
    const topChunk = this.chunks[this.chunks.length - 1];
    
    // 计算 topChunk 当前在屏幕上的 视觉顶部 (Visual Top)
    const visualY = topChunk.initialY - (cameraScrollY * this.PARALLAX_Y);
    const visualTop = visualY - (this.chunkDisplayHeight / 2);

    // 屏幕顶部坐标总是 0 (相对于 Canvas)
    // 只要最上面一张图的顶部 "进入了屏幕区域" (或者离屏幕顶部很近了)，就生成下一张
    // 容错：-100 (允许它稍微露头一点点就生成)
    if (visualTop > -100) { 
        // 下一张图的 初始Y = 当前图初始Y - 高度 (逻辑上往上堆叠)
        const nextInitialY = topChunk.initialY - this.chunkDisplayHeight+ this.OVERLAP_FIX;
        this.spawnChunk(nextInitialY);
    }

    // --- B. 底部销毁逻辑 (检查是否飞出太远) ---
    const bottomChunk = this.chunks[0];
    const bottomVisualY = bottomChunk.initialY - (cameraScrollY * this.PARALLAX_Y);
    // const bottomVisualEdge = bottomVisualY - (this.chunkDisplayHeight / 2); 
    // 注意：这里用上边缘判断或者中心判断都可以，只要足够远

    // 阈值：屏幕下方 3 倍高度
    const destroyThreshold = this.screenHeight * 3;

    // 如果该图的"视觉位置"已经比屏幕底部还要低 3000像素
    if (bottomVisualY > this.screenHeight + destroyThreshold) {
        this.removeChunk(0);
    }
  }

  private spawnChunk(initialY: number) {
    // ... (保留 key 获取逻辑) ...
    let key = this.fallbackTexture;
    if (this.spawnQueue.length > 0) {
        key = this.spawnQueue.shift()!;
    }

    // ✅ 修改点 3：初始化坐标设为屏幕水平中心，解决初始帧可能看不见的问题
    const sprite = this.scene.add.image(this.screenWidth / 2, initialY, key)
        .setOrigin(0.5, 0.5)
        .setScale(this.scaleRatio)
        .setDepth(-100)
        .setScrollFactor(0); 

    // ... (保留 push 逻辑) ...
    this.chunks.push({
        sprite,
        initialY,
        textureKey: key
    });
  }

  private removeChunk(index: number) {
    const chunk = this.chunks[index];
    if (chunk) {
        chunk.sprite.destroy();
        this.chunks.splice(index, 1);
    }
  }

  // --- 辅助特效 ---
  public enterCloudTunnel(duration: number = 1000) {
    this.scene.tweens.add({ targets: this.cloudOverlay, alpha: 1, duration });
  }
  public exitCloudTunnel(duration: number = 1000) {
    this.scene.tweens.add({ targets: this.cloudOverlay, alpha: 0, duration });
  }
}