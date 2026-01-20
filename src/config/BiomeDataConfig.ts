import { EntityConfig, EntityId } from "./EntityConfig";
import { BiomeId, type IBiomeData } from "../types/BiomeTypes";
import { CloudMarshMechanicBuff, RedCliffMechanicBuff, WindCaveMechanicBuff } from "./BuffConfig";
import { ModifierType, StatType } from "../mechanics/StatDefinitions";
import { TextureKeys } from "./AssetKeys";
import type { ISpawnDefinition } from "../types/GameTypes";

const StandardSpawnTable = {
  [EntityId.WindRune]: {
    weight: 70,
    init: EntityConfig[EntityId.WindRune],
  },
  [EntityId.UnbrokenFire]: {
    weight: 20,
    init: EntityConfig[EntityId.UnbrokenFire],
  },
  [EntityId.WindKey]: {
    weight: 1,
    init: EntityConfig[EntityId.WindKey],
  },
  [EntityId.Coin]: {
    weight: 10,
    init: EntityConfig[EntityId.Coin],
  },
  // cold_cloud: {
  //   weight: 10,
  //   init: EntityConfig.cold_cloud,
  // },
  // iron_vulture: {
  //   weight: 20,
  //   init: EntityConfig.iron_vulture,
  // },
} satisfies Partial<Record<EntityId, ISpawnDefinition>>

const RedCliffSpawnTable = {
  // L2 特有刷怪配置
  [EntityId.WindRune]: { weight: 30, init: EntityConfig[EntityId.WindRune] }, 
  // 假设有热气流道具
  // thermal_vent: { weight: 50, init: EntityConfig.thermal_vent },
} satisfies Partial<Record<EntityId, ISpawnDefinition>>


// ✅ 静态数据表：这里是“导演”的剧本库
export const BiomeLibrary: Record<BiomeId, IBiomeData> = {
  [BiomeId.L1_Frost]: {
    id: BiomeId.L1_Frost,
    name: "寒霜荒原",
    durationMeters: 300, // 300米
    backgroundTexture: TextureKeys.BgFrost,
    spawnTable: StandardSpawnTable,
  },
  [BiomeId.L2_RedCliff]: {
    id: BiomeId.L2_RedCliff,
    name: "赤壁余烬",
    durationMeters: 400,
    backgroundTexture: TextureKeys.BgRedCliff,
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
    backgroundTexture: TextureKeys.BgMarsh,
    spawnTable: StandardSpawnTable,
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
    backgroundTexture: TextureKeys.BgWindCave,
    spawnTable: StandardSpawnTable,
    // ✅ 挂载机制
    buffs: [ WindCaveMechanicBuff ]
  }
};