import { GameConfig } from "../config/GameConfig";
import type GameScene from "../scenes/GameScene";
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

export const SpawnMode = {
  RandomX: 'random_x',
  PlayerPos: 'player_pos',
  RandomScreenX: 'random_screen_x'
} as const;
export type SpawnMode = typeof SpawnMode[keyof typeof SpawnMode];

export class SummonAction implements IBuffAction {
  private prefabKey: string;
  private lifeTime: number;
  private spawnMode: SpawnMode;

  constructor(prefabKey: string, lifeTime: number, spawnMode: SpawnMode = SpawnMode.RandomX) {
    this.prefabKey = prefabKey;
    this.lifeTime = lifeTime;
    this.spawnMode = spawnMode;
  }

  execute(ctx: IBuffContext): void {
    const scene = ctx.player.scene as GameScene;
    // 假设 scene 里有 summonManager (需要在 IAction 接口或 Context 里确保能访问到)
    // 或者强转: (scene as GameScene).summonManager
    const summonMgr = scene.summonManager;

    if (!summonMgr) return;

    let x = 0;
    let y = 0;

    if (this.spawnMode === 'random_x') {
      const worldW = scene.scale.width * GameConfig.level.worldWidthRatio;
      x = Phaser.Math.Between(100, worldW - 100);
      y = scene.cameras.main.scrollY + scene.scale.height / 2; // 屏幕高度中间
    } else if (this.spawnMode === 'random_screen_x') {
      x = Phaser.Math.Between(scene.scale.width * 0.1, scene.scale.width - scene.scale.width * 0.1);
      y = scene.cameras.main.scrollY + scene.scale.height / 2; // 屏幕高度中间
    } else {
      x = ctx.player.x;
      y = ctx.player.y;
    }

    // 调用我们在上一轮做好的 SummonManager
    summonMgr.summon(this.prefabKey, x, y, { lifeTime: this.lifeTime });
    
    console.log(`[Buff Action] Summoned ${this.prefabKey}`);
  }
}