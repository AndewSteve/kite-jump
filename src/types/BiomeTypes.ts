import type { IBuffConfig } from "../mechanics/BuffTypes";
import type { ISpawnDefinition } from "./GameTypes";

// ✅ 1. 使用 as const 定义 Biome ID
export const BiomeId = {
  L1_Frost: 'L1_Frost',     // 寒霜荒原
  L2_RedCliff: 'L2_RedCliff', // 赤壁余烬
  L3_CloudMarsh: 'L3_CloudMarsh', // 云梦泽
  L4_WindCave: 'L4_WindCave', // 墨家风洞
} as const;

// 导出类型：'L1_Frost' | 'L2_RedCliff' ...
export type BiomeId = typeof BiomeId[keyof typeof BiomeId];

// ✅ 2. 定义特殊机制类型
export const MechanicType = {
  None: 'none',
  ThermalUpdraft: 'thermal_updraft', // 热气流 (L2)
  FogBlindness: 'fog_blindness',     // 大雾 (L3)
  CrossWind: 'cross_wind',           // 侧风 (L4)
} as const;

export type MechanicType = typeof MechanicType[keyof typeof MechanicType];

// ✅ 3. 环境物理参数 (用于 StatSystem)
export interface IEnvironmentStats {
  gravityMod?: number; // 重力修正 (百分比, e.g. 0.1 = +10%)
  dragMod?: number;    // 阻力修正
  windForceX?: number; // 额外的横向推力
  coldGrowthRateMod?: number; // 寒冷增长率修正

}

// ✅ 4. 纯数据结构：生态配置
export interface IBiomeData {
  id: BiomeId;
  name: string;
  durationMeters: number; // 该阶段持续高度 (米)
  
  // 视觉配置
  backgroundTexture: string;
  foregroundEffect?: string;

  // 核心玩法配置
  spawnTable: Record<string, ISpawnDefinition>;
  stats: IEnvironmentStats;
  buffs?: IBuffConfig[]; // 该生态特有的 Buff 列表
  mechanic: MechanicType;
}