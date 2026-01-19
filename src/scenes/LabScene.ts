import GameScene from './GameScene';
import { LabPhase } from '../phases/LabPhase';
import { SceneKeys } from '../config/GameConfig';
import { EVENTS, gameEvents } from '../config/Events';
// import { UITextureKeys } from '../config/AssetKeys';
import { VFXTextureKeys } from '../config/AssetKeys'; // ✅ 引入 Key
import MagicFieldPipeline from '../pipelines/MagicFieldPipeline';
import { PipelineID } from '../managers/RenderManager';

/**
 * 🧪 实验室场景
 * 继承自 GameScene，拥有所有游戏逻辑，但覆盖了流程控制器
 */
export default class LabScene extends GameScene {
  // ✅ 新增：保存特效精灵的引用，以便在 update 中更新位置
  private alphaTestSprite?: Phaser.GameObjects.Sprite;
  // ✅ 新增：用于测试 Shader 的 Sprite
  private shieldSprite?: Phaser.GameObjects.Sprite;
  // 保存 Pipeline 引用以便 update
  private magicPipeline?: MagicFieldPipeline;

  constructor() {
    super(SceneKeys.Lab); // 注册 Key 为 LabScene
  }

  // 重写 create
  create() {
    // 1. 调用父类 create，初始化 Player, Managers, Physics 等所有东西
    super.create();

    // 2. 覆盖 PhaseManager 的行为
    // 我们不需要 startFirstPhase 里的 NormalPhase -> Transition 逻辑
    // 我们直接强制进入 LabPhase
    this.scene.stop(SceneKeys.UI);
    
    // 注意：这里需要一点技巧。
    // 如果父类 create 结尾调用了 phaseManager.startFirstPhase()，我们需要拦截它。
    // 建议修改 GameScene，把 startFirstPhase 拿出来，或者由子类决定是否调用。
    gameEvents.off(EVENTS.GAME_START, this.onGameStart, this);
    
    // --------------------------------------------------------
    // 🧪 核心操作：注入实验室流程
    // --------------------------------------------------------

    console.log("🧪 Lab Mode Initialized");

    // 4. 手动启动游戏循环 (绕过 onGameStart)
    // 注意：这里我们不调用 super.onGameStart()，因为那会启动 NormalPhase
    this['isGameRunning'] = true; // 访问父类 protected/private 属性
    
    // 5. 强制进入 LabPhase
    // 传入空对象作为 Data，因为 LabPhase 不需要 BiomeData
    this.phaseManager.switchPhase(new LabPhase(), {} as any);

    // 6. 添加实验室专用的简易 UI
    this.createLabUI();
    
    // // ✅ 创建特效
    // this.createAlphaTest();

    // ✅ 1. 注册 Pipeline（仅 WebGL 支持）
    // 检查是否已经存在，防止热重载或切场景报错
    // this.magicPipeline = this.renderManager.getPipeline<MagicFieldPipeline>(PipelineID.MagicField) || undefined;
    // if (this.magicPipeline) {
    //   this.createVFXTest();
    // } else {
    //   console.warn("⚠️ MagicFieldPipeline not found!");
    // }
    
    this.scene.launch(SceneKeys.UI); // 确保 UI 场景启动
  }

  /**
   * ✅ 重写 update 方法，实现特效跟随玩家
   */
  update(time: number, delta: number) {
    super.update(time, delta);

    // // 如果特效存在且玩家存在，让特效位置同步玩家位置
    // if (this.alphaTestSprite && this.player) {
    //   this.alphaTestSprite.setPosition(this.player.x, this.player.y+200);
    // }

    // 跟随玩家
    if (this.shieldSprite && this.player) {
        this.shieldSprite.setPosition(this.player.x, this.player.y);
    }

    // ✅ 更新 Pipeline 全局 Uniforms
    // 就像官方示例 CustomPipelineMultiTextureEs6.ts 里的 update
    if (this.magicPipeline) {
        this.magicPipeline.set1f('uTime', time * 0.001);
    }
  }

  private createLabUI() {
    const tips = [
      '🧪 LAB MODE',
      '[1] Sine Coins (正弦金币)',
      '[2] Line Coins (竖排金币)',
      '[3] Clear Coldness (清空寒冷值)',
      '[4] Add Dash Energy (增加冲刺能量)',
      '[6] Spawn Dissolve Effect (生成溶解特效)',
      '[Q] Thunder (雷暴)',
      '[W] Fog (大雾)',
      '[C] Clear All',
    ];

    this.add.text(20, 20, tips, {
      font: '16px monospace',
      color: '#00ff00',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 10 }
    })
    .setScrollFactor(0) // 固定在屏幕上
    .setDepth(9999);
  }

  createAlphaTest() {
    const frameCount = 59;
    const frameKeys: string[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const frame = String(i).padStart(3, '0');
      frameKeys.push(`video_alpha_${frame}`);
    }

    if (!this.textures.exists(frameKeys[0])) {
      console.warn('Alpha test frames not loaded.');
      return;
    }

    const animKey = 'alpha_webp_test';
    if (!this.anims.exists(animKey)) {
      this.anims.create({
        key: animKey,
        frames: frameKeys.map((key) => ({ key })),
        frameRate: 30,
        repeat: -1
      });
    }

    // ✅ 修改特效属性
    // 不需要 setScrollFactor(0)，因为我们要它在世界坐标中跟随玩家
    this.alphaTestSprite = this.add.sprite(0, 0, frameKeys[0]);
    this.alphaTestSprite.setDepth(9000);
    this.alphaTestSprite.play(animKey);

    // ✅ 缩放 0.2 倍
    this.alphaTestSprite.setScale(0.2);
    this.alphaTestSprite.setAlpha(0.8); // 半透明效果

    // ✅ 倒转 180 度
    this.alphaTestSprite.setAngle(180); 
  }

  private createVFXTest() {
    console.log("🧪 Starting VFX Test: Polar Shield");

    // ----------------------------------------------------
    // 核心：极坐标护盾
    // ----------------------------------------------------
    // 注意：TextureKeys.VfxNoiseBar 对应那张“长条形”的噪点图
    this.shieldSprite = this.add.sprite(this.player.x, this.player.y, VFXTextureKeys.VfxNoiseBar);
    
    // 应用 Pipeline
    this.shieldSprite.setPipeline(PipelineID.MagicField);
    
    // 设置属性
    this.shieldSprite.setScale(1.5); // 大小
    this.shieldSprite.setAlpha(1.0);
    this.shieldSprite.setDepth(9000);

    const randomOffset = Math.floor(Math.random() * 255); // 0 ~ 255 之间的随机整数
    // 参数: (R, G, B)
    // R: 随机数 (shader 里会被还原成 0.0~1.0 并乘以 100 做偏移)
    // G, B: 设为 255 (白色) 即可，反正我们在 Shader 里忽略了它们
    const tintColor = Phaser.Display.Color.GetColor(randomOffset, 255, 255);
    this.shieldSprite.setTint(tintColor);

    // ✅ 混合模式现在可以用了！
    // ADD 模式会让青色发光更强
    this.shieldSprite.setBlendMode(Phaser.BlendModes.ADD);

    // ----------------------------------------------------
    // 辅助：中心发光 (可选)
    // ----------------------------------------------------
    // 可以在中心加一个简单的光点，增强层次感
    // const core = this.add.sprite(this.player.x, this.player.y, TextureKeys.Cloud);
    // core.setScale(0.5).setTint(0x00ffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(9001);
  }
}