import { KiteConfigs } from '../config/KiteBuffConfig';
import { EVENTS, gameEvents } from '../config/Events';
import type { IBuffConfig } from '../mechanics/BuffTypes';
import { StatType } from '../mechanics/StatDefinitions';
import type { IEntityAction, InteractionContext } from './ActionInterfaces';
import type { BaseSummon } from '../entities/summons/BaseSummon';
import type { AudioKey } from '../config/AssetKeys';
import AudioManager from '../managers/AudioManager';

/**
 * 行为：减速 + 增加寒冷
 * 逻辑：如果不在冲刺状态，将向上速度强制压制到 threshold (默认 -266)，并增加寒冷
 */
export class SlowDownAction implements IEntityAction {
  private limitSpeed: number; // 速度上限 (注意向上是负数，这里的上限其实是数值更大的负数或正数)

  // 默认限制为 -266 (即 -800/3)，如果玩家当前是 -1000 (很快)，会被拉回 -266 (很慢)
  constructor(limitSpeed: number = -800/3) {
    this.limitSpeed = limitSpeed;
  }

  execute(ctx: InteractionContext): void {
    const player = ctx.player;
    // 1. 冲刺状态无敌，免疫减速
    if (player.playerState.isDashing) return;
    // 3. 强制减速
    // Phaser 坐标系：向上是负数，数值越小越快。
    // 我们希望速度 "不快于" limitSpeed。
    // 比如 limitSpeed = -266。如果 velocity.y = -1000 (极快)，我们要把它变成 -266。
    // 如果 velocity.y = 100 (下落)，则不受影响 (Math.max(100, -266) = 100)。
    const currentVel = player.body!.velocity.y;
    // 使用 Math.max：保留数值较大的那个（即较慢的向上速度，或者下落速度）
    player.setVelocityY(Math.max(currentVel, this.limitSpeed));

    // 可选：播放一个受击/减速的音效或特效
    // ctx.scene.sound.play('slow_down');
  }
}

export class ColdnessIncrementAction implements IEntityAction {
  private coldIncrease: number;

  /**
   * 添加寒冷值, 可以为负数减少寒冷, 此外不会产生其他SFX或特效
   *
   * @param coldIncrease - 增加的寒冷值
   */
  constructor(coldIncrease: number) {
    this.coldIncrease = coldIncrease;
  }
  execute(ctx: InteractionContext): void {
    const player = ctx.player;
    if (player.playerState.isDashing) return;
    player.playerState.addColdness(this.coldIncrease);
  }
}

export class DashEnergyIncrementAction implements IEntityAction {
  private dashIncrease: number;
  /**
   * 添加冲刺能量, 可以为负数减少冲刺能量, 此外不会产生其他SFX或特效
   * @param dashIncrease - 增加的冲刺能量
   */
  constructor(dashIncrease: number) {
    this.dashIncrease = dashIncrease;
  }
  execute(ctx: InteractionContext): void {
    ctx.player.playerState.addDashEnergy(this.dashIncrease);
  }
}

/**
 * 行为：给玩家施加垂直冲量
 */
export class BoostAction implements IEntityAction {
  private force: number;

  constructor(force: number) {
    // ✅ 2. 手动赋值
    this.force = force;
  }

  execute(ctx: InteractionContext): void {
    // 调用 Player 封装好的 boost 方法
    ctx.player.boost(this.force);
  }
}

export class ApplyBuffAction implements IEntityAction {
  private config: IBuffConfig;

  constructor(config: IBuffConfig) {
    this.config = config;
  }

  execute(ctx: InteractionContext): void {
    // ✅ 路径变更为：ctx.player.playerState.buffs
    ctx.player.playerState.buffs.addBuff(this.config);
  }
}

export class ApplyDamageAction implements IEntityAction {
  private damageAmount: number;

  constructor(damageAmount: number) {
    this.damageAmount = damageAmount;
  }

  execute(ctx: InteractionContext): void {
    ctx.player.playerState.applyDamage(this.damageAmount);
  }
}

