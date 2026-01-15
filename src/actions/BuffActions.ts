import type { IBuffAction, IBuffContext } from "./ActionInterfaces";

export class ColdnessIncrementAction implements IBuffAction {
  private coldIncrease: number;

  /**
   * 添加寒冷值, 可以为负数减少寒冷, 此外不会产生其他SFX或特效
   *
   * @param coldIncrease - 增加的寒冷值
   */
  constructor(coldIncrease: number) {
    this.coldIncrease = coldIncrease;
  }
  execute(ctx: IBuffContext): void {
    const player = ctx.player;
    if (player.playerState.isDashing) return;
    player.playerState.addColdness(this.coldIncrease);
  }
}

export class DashEnergyIncrementAction implements IBuffAction {
  private dashIncrease: number;
  /**
   * 添加冲刺能量, 可以为负数减少冲刺能量, 此外不会产生其他SFX或特效
   * @param dashIncrease - 增加的冲刺能量
   */
  constructor(dashIncrease: number) {
    this.dashIncrease = dashIncrease;
  }
  execute(ctx: IBuffContext): void {
    ctx.player.playerState.addDashEnergy(this.dashIncrease);
  }
}