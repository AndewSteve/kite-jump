import { EVENTS, gameEvents } from '../managers/events';
import type { IAction, InteractionContext } from './ActionInterfaces';

/**
 * 行为：减速 + 增加寒冷
 * 逻辑：如果不在冲刺状态，将向上速度强制压制到 threshold (默认 -266)，并增加寒冷
 */
export class SlowDownAction implements IAction {
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

export class ColdnessIncrementAction implements IAction {
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
    ctx.player.playerState.addColdness(this.coldIncrease);
  }
}

export class DashEnergyIncrementAction implements IAction {
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
export class BoostAction implements IAction {
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

/**
 * 行为：播放消失动画并禁用实体
 */
export class VanishAction implements IAction {
  private duration: number;

  constructor(duration: number = 150) {
    this.duration = duration;
  }

  execute(ctx: InteractionContext): void {
    const target = ctx.target;
    
    // 立即关闭物理，防止二次碰撞
    if (target.body) {
        target.body.enable = false;
    }

    // 播放动画
    ctx.scene.tweens.add({
      targets: target,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
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
export class ScoreAction implements IAction {
  private score: number;
  constructor(score: number) {
    this.score = score;
  }
  execute(_ctx: InteractionContext): void {
     gameEvents.emit(EVENTS.ADD_SCORE, this.score);
  }
}

export class GameOverAction implements IAction {
  private cause: string;
  constructor(cause: string) {
    this.cause = cause;
  }
  execute(_ctx: InteractionContext): void {
    gameEvents.emit(EVENTS.GAME_OVER, this.cause);
  }
}