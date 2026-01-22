import { BaseSummon, SpaceType } from "../entities/summons/BaseSummon";
import { ThermalVent } from "../entities/summons/ThermalVent";
import { FogOverlay } from "../entities/summons/FogOverlay";
import { WindVane } from "../entities/summons/WindVane";
import { FrostVortex } from "../entities/summons/FrostVortex";
import { LightningColumn } from "../entities/summons/LightningColumn";
import { Shield } from "../entities/summons/Shield";
import { SubaruTrail } from "../entities/summons/SubaruTrail";

// ✅ 1. 定义召唤物 ID 常量 (替代硬编码字符串)
export const SummonId = {
  ThermalVent: 'vent', // 对应 L2 热气流
  FogOverlay: 'fog',   // 对应 L3 大雾
  WindVane: 'wind_vane', // ✅ 新增 ID
  FrostVortex: 'frost_vortex',
  LightningColumn: 'lightning_column',
  Shield: 'shield',
  SubaruTrail: 'subaru_trail',
} as const;

export type SummonId = typeof SummonId[keyof typeof SummonId];

// ✅ 2. 配置接口
export interface ISummonDef {
  classType: new (scene: Phaser.Scene, x: number, y: number) => BaseSummon;
  space: SpaceType; // 'world' | 'screen'
  poolSize: number; // 预热数量
}

// ✅ 3. 集中注册表
export const SummonConfig: Record<SummonId, ISummonDef> = {
  [SummonId.ThermalVent]: {
    classType: ThermalVent,
    space: SpaceType.Screen,
    poolSize: 5
  },
  [SummonId.FogOverlay]: {
    classType: FogOverlay,
    space: SpaceType.Screen,
    poolSize: 1 // 全局只需要一个雾层
  },
  [SummonId.WindVane]: {
    classType: WindVane,
    space: SpaceType.Screen,
    poolSize: 1
  },
  [SummonId.FrostVortex]: {
    classType: FrostVortex,
    space: SpaceType.World,
    poolSize: 3
  },
  [SummonId.LightningColumn]: {
    classType: LightningColumn,
    space: SpaceType.Screen,
    poolSize: 3 // 稍微多给点，防止回收延迟导致的卡死，虽然逻辑限制了1个
  },
  [SummonId.Shield]: {
    classType: Shield,
    space: SpaceType.World,
    poolSize: 1
  },
  [SummonId.SubaruTrail]: {
    classType: SubaruTrail,
    space: SpaceType.World,
    poolSize: 3
  }
};

