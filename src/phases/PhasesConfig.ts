// src/phases/ConcretePhases.ts
import { type IGamePhase } from './PhaseSystem';
import GameScene from '../scenes/GameScene';
import { TransitionBuff, TransitionDashConfig } from '../config/BuffConfig';
import { BiomeId, type IBiomeData } from '../types/BiomeTypes';
import { ModifierType, StatType } from '../mechanics/StatDefinitions';
import { GameConfig } from '../config/GameConfig';


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

    // ✅ 应用生态 Buff (机制)
    if (data.buffs) {
      data.buffs.forEach(buffConfig => {
        scene.player.playerState.buffs.addBuff(buffConfig);
      });
    }

    // 1. ✅ 视觉层：在云层掩护下，瞬间切换背景
    scene.backgroundManager.switchTexture(data.backgroundTexture);

    // 2. ✅ 视觉层：开始淡出云层，露出新世界
    // 稍微延迟一点点再淡出(比如100ms)，防止纹理切换瞬间的闪烁
    scene.time.delayedCall(100, () => {
        scene.backgroundManager.exitCloudTunnel(1500); // 1.5秒慢慢散开，更有史诗感
    });

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
    // ✅ 清理当前生态的召唤物 (比如 L2 的热气流)
    // 这样进入云层冲刺时，屏幕上不会残留红光柱
    scene.summonManager.clearAll();
    // ✅ 防御性编程：如果 data 没被初始化 (比如测试时)，直接跳过
    if (!this.data) return;
    // 移除环境物理
    this.applyEnvStats(scene, false);

    // ✅ 移除生态 Buff
    // 我们需要通过 Tag 或者 ID 来移除。
    // 简单做法：遍历 data.buffs 逐个移除
    if (this.data.buffs) {
      this.data.buffs.forEach(buffConfig => {
        // 这里假设 removeBuff 需要 Config 或者 ID
        // 你可能需要在 BuffManager 加一个 removeBuffById
        scene.player.playerState.buffs.removeBuffById(buffConfig.id);
      });
    }
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
  private targetHeight: number; // 过渡目标高度（米）
  private startPixelY: number = 0;

  constructor(targetHeight: number) {
    this.targetHeight = targetHeight;
  }

  onEnter(scene: GameScene): void {
    console.log("进入：环境过渡冲刺！");
    this.startPixelY = scene.player.y;
    // 1. 视觉：播放速度线特效 / 模糊背景
    // scene.cameras.main.flash(500, 255, 255, 255); // 闪白
    // scene.visualManager.enableSpeedLines(true);

    // ✅ 核心：只加一个 Buff，剩下的全交给 GAS 系统
    scene.player.playerState.buffs.addBuff(TransitionBuff);
    // 2. ✅ 视觉层：开启云层遮罩 (淡入)
    // 建议时间设为 1000ms 左右，让玩家感觉到“冲进了云层”
    scene.backgroundManager.enterCloudTunnel(1000);
  }

  update(scene: GameScene, _dt: number): void {
    // 1. 强制位移 (无视物理引擎，直接修改位置或速度)
    // 使用 physics velocity 保持碰撞检测 (虽然不生成东西，但可能要吃金币)
    scene.player.setVelocityY(GameConfig.level.transitionSpeed);
    
    // 锁定 X 轴，自动回正到屏幕中间
    const centerX = scene.scale.width / 2; // 或 worldWidth / 2
    const diff = centerX - scene.player.x;
    scene.player.setVelocityX(diff * 2); // 简单的 P控制器回正

    // 2. 检查是否冲刺结束
    const traveledMeters = scene.scoreManager.getCurrentHeightMeters()
      - Math.abs(scene.scoreManager.getLogicHeightMeters(this.startPixelY));
    if (traveledMeters >= this.targetHeight) {
      scene.phaseManager.onPhaseComplete();
    }
  }

  onExit(scene: GameScene): void {
    console.log("离开过渡区");
    // 1. 恢复物理
    scene.player.playerState.buffs.removeByTag(TransitionDashConfig.tag);

    // ✅ 双重保险：离开过渡区时也清理一次
    // 防止有什么东西是在过渡区意外生成的 (虽然目前没有)
    scene.summonManager.clearAll();
    
    // 2. 视觉恢复
    // scene.visualManager.enableSpeedLines(false);
  }

  canSpawnEntities(): boolean { return false; } // ❌ 禁止生成云朵
  isInputEnabled(): boolean { return false; }   // ❌ 禁止玩家操作
}