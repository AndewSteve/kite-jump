import { GameConfig } from "../config/GameConfig";
import { EVENTS, gameEvents } from "../config/Events";
import { ModifierType, StatType } from "../mechanics/StatDefinitions";
import type GameScene from "../scenes/GameScene";
import type { IBuffAction, IBuffContext } from "./ActionInterfaces";
import type { EntityId } from "../config/EntityConfig";
import type { AudioKey } from "../config/AssetKeys";
import AudioManager from "../managers/AudioManager";

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
    if (ctx.player.playerState.isDashing) return;
    ctx.player.playerState.addColdness(this.coldIncrease);
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

export class ScoreAction implements IBuffAction {
  private score: number;
  constructor(score: number) {
    this.score = score;
  }
  execute(_ctx: IBuffContext): void {
     gameEvents.emit(EVENTS.ADD_SCORE, { amount: this.score, source: 'buff' });
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

export class ChangeWindAction implements IBuffAction {
  execute(ctx: IBuffContext): void {
    const stats = ctx.player.playerState.stats;
    const sourceId = 'biome_l4_wind';

    // 1. 随机生成风力
    // 假设 Drag 是 800，我们需要 >800 才能吹动静止玩家
    // 设定风力在 [1000, 1500] 之间，随机左右
    // 或者有 20% 概率无风
    const isWindy = Phaser.Math.RND.frac() > 0.2;
    let windValue = 0;
    
    if (isWindy) {
       const direction = Phaser.Math.RND.pick([-1, 1]); // 左 或 右
       const strength = Phaser.Math.Between(1000, 1500);
       windValue = direction * strength;
    }

    // 2. 清理旧风力
    stats.removeModifier(StatType.EnvironmentWindX, sourceId);

    // 3. 应用新风力
    if (windValue !== 0) {
      stats.addModifier(StatType.EnvironmentWindX, {
        sourceId: sourceId,
        type: ModifierType.Flat,
        value: windValue
      });
    }

    // 4. 发出事件，通知风向标 UI
    gameEvents.emit(EVENTS.WIND_CHANGE, windValue);
    console.log(`[WindCave] Wind changed to: ${windValue}`);
  }
}

export class ResetWindAction implements IBuffAction {
  execute(ctx: IBuffContext): void {
    const stats = ctx.player.playerState.stats;
    stats.removeModifier(StatType.EnvironmentWindX, 'biome_l4_wind');
    gameEvents.emit(EVENTS.WIND_CHANGE, 0);
  }
}

export class SpawnModifierAction implements IBuffAction {
  private entityId: EntityId;
  private modifier: { type: ModifierType; value: number; sourceId: string; } | undefined;
  private isAdding: boolean;
  constructor(
    config:{entityId: EntityId, 
    modifier: { type: ModifierType; value: number; sourceId: string; },
    isAdding: boolean}
  ) {
    this.entityId = config.entityId;
    this.modifier = config.modifier;
    this.isAdding = config.isAdding;
  }
  execute(ctx: IBuffContext): void {
    const scene = ctx.player.scene as GameScene;
    if (!scene) {
      console.warn("SpawnModifierAction: Scene not found on player.");
      return;
    }
    if (this.isAdding && this.modifier) {
      scene.spawnManager.addWeightModifier(this.entityId, this.modifier);
    } else if (!this.isAdding && this.modifier) {
      scene.spawnManager.removeWeightModifier(this.entityId, this.modifier.sourceId);
    }
  }
}


export class SfxAction implements IBuffAction {
  private sfxAudioKey: AudioKey;
  constructor(sfxAudioKey: AudioKey) {
    this.sfxAudioKey = sfxAudioKey;
  }
  execute(_ctx: IBuffContext): void {
    AudioManager.playSfx(this.sfxAudioKey);
  }
}
