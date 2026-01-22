import { type IGamePhase } from './PhaseSystem';
import GameScene from '../scenes/GameScene';
import { EntityId } from '../config/EntityConfig';
import { WeatherConfig } from '../config/WeatherConfig';
import { SummonId } from '../config/SummonConfig';
import { TextureKeys, VFXTextureKeys } from '../config/AssetKeys';
import { PipelineID } from '../managers/RenderManager';
import { GroupSpawnPatterns } from '../managers/SpawnManager';

export class LabPhase implements IGamePhase {
  onEnter(scene: GameScene): void {
    console.log("🧪 Entered Lab Phase: Ready for experiments.");
    scene.scoreManager.startTracking();
    // 1. 禁用自动生成
    scene.spawnManager.isSpawningEnabled = false;
    
    // 2. 切换到一个干净的背景 (或者网格图)
    // scene.backgroundManager.switchTexture(TextureKeys.BgL1Sky); 

    // 1. 设置回落背景为 L2 (烟雾)
    scene.backgroundManager.setFallback(TextureKeys.BgL2);
    
    // 2. 清空可能存在的队列 (防止之前的关卡残留)
    scene.backgroundManager.resetFlow(TextureKeys.BgL2);
    
    // 3. 玩家给予初始速度，保证能跑起来看特效
    scene.player.setEnabled(true);
    scene.player.boost(scene.player.playerState.getStartBoostForce());
    
    // 4. 注册调试按键 (仅在 Lab 生效)
    this.registerDebugKeys(scene);
  }

  update(scene: GameScene, _dt: number): void {
    // 只需要维持跑动，不需要检测 Phase 结束
    // 可以在这里打印实时 log
    scene.player.setVelocityY(-900);
  }

  onExit(scene: GameScene): void {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;

    // 移除我们在 registerDebugKeys 里注册的所有事件
    keyboard.off('keydown-ONE');
    keyboard.off('keydown-TWO');
    keyboard.off('keydown-THREE');
    keyboard.off('keydown-FOUR');
    keyboard.off('keydown-FIVE');
    keyboard.off('keydown-SIX');
    keyboard.off('keydown-SEVEN');
    keyboard.off('keydown-Q');
    keyboard.off('keydown-W');
    keyboard.off('keydown-E');
    keyboard.off('keydown-C');
  }

  isInputEnabled(): boolean { return true; }

  // --- 🧪 实验室控制台 ---
  private registerDebugKeys(scene: GameScene) {
    const keyboard = scene.input.keyboard!;

    // 测试 1: 生成一串金币 (正弦波)
    keyboard.on('keydown-ONE', () => {
        console.log("🧪 Test: Spawn Sine Coins");
        // 在玩家上方 500 像素处生成
        const spawnY = scene.player.y - 500;
        scene.spawnManager.spawnGroup(EntityId.Coin, scene.player.x, spawnY, GroupSpawnPatterns.sine, 8);
    });

    // 测试 2: 生成一串金币 (竖排)
    keyboard.on('keydown-TWO', () => {
        console.log("🧪 Test: Spawn Line Coins");
        const spawnY = scene.player.y - 500;
        scene.spawnManager.spawnGroup(EntityId.Coin, scene.player.x, spawnY, GroupSpawnPatterns.line_vertical, 6);
    });
    // 测试 3: 清空寒冷值
    keyboard.on('keydown-THREE', () => {
        console.log("🧪 Test: Clear Coldness");
        scene.player.playerState.addColdness(-100);
    });
    // 测试 4: 增加冲刺值
    keyboard.on('keydown-FOUR', () => {
        console.log("🧪 Test: Add Dash Energy");
        scene.player.playerState.addDashEnergy(34);
    });

    // 测试 6: 增加冲刺值
    keyboard.on('keydown-SIX', () => {
        console.log("🧪 Test: Spawn Dissolve Effect");
        this.spawnDissolveEffect(scene);
    });

    // 测试 7: 生成一个漩涡
    keyboard.on('keydown-SEVEN', () => {
        console.log("🧪 Test: Summon Frost Vortex");
        scene.summonManager.summon(SummonId.FrostVortex, scene.player.x - 200, scene.player.y - 600);
    });

    // 测试 3: 触发雷暴
    keyboard.on('keydown-Q', () => {
        console.log("🧪 Test: Trigger Thunder");
        // 直接调用 WeatherManager 暴露的 startWeather 方法
        // 假设你把 WeatherConfig 导出了
        scene.weatherManager.startWeather(WeatherConfig.thunder);
    });

    // 测试 4: 召唤大雾
    keyboard.on('keydown-W', () => {
        console.log("🧪 Test: Summon Fog");
        scene.summonManager.summon(SummonId.FogOverlay, 0, 0);
    });
    // 测试 4: 召唤大雾
    keyboard.on('keydown-E', () => {
        console.log("🧪 Test: Summon Thunder");
        scene.summonManager.summon(SummonId.LightningColumn, 0, 0, {
            // 对于 screen space，y 实际上没用(代码里写死 height/2)，x 会由 spawnMode 覆盖或者在这里随机
            // 这里我们可以手动随机一个屏幕 X
            x: Phaser.Math.Between(50, scene.scale.width - 50), 
            y: 0
        });
    });
    
    // 测试 5: 清场
    keyboard.on('keydown-C', () => {
        console.log("🧪 Test: Clear All");
        scene.summonManager.clearAll();
        scene.weatherManager.stopWeather();
    });
  }

  // ✅ 新增：生成溶解特效的方法
    private spawnDissolveEffect(scene: GameScene) {
        const x = scene.player.x + (Math.random() - 0.5) * 200;
        const y = scene.player.y + (Math.random() - 0.5) * 200;

        // 1. 创建 Sprite
        // 我们用 VfxRing 作为要溶解的主体，看起来像一个能量环消失
        const effect = scene.add.sprite(x, y, VFXTextureKeys.VfxRing);
        
        // 2. 设置 Pipeline 和基本属性
        effect.setPipeline(PipelineID.Dissolve);
        effect.setBlendMode(Phaser.BlendModes.ADD); // 发光效果
        effect.setScale(2.0);
        
        // 初始状态：进度为 0 (Tint R=0, G=255, B=255) -> 完全显示
        effect.setTint(0x00ffff); 

        // 3. 使用 Tween 驱动生命周期 (核心！)
        // 我们需要一个对象来存当前的 R 值
        const tweenData = { progressR: 0 };

        scene.tweens.add({
            targets: tweenData,
            progressR: 255, // 目标：R 通道变满 (进度 1.0) -> 完全溶解
            duration: 1500, // 1.5秒内消失
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // 每一帧更新 Sprite 的 Tint 颜色
                // 我们只改变 R 通道，G 和 B 保持 255 (0xff)
                // Phaser.Display.Color.GetColor(R, G, B)
                const r = Math.floor(tweenData.progressR);
                effect.setTint(Phaser.Display.Color.GetColor(r, 255, 255));
                
                // 可选：同时让它稍微变大一点
                effect.scale += 0.01;
            },
            onComplete: () => {
                // 动画结束后销毁 Sprite
                effect.destroy();
                console.log("✨ Dissolve Effect Finished & Destroyed");
            }
        });
    }
}