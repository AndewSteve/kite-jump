import { EntityConfig } from "./EntityConfig";
import { BiomeId, MechanicType, type IBiomeData } from "../types/BiomeTypes";

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
  cold_cloud: {
    weight: 10,
    init: EntityConfig.cold_cloud,
  },
  iron_vulture: {
    weight: 20,
    init: EntityConfig.iron_vulture,
  },
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
    stats: { gravityMod: 0 }, // 无修正
    mechanic: MechanicType.None
  },
  [BiomeId.L2_RedCliff]: {
    id: BiomeId.L2_RedCliff,
    name: "赤壁余烬",
    durationMeters: 400,
    backgroundTexture: 'bg_redcliff',
    spawnTable: RedCliffSpawnTable,
    stats: { gravityMod: 0, dragMod: -0.1, coldGrowthRateMod: -0.3 }, // 热流上升快，阻力略减
    mechanic: MechanicType.ThermalUpdraft
  },
  [BiomeId.L3_CloudMarsh]: {
    id: BiomeId.L3_CloudMarsh,
    name: "云梦泽",
    durationMeters: 400,
    backgroundTexture: 'bg_marsh',
    spawnTable: StandardSpawnTable,
    stats: { dragMod: 0.5 }, // 阻力+50% (粘滞)
    mechanic: MechanicType.FogBlindness
  },
  [BiomeId.L4_WindCave]: {
    id: BiomeId.L4_WindCave,
    name: "墨家风洞",
    durationMeters: 400,
    backgroundTexture: 'bg_wind',
    spawnTable: StandardSpawnTable,
    stats: { windForceX: 200 }, // 侧向风
    mechanic: MechanicType.CrossWind
  }
};