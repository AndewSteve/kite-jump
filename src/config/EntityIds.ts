// ✅ 1. 定义实体 ID 常量 (替代硬编码字符串)
export const EntityIds = {
  // --- 基础云朵 ---
  WindRune: 'wind_rune',  // 借风符
  SkyLantern: 'sky_lantern',    // 孔明灯
  UnbrokenFire: 'unbroken_fire',// 霹雳火
  WindKey: 'wind_key',        // 唤风令
  TacticsShild: 'tactics_shild',// 八卦盾
  HealBag: 'heal_bag',        // 急救包
  Coin: 'coin',                 // 金币
  
  // --- 危险云朵 ---
  ColdFlue: 'cold_flue',      // 寒流
  ChaoticRune: 'chaotic_rune',// 乱流
  IronVulture: 'iron_vulture',  // 机关秃鹫
  // FrostVortex: 'frost_vortex', // 漩涡是召唤物，不是实体
  FrostVortexCore: 'frost_vortex_core', // 漩涡核心
} as const;

export type EntityId = typeof EntityIds[keyof typeof EntityIds];
