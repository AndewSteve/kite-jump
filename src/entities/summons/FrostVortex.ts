// src/entities/summons/FrostVortex.ts
import { BaseSummon, type ISummonInitData } from './BaseSummon';
import { StatType, ModifierType } from '../../mechanics/StatDefinitions';
import { TextureKeys } from '../../config/AssetKeys';
import { EntityTextureScale } from '../../config/EntityConfig';

export class FrostVortex extends BaseSummon {
  private readonly RADIUS = 250; // 吸力半径
  private readonly MAX_FORCE = 800; // 最大吸力
  private summonId: string = '';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TextureKeys.FrostVortex); 
  }

  protected onStart(_data: ISummonInitData): void {
    this.ensureSummonId();
    // 只有视觉和位置，不负责判定死亡
    this.setAlpha(0.8);
    this.setScale(EntityTextureScale);
    // this.play('vortex_anim'); 
  }

  protected onUpdate(_dt: number): void {
    if (!this.target || !this.target.active) return;
    this.ensureSummonId();
    // 1. 计算向量 (玩家 -> 漩涡中心)
    const dx = this.x - this.target.x;
    const dy = this.y - this.target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 2. 清理上一帧的力 (每一帧重新计算)
    this.target.playerState.stats.removeModifier(StatType.EnvironmentWindX, `vortex_${this.summonId}`);
    this.target.playerState.stats.removeModifier(StatType.EnvironmentWindY, `vortex_${this.summonId}`);

    // 3. 施加吸力 (距离越近力越大，或者恒定力)
    if (dist < this.RADIUS && dist > 10) { // >10 防止除零
       // 归一化
       const nx = dx / dist;
       const ny = dy / dist;
       
       // 简单的线性衰减：边缘力小，中心力大
       const strength = Phaser.Math.Linear(this.MAX_FORCE, 0, dist / this.RADIUS);

       // 施加力 (Force X/Y)
       this.target.playerState.stats.addModifier(StatType.EnvironmentWindX, {
         sourceId: `vortex_${this.summonId}`,
         type: ModifierType.Flat,
         value: nx * strength
       });
       
       this.target.playerState.stats.addModifier(StatType.EnvironmentWindY, {
         sourceId: `vortex_${this.summonId}`,
         type: ModifierType.Flat,
         value: ny * strength
       });
    }
  }

  private ensureSummonId() {
    if (!this.summonId || this.summonId === '') {
      this.summonId = Phaser.Utils.String.UUID();
    }
  }

  protected onDespawn(): void {
    // 退场时确保护盾移除
    if (this.target) {
        this.target.playerState.stats.removeModifier(StatType.EnvironmentWindX, `vortex_${this.summonId}`);
        this.target.playerState.stats.removeModifier(StatType.EnvironmentWindY, `vortex_${this.summonId}`);
    }
    this.kill();
  }
}