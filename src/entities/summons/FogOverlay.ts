import { BaseSummon, type ISummonInitData } from '../../summon/BaseSummon';
import { GameConfig } from '../../config/GameConfig';
import Phaser from 'phaser';
import { PipelineID } from '../../managers/RenderManager';

export class FogOverlay extends BaseSummon {
  private isDespawning: boolean = false;
  // ✅ 核心：真正负责显示的 TileSprite
  private fogVisual?: Phaser.GameObjects.TileSprite;

  // 视差系数 (0.3 表示移动速度是相机的 30%)
  private readonly PARALLAX_X = 0.3; 
  // 定义雾气下边缘在屏幕的位置 (Phaser坐标: 0=顶, 1=底)
  // 30% 处意味着留出了 70% 的屏幕给玩家看下面
  private readonly FOG_BOTTOM_RATIO = 0.3;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 父类 Sprite 不需要显示，用一个空或者透明的占位符
    // 确保你 preload 里有一个叫 'pixel' 的 1x1 透明图，或者随便一个图然后 setVisible(false)
    super(scene, x, y, 'pixel'); 
    this.setVisible(false); // 隐藏本体，只做逻辑控制器
  }

  protected onStart(_data: ISummonInitData): void {
    this.isDespawning = false;
    
    // 确保物理关闭
    if (this.body) this.body.enable = false;

    // --- 1. 计算尺寸与位置 ---
    const { width, height } = this.scene.scale;
    // 获取最小缩放 (冲刺时)，计算需要的最大宽度，防止穿帮
    const minZoom = GameConfig.camera.zoom.sprinting;
    const neededWidth = width / minZoom;
    // 高度设置得足够大，以便向上延伸到屏幕外
    const fogHeight = height; // 或者 height * 1.5 更保险

    // --- 2. 创建 TileSprite 视觉对象 ---
    // 假设过渡云层的贴图 Key 是 'cloud_layer'
    this.fogVisual = this.scene.add.tileSprite(
        width / 2,     // X 居中
        height * this.FOG_BOTTOM_RATIO,  // Y 设置在屏幕上方 30% 的位置 (雾的底部边缘)
        neededWidth, 
        fogHeight, 
        '云层'  // ✅ 复用过渡态的云层贴图
    );

    // --- 3. 配置视觉属性 ---
    this.fogVisual
      .setOrigin(0.5, 1)   // ✅ 关键：锚点设在底部中心。这样 Y 坐标控制的是雾的下边缘。
      .setScrollFactor(0)  // 锁定在屏幕空间
      .setDepth(50)        // 层级设置，挡住普通道具
      .setAlpha(0);        // 初始透明

    // ✅ 调整颜色：深灰蓝色，制造沉重的大雾感
    // 可以根据美术需求调整这个十六进制值
    this.fogVisual.setTint(0x667788); 

    // ✅✅✅ 核心修改：应用 Shader Pipeline
    if (this.scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
        this.fogVisual.setPipeline(PipelineID.Fog);
        
        // 获取 Pipeline 实例来设置 Uniform
        const pipeline = this.fogVisual.pipeline as any; 
        
        // // 1. 设置分辨率 (必须，否则 gl_FragCoord 归一化会错)
        // pipeline.set2f('uResolution', this.scene.scale.width, this.scene.scale.height);
        
        // // 2. 计算 WebGL 坐标下的底部位置
        // // Phaser 的 0.3 (上) = WebGL 的 0.7 (下)
        // const glFadeBottom = 1.0 - this.FOG_BOTTOM_RATIO;
        
        // // 3. 设置渐隐参数
        // // uFadeBottom: 从哪里开始完全透明 (0.7)
        // // uFadeRange: 向上过渡多少距离变成完全不透明 (0.15 = 15% 屏幕高度)
        // pipeline.set1f('uFadeBottom', glFadeBottom);
        // pipeline.set1f('uFadeRange', 0.15); // 你可以调整这个值来控制"软度"
        // ✅ Add: Simple fade height ratio
        // 0.3 means the bottom 30% of the image will fade out
        pipeline.set1f('uFadeHeight', 0.3);
    }

    // --- 4. 进场动画 ---
    this.scene.tweens.add({
      targets: this.fogVisual,
      alpha: { from: 0, to: 0.95 }, // 几乎不透明
      duration: 2000, // 缓慢涌入
      ease: 'Sine.easeInOut'
    });
  }

  protected onUpdate(_dt: number): void {
    if (this.isDespawning || !this.fogVisual) return;
    
    // ✅ 核心：实现视差流动
    // 获取主相机的世界 X 坐标
    const scrollX = this.scene.cameras.main.scrollX;
    
    // 让贴图的纹理位置随着相机移动而移动，产生视差
    // 乘一个系数让它动得比前景慢
    this.fogVisual.tilePositionX = scrollX * this.PARALLAX_X;

    // 可选：也可以给 Y 轴一点点缓慢的自动滚动，模拟雾气升腾
    this.fogVisual.tilePositionY -= _dt * 0.02; 
  }

  // 优雅退场
  public despawn() {
    if (this.isDespawning || !this.fogVisual) return;
    this.isDespawning = true;

    // 对视觉对象做淡出动画
    this.scene.tweens.add({
        targets: this.fogVisual,
        alpha: 0,
        duration: 1500, // 缓慢消散
        onComplete: () => {
            // 动画完成，销毁视觉对象
            if (this.fogVisual) {
                this.fogVisual.destroy();
                this.fogVisual = undefined;
            }
            // 调用父类方法回收控制器本体
            super.despawn();
        }
    });
  }
}