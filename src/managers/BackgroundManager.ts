import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export default class BackgroundManager {
  private scene: Phaser.Scene;
  private bgSprite!: Phaser.GameObjects.TileSprite;

  // ✅ 新增：云层遮罩 (Transition Overlay)
  private cloudOverlay!: Phaser.GameObjects.TileSprite;
  
  // 缓存视差系数
  private readonly PARALLAX_Y = 0.5;
  private readonly PARALLAX_X = 0.5;
  // ✅ 新增：云层流速比背景快，制造“穿越”感
  private readonly CLOUD_SPEED_MULT = 2.0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initBackground();
  }

  private initBackground() {
    const { width, height } = this.scene.scale;
    const worldWidth = width * GameConfig.level.worldWidthRatio;

    // 1. 计算需要的覆盖尺寸
    // 当相机缩小时(0.85)，视野变大，所以背景图必须比屏幕大
    const minZoom = GameConfig.camera.zoom.sprinting; 
    const bgWidth = worldWidth / minZoom; 
    const bgHeight = height / minZoom;

    // 2. 创建 TileSprite
    // 注意：初始贴图可以是 L1 的，也可以是 Loading 图，之后由 PhaseManager 设置
    this.bgSprite = this.scene.add.tileSprite(
        width / 2,   
        height / 2,  
        bgWidth,     
        bgHeight,    
        'bg' // 默认 key，会在 switchTexture 中被替换
    ).setScrollFactor(0) // 关键：固定在相机上，手动控制 tilePosition
     .setDepth(-100);    // 确保永远在最底层

    this.cloudOverlay = this.scene.add.tileSprite(
        width / 2, height / 2, bgWidth, bgHeight, 'cloud_overlay'
    )
    .setScrollFactor(0)
    .setDepth(-90) // ✅ Depth: -90 (在背景之上，物体之下)
    .setAlpha(0);  // 默认完全透明
  }

  /**
   * 切换背景纹理
   * @param textureKey 新的纹理 Key
   * @param duration 过渡时间 (ms) - 预留接口，目前做瞬切，因为有云层遮挡
   */
  public switchTexture(textureKey: string, _duration: number = 0) {
    if (this.bgSprite.texture.key === textureKey) return;
    
    // 简单瞬切 (因为此时画面通常被 TransitionPhase 的云层/速度线遮挡)
    this.bgSprite.setTexture(textureKey);
    
    // 如果需要淡入淡出，可以在这里做两个 Sprite 的 Alpha Tween
    console.log(`[BackgroundManager] Switched to ${textureKey}`);
  }

  /**
   * ✅ 核心：进入云层隧道 (Fade In)
   * 对应 TransitionPhase 的开始
   */
  public enterCloudTunnel(duration: number = 1000) {
    this.scene.tweens.add({
        targets: this.cloudOverlay,
        alpha: 1,
        duration: duration,
        ease: 'Linear'
    });
  }

  /**
   * ✅ 核心：离开云层隧道 (Fade Out)
   * 对应 NormalPhase 的开始
   */
  public exitCloudTunnel(duration: number = 1000) {
    this.scene.tweens.add({
        targets: this.cloudOverlay,
        alpha: 0,
        duration: duration,
        ease: 'Linear'
    });
  }

  /**
   * 每帧更新视差
   * @param cameraMain 主相机引用
   */
  public update(cameraMain: Phaser.Cameras.Scene2D.Camera) {
    // Y轴视差：背景移动速度是相机的一半
    this.bgSprite.tilePositionY = cameraMain.scrollY * this.PARALLAX_Y;

    // X轴视差：增加一点立体感
    this.bgSprite.tilePositionX = cameraMain.scrollX * this.PARALLAX_X;

    // 2. ✅ 云层遮罩特效
    // 只有当云层可见时才计算，省一点点性能
    if (this.cloudOverlay.alpha > 0) {
        // 云层滚动速度更快，并且始终向下流动(模拟向上飞)，或者跟随相机但更快
        this.cloudOverlay.tilePositionY = cameraMain.scrollY * this.CLOUD_SPEED_MULT;
        this.cloudOverlay.tilePositionX = cameraMain.scrollX * this.CLOUD_SPEED_MULT;
    }
  }
  
  public destroy() {
    this.bgSprite.destroy();
    this.cloudOverlay.destroy();
  }
}