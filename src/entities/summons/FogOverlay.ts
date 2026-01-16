import Phaser from 'phaser';
import { BaseSummon, type ISummonInitData } from '../../summon/BaseSummon';
import { GameConfig } from '../../config/GameConfig';
import { PipelineID } from '../../managers/RenderManager'; // 确保引入了常量

export class FogOverlay extends BaseSummon {
  private isDespawning: boolean = false;
  private fogVisual?: Phaser.GameObjects.TileSprite;
  private xOffset: number = 0;
  private readonly MOVE_SPEED_X = 20; // 水平移动速度

  // 视差系数 (0.3 表示移动速度是相机的 30%)
  private readonly PARALLAX_X = 0.3; 
  
  // ✅ 核心配置：雾气覆盖屏幕上方的比例 (0.5 = 屏幕上半部分全是雾)
  private readonly FOG_BOTTOM_RATIO = 0.45; // 稍微多一点，留出软化空间
  private readonly FADE_SOFTNESS = 0.2;     // 渐变长度占屏幕高度的 20%

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 父类占位符，不可见
    super(scene, x, y, 'pixel'); 
    this.setVisible(false);
  }

  protected onStart(_data: ISummonInitData): void {
    this.isDespawning = false;
    if (this.body) this.body.enable = false;

    // --- 1. 计算尺寸 ---
    const { width, height } = this.scene.scale;
    const minZoom = GameConfig.camera.zoom.sprinting;
    
    // 宽度需要覆盖冲刺时的视野
    const neededWidth = width / minZoom;
    // 高度只需足够覆盖上方即可，TileSprite 会自动循环纹理
    const fogHeight = height; 

    // --- 2. 创建 TileSprite (使用合成后的 RGBA 贴图) ---
    this.fogVisual = this.scene.add.tileSprite(
        width / 2,     
        height * this.FOG_BOTTOM_RATIO, 
        neededWidth, 
        fogHeight, 
        'transi_cloud_alpha_full' // ✅ 使用新合成的贴图
    );

    this.fogVisual
      .setOrigin(0.5, 1)   // 锚点在底部中心
      .setScrollFactor(0)  // 锁定屏幕
      .setDepth(50)        // 遮挡层级
      .setAlpha(0);        // 初始透明

    // 设置颜色 (会乘到 Shader 里，保持深灰蓝氛围)
    // this.fogVisual.setTint(0x667788); 

    // --- 3. 应用 Shader ---
    if (this.scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        this.fogVisual.setPipeline(PipelineID.Fog);
        
        const pipeline = this.fogVisual.pipeline as any;
        if (pipeline) {
             // 1. 传入分辨率 (用于计算 gl_FragCoord)
             pipeline.set2f('uResolution', width, height);
             // 2. 传入雾的底边位置 (Phaser 比例)
             pipeline.set1f('uBottomRatio', this.FOG_BOTTOM_RATIO);
             // 3. 传入软度
             pipeline.set1f('uSoftness', this.FADE_SOFTNESS);
        } else {
              console.warn('[FogOverlay] Fog pipeline not found on fogVisual.');
        }
    }
    else {
        console.warn('[FogOverlay] WebGL Renderer not detected. Fog shader will not be applied.');
    }

    // --- 4. 进场动画 ---
    this.scene.tweens.add({
      targets: this.fogVisual,
      alpha: { from: 0, to: 1 }, // RGBA贴图自带透明度，这里可以设为 1
      duration: 2000,
      ease: 'Sine.easeInOut'
    });
  }

  protected onUpdate(_dt: number): void {
    if (this.isDespawning || !this.fogVisual) return;
    
    // 视差流动效果
    const scrollX = this.scene.cameras.main.scrollX;
    this.fogVisual.tilePositionX = scrollX * this.PARALLAX_X;

    this.xOffset += this.MOVE_SPEED_X * (_dt / 1000);
    this.fogVisual.tilePositionX += this.xOffset;
  }

  public despawn() {
    if (this.isDespawning || !this.fogVisual) return;
    this.isDespawning = true;

    this.scene.tweens.add({
        targets: this.fogVisual,
        alpha: 0,
        duration: 1500,
        onComplete: () => {
            if (this.fogVisual) {
                this.fogVisual.destroy();
                this.fogVisual = undefined;
            }
            super.despawn();
        }
    });
  }
}