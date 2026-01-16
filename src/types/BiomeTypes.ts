import type { IBuffConfig } from "../mechanics/BuffTypes";
import type { ModifierType, StatType } from "../mechanics/StatDefinitions";
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
  buffs?: IBuffConfig[]; // 该生态特有的 Buff 列表
  // ✅ 核心修改：统一使用通用的 Modifiers 数组
  // 这和 IBuffConfig 里的 modifiers 结构完全一致
  envModifiers?: {
    stat: StatType;
    type: ModifierType;
    value: number;
  }[];
}