export class HealAction implements IEntityAction {
  private healAmount: number;
  constructor(healAmount: number) {
    this.healAmount = healAmount;
  }
  execute(ctx: InteractionContext): void {
    ctx.player.playerState.heal(this.healAmount);
  }
}

export class HasBuffTagOrVanishAction implements IEntityAction {
  private tag: string;
  private removeBuff: boolean = false;
  constructor(config:{tag: string, removeBuff: boolean}) {
    this.tag = config.tag;
    this.removeBuff = config.removeBuff;
  }
  execute(ctx: InteractionContext): void {
    if (!ctx.player.playerState.buffs.hasTag(this.tag)) {
      if (this.removeBuff) {
        ctx.player.playerState.buffs.removeByTag(this.tag);
      }
      new VanishAction().execute(ctx);
      ctx.isCancelled = true;
    }
  }
}

/**
 * 行为：播放消失动画并禁用实体
 */
export class VanishAction implements IEntityAction {
  private duration: number;
  private sfxAudioKey: AudioKey | null = null;
  private pushScale: number;

  constructor(duration: number = 150, sfxAudioKey: AudioKey | null = null, pushScale: number = 1.2) {
    this.duration = duration;
    this.sfxAudioKey = sfxAudioKey;
    this.pushScale = pushScale;
  }

  execute(ctx: InteractionContext): void {
    const target = ctx.target;
    
    // 立即关闭物理，防止二次碰撞
    if (target.body) {
        target.body.enable = false;
    }

    // 可选：播放消失音效
    if (this.sfxAudioKey) {
      // ctx.scene.sound.play(this.sfxAudioKey);
      AudioManager.playSfx(this.sfxAudioKey);
    }

    // 播放动画
    ctx.scene.tweens.add({
      targets: target,
      alpha: 0,
      scaleX: this.pushScale,
      scaleY: this.pushScale,
      duration: this.duration,
      onComplete: () => {
        // 动画播完，彻底回收
        target.disable();
      }
    });
  }
}



/**
 * (预留) 行为：加分
 */
export class ScoreAction implements IEntityAction {
  private score: number;
  constructor(score: number) {
    this.score = score;
  }
  execute(_ctx: InteractionContext): void {
     gameEvents.emit(EVENTS.ADD_SCORE, this.score);
  }
}

export class AddCoinAction implements IEntityAction {
  private amount: number;
  constructor(amount: number) { this.amount = amount; }

  execute(ctx: InteractionContext) {
    // ✅ 读取倍率 (蜀国默认是 1.0)
    const mult = ctx.player.playerState.stats.get(StatType.CoinMultiplier);
    
    // 冲刺时翻倍逻辑 (蜀国被动提到冲刺时价值翻倍，这里可以叠加)
    let finalAmount = Math.floor(this.amount * mult);
    if (ctx.player.playerState.isDashing
      && ctx.player.playerState.buffs.hasTag(KiteConfigs.shu.tag)
    ) finalAmount *= 2; 

    gameEvents.emit(EVENTS.ADD_COIN, finalAmount);
  }
}

export class GameOverAction implements IEntityAction {
  private cause: string;
  constructor(cause: string) {
    this.cause = cause;
  }
  execute(_ctx: InteractionContext): void {
    gameEvents.emit(EVENTS.GAME_OVER, this.cause);
  }
}

// 1. 召唤附属物并绑定引用
export class SpawnLinkedSummonAction implements IEntityAction {
  private summonId: string;
  constructor(summonId: string) {
    this.summonId = summonId;
  }
  execute(ctx: InteractionContext): void {
    // 召唤
    const scene = ctx.scene as any; // GameScene
    const summon = scene.summonManager.summon(this.summonId, ctx.target.x, ctx.target.y);
    
    // ✅ 绑定引用：让 Entity 记住它召唤了谁
    if (summon) {
      ctx.target.linkedRef = summon;
    }
  }
}

// 2. 销毁绑定的附属物
export class RemoveLinkedSummonAction implements IEntityAction {
  execute(ctx: InteractionContext): void {
    const summon = ctx.target.linkedRef as BaseSummon;
    if (summon && summon.active) {
      summon.despawn(); // 优雅退场
    }
    ctx.target.linkedRef = null;
  }
}