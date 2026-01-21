import GameScene from './GameScene';
import { LabPhase } from '../phases/LabPhase';
import { SceneKeys } from '../config/GameConfig';
import { EVENTS, gameEvents } from '../config/Events';
// import { UITextureKeys } from '../config/AssetKeys';
import MagicFieldPipeline from '../pipelines/MagicFieldPipeline';
/**
 * 🧪 实验室场景
 * 继承自 GameScene，拥有所有游戏逻辑，但覆盖了流程控制器
 */
export default class LabScene extends GameScene {
  // ✅ 新增：保存特效精灵的引用，以便在 update 中更新位置
  // private alphaTestSprite?: Phaser.GameObjects.Sprite;
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
      '[E] Thunder Summon (召唤雷柱)',
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

}