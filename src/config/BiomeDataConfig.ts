import { EntityConfig, } from "./EntityConfig";
import { BiomeId, type IBiomeData } from "../types/BiomeTypes";
import { CloudMarshMechanicBuff, RedCliffMechanicBuff, WindCaveMechanicBuff } from "./BuffConfig";
import { ModifierType, StatType } from "../mechanics/StatDefinitions";
import { TextureKeys } from "./AssetKeys";
import type { ISpawnDefinition } from "../types/GameTypes";
import { EntityIds, type EntityId } from "./EntityIds";

// ✅ 1. 标准表 (L1): 借风符, 血包, 金币, 乱流 , 孔明灯
const StandardSpawnTable = {
  [EntityIds.WindRune]:    { weight: 75, init: EntityConfig[EntityIds.WindRune] }, // 基础极高，保证新手体验
  [EntityIds.Coin]:        { weight: 8,  init: EntityConfig[EntityIds.Coin] },
  [EntityIds.ChaoticRune]: { weight: 13,  init: EntityConfig[EntityIds.ChaoticRune] },
  [EntityIds.HealBag]:     { weight: 2,  init: EntityConfig[EntityIds.HealBag] }, // 稀有掉落
  [EntityIds.SkyLantern]:      { weight: 2, init: EntityConfig[EntityIds.SkyLantern] },
} satisfies Partial<Record<EntityId, ISpawnDefinition>>

// ✅ 2. L2 表: 标准表基础 + 新增 霹雳火, 唤风令, 八卦盾, 寒流, 机关秃鹫
const RedCliffSpawnTable = {
  [EntityIds.WindRune]:    { weight: 70, init: EntityConfig[EntityIds.WindRune] }, // 基础极高，保证新手体验
  [EntityIds.Coin]:        { weight: 8,  init: EntityConfig[EntityIds.Coin] },
  [EntityIds.ChaoticRune]: { weight: 8,  init: EntityConfig[EntityIds.ChaoticRune] },
  [EntityIds.HealBag]:     { weight: 2,  init: EntityConfig[EntityIds.HealBag] }, // 稀有掉落
  //80

  // --- 新增 L2 特有 ---
  [EntityIds.UnbrokenFire]: { weight: 5, init: EntityConfig[EntityIds.UnbrokenFire] },
  [EntityIds.WindKey]:      { weight: 2, init: EntityConfig[EntityIds.WindKey] }, // 较稀有
  [EntityIds.TacticsShild]: { weight: 5, init: EntityConfig[EntityIds.TacticsShild] },
  [EntityIds.ColdFlue]:     { weight: 4, init: EntityConfig[EntityIds.ColdFlue] }, // 危险
  [EntityIds.IronVulture]:  { weight: 3, init: EntityConfig[EntityIds.IronVulture] }, // 危险

} satisfies Partial<Record<EntityId, ISpawnDefinition>>

// ✅ 3. L3 表: L2基础 + 孔明灯, 漩涡核心
const CloudMarshSpawnTable = {
  [EntityIds.WindRune]:    { weight: 60, init: EntityConfig[EntityIds.WindRune] }, 
  [EntityIds.Coin]:        { weight: 8,  init: EntityConfig[EntityIds.Coin] },
  [EntityIds.ChaoticRune]: { weight: 5,  init: EntityConfig[EntityIds.ChaoticRune] },
  [EntityIds.HealBag]:     { weight: 2,  init: EntityConfig[EntityIds.HealBag] }, // 稀有掉落
  //68
  [EntityIds.UnbrokenFire]: { weight: 5, init: EntityConfig[EntityIds.UnbrokenFire] },
  [EntityIds.WindKey]:      { weight: 2, init: EntityConfig[EntityIds.WindKey] }, // 较稀有
  [EntityIds.TacticsShild]: { weight: 5, init: EntityConfig[EntityIds.TacticsShild] },
  [EntityIds.ColdFlue]:     { weight: 4, init: EntityConfig[EntityIds.ColdFlue] }, // 危险
  [EntityIds.IronVulture]:  { weight: 4, init: EntityConfig[EntityIds.IronVulture] }, // 危险
  //27
  // --- 新增 L3 特有 ---
  [EntityIds.SkyLantern]:      { weight: 3, init: EntityConfig[EntityIds.SkyLantern] },
  [EntityIds.FrostVortexCore]: { weight: 2, init: EntityConfig[EntityIds.FrostVortexCore] }, // 核心较少，因为它是BOSS级机制
} satisfies Partial<Record<EntityId, ISpawnDefinition>>

// ✅ 4. L4 表: 同 L3 (直接复用)
const WindCaveSpawnTable = {
  ...CloudMarshSpawnTable
} satisfies Partial<Record<EntityId, ISpawnDefinition>>

 
// ✅ 静态数据表：这里是“导演”的剧本库
export const BiomeLibrary: Record<BiomeId, IBiomeData> = {
  [BiomeId.L1_Frost]: {
    id: BiomeId.L1_Frost,
    name: "寒霜荒原",
    durationMeters: 300, // 300米
    backgroundTexture: TextureKeys.BgL1Sky,
    spawnTable: StandardSpawnTable,
  },
  [BiomeId.L2_RedCliff]: {
    id: BiomeId.L2_RedCliff,
    name: "赤壁余烬",
    durationMeters: 400,
    backgroundTexture: TextureKeys.BgL2,
    spawnTable: RedCliffSpawnTable,
    buffs: [ RedCliffMechanicBuff ],
    envModifiers: [
      {
        stat: StatType.ColdGrowthRate,
        type: ModifierType.PercentAdd,
        value: -0.2, // 减少 20%
      }
    ],
  },
  [BiomeId.L3_CloudMarsh]: {
    id: BiomeId.L3_CloudMarsh,
    name: "云梦泽",
    durationMeters: 400,
    backgroundTexture: TextureKeys.BgL3,
    spawnTable: CloudMarshSpawnTable,
    envModifiers: [
      {
        stat: StatType.Drag,
        type: ModifierType.PercentAdd,
        value: 0.5, // 阻力+50% (粘滞)
      }
    ],
    // ✅ 2. 机制逻辑：大雾遮罩
    buffs: [ CloudMarshMechanicBuff ]
  },
  [BiomeId.L4_WindCave]: {
    id: BiomeId.L4_WindCave,
    name: "墨家风洞",
    durationMeters: 400,
    backgroundTexture: TextureKeys.BgL4,
    spawnTable: WindCaveSpawnTable,
    // ✅ 挂载机制
    buffs: [ WindCaveMechanicBuff ]
  }
};