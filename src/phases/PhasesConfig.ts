// src/phases/ConcretePhases.ts
import { type IGamePhase } from './PhaseSystem';
import GameScene from '../scenes/GameScene';
import { TransitionBuff, TransitionDashConfig, TransitionEndDashBuff } from '../config/BuffConfig';
import { BiomeId, type IBiomeData } from '../types/BiomeTypes';
import { GameConfig } from '../config/GameConfig';
import { EntityId } from '../config/EntityConfig';
import { ModifierType } from '../mechanics/StatDefinitions';
import { TextureKeys } from '../config/AssetKeys';


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
    // 1. 设置刷怪表
    scene.spawnManager.setBaseSpawnTable(data.spawnTable);
    scene.spawnManager.isSpawningEnabled = true;
    if (data.id === BiomeId.L1_Frost) {
      // 1. 先把开头必须播放的塞进队列
      scene.backgroundManager.enqueue(TextureKeys.BgL1Land); // 必须先出地面
      scene.backgroundManager.enqueue(TextureKeys.BgL1Sky);  // 紧接着出过渡天空
      
      // 2. 设置后续无限循环的背景
      scene.backgroundManager.setFallback(TextureKeys.BgL1Sky); // 之后全是烟雾

      // 1. 激活玩家 (解决"无速度"的关键)
      scene.player.setEnabled(true);
  
      // 2. 给予初始冲量
      const boostForce = scene.player.playerState.getStartBoostForce();
      console.log(`Applying Boost: ${boostForce}`);
      scene.player.boost(boostForce);
    } else {
      scene.backgroundManager.setFallback(data.backgroundTexture);
    }
    // 2. 应用环境物理 (GAS)
    this.applyEnvStats(scene, true);

    // ✅ 应用生态 Buff (机制)
    if (data.buffs) {
      data.buffs.forEach(buffConfig => {
        scene.player.playerState.buffs.addBuff(buffConfig);
      });
    }

    // 1. ✅ 视觉层：在云层掩护下，瞬间切换背景
    // scene.backgroundManager.switchTexture(data.backgroundTexture);

    

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
    if (!this.data || !this.data.envModifiers) return; // ✅ 双重保险
    const stats = scene.player.playerState.stats;
    const s = this.data.envModifiers;
    const sourceId = 'biome_env';

    s.forEach(mod => {
      if (isApplying) {
        stats.addModifier(mod.stat, {
          sourceId: sourceId,
          type: mod.type,
          value: mod.value,
        });
      } else {
        stats.removeModifier(mod.stat, sourceId);
      }
    });
  }

  isInputEnabled(): boolean { return true; }   // 允许控制
}

/**
 * ✅ 高速过渡阶段 (环境过度地带)
 * 禁止生成，强制冲刺，切换背景
 */
export class TransitionPhase implements IGamePhase {
  private targetHeight: number; // 过渡目标高度（米）
  private startPixelY: number = 0;
  private readonly filterSourceId: string = 'transition_ban_non_coin';
  private readonly coinBoostSourceId: string = 'transition_coin_boost';

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

    // 3. ✅ 生成控制：开启生成，但应用“白名单过滤”
    scene.spawnManager.isSpawningEnabled = true;
    // 策略：遍历所有已知的 EntityId，把除了 Coin 以外的全部 Ban 掉
    // 这里的 sourceId 用于方便管理，虽然 NormalPhase 会 resetAll，但指定 sourceId 是好习惯

    // 遍历所有 ID，除了 Coin 以外全部“乘零”
    Object.values(EntityId).forEach((id) => {
      if (id !== EntityId.Coin) {
        // ⛔️ 绝对禁止：使用 Multiplier = 0
        // 无论天气系统加多少 PercentAdd，乘以 0 之后都是 0
        scene.spawnManager.addWeightModifier(id, {
          type: ModifierType.Multiplier, // 👈 改用 Multiplier
          value: 0, 
          sourceId: this.filterSourceId
        });
      } else {
        // 💰 金币加成：可以使用 Multiplier 翻倍，也可以用 PercentAdd
        // 这里演示翻倍
        scene.spawnManager.addWeightModifier(id, {
            type: ModifierType.PercentAdd,
            value: -1.0, // 保持原样 (如果想翻倍就写 2.0)
            // value: 2.0, // 比如过渡阶段金币双倍
            sourceId: this.coinBoostSourceId
        });
      }
    });
  }

  update(scene: GameScene, _dt: number): void {
    // 1. 强制位移 (无视物理引擎，直接修改位置或速度)
    // 使用 physics velocity 保持碰撞检测 (虽然不生成东西，但可能要吃金币)
    scene.player.setVelocityY(GameConfig.level.transitionSpeed);
    
    // 为了吃金币可能需要允许横向移动
    // // 锁定 X 轴，自动回正到屏幕中间
    // const centerX = scene.scale.width / 2; // 或 worldWidth / 2
    // const diff = centerX - scene.player.x;
    // scene.player.setVelocityX(diff * 2); // 简单的 P控制器回正

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
    scene.player.playerState.buffs.addBuff(TransitionEndDashBuff);

    // ✅ 双重保险：离开过渡区时也清理一次
    // 防止有什么东西是在过渡区意外生成的 (虽然目前没有)
    scene.summonManager.clearAll();
    
    // 2. 视觉恢复
    // scene.visualManager.enableSpeedLines(false);
    // 3. 生成规则重置
    // 虽然 NormalPhase.onEnter 也会 reset，但双重保险
    scene.spawnManager.removeModifiersBySource(this.filterSourceId);
    scene.spawnManager.removeWeightModifier(EntityId.Coin, this.coinBoostSourceId);
    scene.spawnManager.isSpawningEnabled = false;
  }

  isInputEnabled(): boolean { return true; }  // 允许控制
}