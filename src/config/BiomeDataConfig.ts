import { EntityConfig } from "./EntityConfig";
import { BiomeId, type IBiomeData } from "../types/BiomeTypes";
import { CloudMarshMechanicBuff, RedCliffMechanicBuff } from "./BuffConfig";
import { ModifierType, StatType } from "../mechanics/StatDefinitions";

const StandardSpawnTable = {
  normal_cloud: {
    weight: 70,
    init: EntityConfig.normal_cloud,
  },
  purple_cloud: {
    weight: 20,
    init: EntityConfig.unbroken_fire,
  },
  red_cloud: {
    weight: 1,
    init: EntityConfig.red_cloud,
  },
  coin: {
    weight: 10,
    init: EntityConfig.coin,
  },
  // cold_cloud: {
  //   weight: 10,
  //   init: EntityConfig.cold_cloud,
  // },
  // iron_vulture: {
  //   weight: 20,
  //   init: EntityConfig.iron_vulture,
  // },
};

const RedCliffSpawnTable = {
  // L2 特有刷怪配置
  normal_cloud: { weight: 30, init: EntityConfig.normal_cloud }, 
  // 假设有热气流道具
  // thermal_vent: { weight: 50, init: EntityConfig.thermal_vent },
};


// ✅ 静态数据表：这里是“导演”的剧本库
export const BiomeLibrary: Record<BiomeId, IBiomeData> = {
  [BiomeId.L1_Frost]: {
    id: BiomeId.L1_Frost,
    name: "寒霜荒原",
    durationMeters: 300, // 300米
    backgroundTexture: 'bg_frost',
    spawnTable: StandardSpawnTable,
  },
  [BiomeId.L2_RedCliff]: {
    id: BiomeId.L2_RedCliff,
    name: "赤壁余烬",
    durationMeters: 400,
    // backgroundTexture: 'bg_redcliff',
    backgroundTexture: 'bg_frost',
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
    // backgroundTexture: 'bg_marsh',
    backgroundTexture: 'bg_frost',
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
    // backgroundTexture: 'bg_wind',
    backgroundTexture: 'bg_frost',
    spawnTable: StandardSpawnTable,
  }
};