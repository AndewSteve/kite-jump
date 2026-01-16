import { BaseSummon, SpaceType } from "../summon/BaseSummon";
import { ThermalVent } from "../entities/summons/ThermalVent";
import { FogOverlay } from "../entities/summons/FogOverlay";

// ✅ 1. 定义召唤物 ID 常量 (替代硬编码字符串)
export const SummonId = {
  ThermalVent: 'vent', // 对应 L2 热气流
  FogOverlay: 'fog',   // 对应 L3 大雾
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
  }
};