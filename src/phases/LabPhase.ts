import { type IGamePhase } from './PhaseSystem';
import GameScene from '../scenes/GameScene';
import { EntityId } from '../config/EntityConfig';
import { WeatherConfig } from '../config/WeatherConfig';
import { SummonId } from '../config/SummonConfig';
import { TextureKeys } from '../config/AssetKeys';

export class LabPhase implements IGamePhase {
  onEnter(scene: GameScene): void {
    console.log("🧪 Entered Lab Phase: Ready for experiments.");
    scene.scoreManager.startTracking();
    // 1. 禁用自动生成
    scene.spawnManager.isSpawningEnabled = false;
    
    // 2. 切换到一个干净的背景 (或者网格图)
    scene.backgroundManager.switchTexture(TextureKeys.BgFrost); 
    
    // 3. 玩家给予初始速度，保证能跑起来看特效
    scene.player.setEnabled(true);
    scene.player.boost(scene.player.playerState.getStartBoostForce());
    
    // 4. 注册调试按键 (仅在 Lab 生效)
    this.registerDebugKeys(scene);
  }

  update(scene: GameScene, dt: number): void {
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
    keyboard.off('keydown-Q');
    keyboard.off('keydown-W');
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
        scene.spawnManager.spawnGroup(EntityId.Coin, scene.player.x, spawnY, 'sine', 8);
    });

    // 测试 2: 生成一串金币 (竖排)
    keyboard.on('keydown-TWO', () => {
        console.log("🧪 Test: Spawn Line Coins");
        const spawnY = scene.player.y - 500;
        scene.spawnManager.spawnGroup(EntityId.Coin, scene.player.x, spawnY, 'line_vertical', 6);
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
    
    // 测试 5: 清场
    keyboard.on('keydown-C', () => {
        console.log("🧪 Test: Clear All");
        scene.summonManager.clearAll();
        scene.weatherManager.stopWeather();
    });
  }
}