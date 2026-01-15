// src/phases/ConcretePhases.ts
import { type IGamePhase } from './PhaseSystem';
import GameScene from '../scenes/GameScene';
import { TransitionBuff, TransitionDashConfig } from '../config/BuffConfig';
import { BiomeId, type IBiomeData } from '../types/BiomeTypes';
import { ModifierType, StatType } from '../mechanics/StatDefinitions';


/**
 * 空闲阶段：用于游戏尚未开始时的占位
 */
export class IdlePhase implements IGamePhase {
  onEnter(_scene: GameScene, _data?: any): void {
    // Do nothing
  }

  update(_scene: GameScene, _dt: number): void {
    // Do nothing
  }

  onExit(_scene: GameScene): void {
    // Do nothing
  }

  canSpawnEntities(): boolean { return false; }
  isInputEnabled(): boolean { return false; }
}

/**
 * ✅ 正常游玩阶段
 * 允许生成，允许控制，检查高度以触发下一阶段
 */
export class NormalPhase implements IGamePhase {
  private data!: IBiomeData;
  private startPixelY: number = 0;

  // ✅ onEnter 接收数据上下文
  onEnter(scene: GameScene, data: IBiomeData): void {
    this.data = data;
    this.startPixelY = scene.player.y;
    console.log(`Phase Start: ${data.name}`);
    if (data.id === BiomeId.L1_Frost) {
      // 1. 激活玩家 (解决"无速度"的关键)
      scene.player.setEnabled(true);
  
      // 2. 给予初始冲量
      const boostForce = scene.player.playerState.getStartBoostForce();
      console.log(`Applying Boost: ${boostForce}`);
      scene.player.boost(boostForce);
    }

    
    // 1. 设置刷怪表
    scene.spawnManager.setSpawnTable(data.spawnTable);

    // 2. 应用环境物理 (GAS)
    this.applyEnvStats(scene, true);

    // 3. 处理特殊机制 (简单的可以用 switch，复杂的建议用 Strategy 模式)
    // if (data.mechanic === MechanicType.FogBlindness) { ... }
    
    // 4. 设置背景 (假设有 VisualManager)
    // scene.visualManager.setBackground(data.backgroundTexture);
  }

  update(scene: GameScene, _dt: number): void {
    // ✅ 进度检查：Logic Driven
    // 计算当前 Phase 已经跑了多少米
    const traveledMeters = scene.scoreManager.getCurrentHeightMeters()
      - Math.abs(scene.scoreManager.getLogicHeightMeters(this.startPixelY));

    if (traveledMeters >= this.data.durationMeters) {
      scene.phaseManager.onPhaseComplete();
    }
  }

  onExit(scene: GameScene): void {
    // ✅ 防御性编程：如果 data 没被初始化 (比如测试时)，直接跳过
    if (!this.data) return;
    // 移除环境物理
    this.applyEnvStats(scene, false);
  }

  private applyEnvStats(scene: GameScene, isApplying: boolean) {
    if (!this.data || !this.data.stats) return; // ✅ 双重保险
    const stats = scene.player.playerState.stats;
    const s = this.data.stats;
    const method = isApplying ? 'addModifier' : 'removeModifier';
    const sourceId = 'biome_env';

    if (s.gravityMod) {
      if (isApplying) {
        stats.addModifier(StatType.GravityScale, { sourceId, type: ModifierType.PercentAdd, value: s.gravityMod });
      } else {
        stats.removeModifier(StatType.GravityScale, sourceId);
      }
    }
    // ... 同理处理 dragMod, windForce
    if (s.dragMod) {
      if (isApplying) {
        stats.addModifier(StatType.Drag, { sourceId, type: ModifierType.PercentAdd, value: s.dragMod });
      } else {
        stats.removeModifier(StatType.Drag, sourceId);
      }
    }
    if (s.windForceX) {
      if (isApplying) {
        stats.addModifier(StatType.WindForce, { sourceId, type: ModifierType.Flat, value: s.windForceX });
      } else {
        stats.removeModifier(StatType.WindForce, sourceId);
      }
    }
    if (s.coldGrowthRateMod) {
      if (isApplying) {
        stats.addModifier(StatType.ColdGrowthRate, { sourceId, type: ModifierType.PercentAdd, value: s.coldGrowthRateMod });
      } else {
        stats.removeModifier(StatType.ColdGrowthRate, sourceId);
      }
    }
  }

  canSpawnEntities(): boolean { return true; } // 允许生成
  isInputEnabled(): boolean { return true; }   // 允许控制
}

/**
 * ✅ 高速过渡阶段 (环境过度地带)
 * 禁止生成，强制冲刺，切换背景
 */
export class TransitionPhase implements IGamePhase {
  private targetHeight: number;
  private transitionSpeed: number = 2000; // 过渡时的恒定速度

  constructor(targetHeight: number) {
    this.targetHeight = targetHeight;
  }

  onEnter(scene: GameScene): void {
    console.log("进入：环境过渡冲刺！");
    
    // 1. 视觉：播放速度线特效 / 模糊背景
    // scene.cameras.main.flash(500, 255, 255, 255); // 闪白
    // scene.visualManager.enableSpeedLines(true);

    // ✅ 核心：只加一个 Buff，剩下的全交给 GAS 系统
    scene.player.playerState.buffs.addBuff(TransitionBuff);
  }

  update(scene: GameScene, _dt: number): void {
    // 1. 强制位移 (无视物理引擎，直接修改位置或速度)
    // 使用 physics velocity 保持碰撞检测 (虽然不生成东西，但可能要吃金币)
    scene.player.setVelocityY(-this.transitionSpeed);
    
    // 锁定 X 轴，自动回正到屏幕中间
    const centerX = scene.scale.width / 2; // 或 worldWidth / 2
    const diff = centerX - scene.player.x;
    scene.player.setVelocityX(diff * 2); // 简单的 P控制器回正

    // 2. 检查是否冲刺结束
    if (scene.player.y <= this.targetHeight) {
      scene.phaseManager.onPhaseComplete();
    }
  }

  onExit(scene: GameScene): void {
    console.log("离开过渡区");
    // 1. 恢复物理
    scene.player.playerState.buffs.removeByTag(TransitionDashConfig.tag);
    
    // 2. 视觉恢复
    // scene.visualManager.enableSpeedLines(false);
    
    // 3. 可以在这里换背景图 (淡入淡出)
    // scene.backgroundManager.transitionToNext();
  }

  canSpawnEntities(): boolean { return false; } // ❌ 禁止生成云朵
  isInputEnabled(): boolean { return false; }   // ❌ 禁止玩家操作
}