import { BoostAction, VanishAction } from "./EntityActions";
import type { IEntityAction, InteractionContext } from "./ActionInterfaces";
import { KiteConfigs } from "../config/KiteConfig";

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