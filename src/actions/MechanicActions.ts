import { BoostAction, VanishAction } from "./EntityActions";
import type { IBuffAction, IBuffContext, IEntityAction, InteractionContext } from "./ActionInterfaces";
import { KiteConfigs } from "../config/KiteBuffConfig";
import type GameScene from "../scenes/GameScene";
import { SummonId } from "../config/SummonConfig";

/**
 * 曹魏转化逻辑：
 * 挂载在怪物身上。被撞时，检查玩家是否有曹魏Tag。
 * 如果有 -> 触发增益并阻止后续伤害。
 * 如果无 -> 什么都不做（让后续的 DamageAction 生效）。
 */
export class WeiConversionAction implements IEntityAction {
  private boostForce: number;

  constructor(boostForce: number) {
    this.boostForce = boostForce;
  }

  execute(ctx: InteractionContext): void {
    const { player, target, scene } = ctx;

    // 1. 检查玩家是否有“曹魏改装”
    if (player.playerState.buffs.hasTag(KiteConfigs.wei.tag)) {
      console.log("【曹魏被动触发】机关转化为借风符！");
      
      // A. 触发增益 (1.5倍借风符效果)
      const boost = new BoostAction(this.boostForce); // e.g. -1350
      boost.execute(ctx);

      // B. 标记为“已转化”，防止后续的 DamageAction/SlowDownAction 执行
      // 这需要 Action 系统支持“中断”。
      // 简单做法：直接在这里把 target 禁用掉
      
      // 播放转化特效
      // scene.add.sprite(target.x, target.y, 'effect_convert').play('convert_anim');

      new VanishAction().execute(ctx);
      ctx.isCancelled = true;
      
      // ✅ 关键：我们可以给 ctx 加一个 flags，或者抛出一个特殊返回值告诉 Entity 停止执行后续 Action
      // 但最简单的做法是：InteractableEntity 在 execute 循环里检查 target.active
      // 如果 active 变成 false 了，就不跑后面的了。
    }
  }
}

export class LightningStrikeAction implements IBuffAction {
  private chance: number;
  constructor(chance: number = 0.3) {
    this.chance = chance;
  } // 默认 30% 概率

  execute(ctx: IBuffContext): void {
    const scene = ctx.player.scene as GameScene;
    
    // 1. 状态锁检查：场上是否已经有雷了？
    const activeCount = scene.summonManager.getActiveCount(SummonId.LightningColumn);
    if (activeCount > 0) {
        // 正在劈，跳过本次判定
        return;
    }

    // 2. 投色子
    if (Math.random() > this.chance) {
        return; // 运气好，没劈
    }

    // 3. 执行召唤 (X轴随机)
    // 召唤系统会自动处理 setSpaceType('screen')
    scene.summonManager.summon(SummonId.LightningColumn, 0, 0, {
        // 对于 screen space，y 实际上没用(代码里写死 height/2)，x 会由 spawnMode 覆盖或者在这里随机
        // 这里我们可以手动随机一个屏幕 X
        x: Phaser.Math.Between(50, scene.scale.width - 50), 
        y: 0
    });
    
    console.log("⚡️ Lightning Strike Triggered!");
  }
}