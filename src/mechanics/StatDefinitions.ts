// src/mechanics/StatDefinitions.ts

// 1. 属性类型枚举
export const StatType = {
  // 核心属性
  MaxHealth: 'max_health', // 最大生命值

  MoveSpeed: 'move_speed',       // 最大移动速度
  Acceleration: 'acceleration',  // 加速度
  GravityScale: 'gravity_scale', // 重力倍率 (1.0 = 正常)

  Drag: 'drag',                  // 空气阻力
  MagnetRange: 'magnet_range',   // 磁场半径
  GoldMagnetRange: 'gold_magnet_range', // 金币磁场半径

  // ✅ 新增属性
  ColdGrowthRate: 'cold_growth_rate', // 寒冷增长率 (默认 1.0)
  DashDurationIncrease: 'dash_duration_increase',      // 冲刺持续时间增加 (默认 4.0)
  CoinMultiplier: 'coin_multiplier',  // 金币价值倍率 (默认 1.0)
  SpawnRateWind: 'spawn_rate_wind',   // 唤风符生成倍率 (默认 1.0)

  WindForce: 'wind_force',         // 风力强度 (默认 0.0)
} as const;

export type StatType = typeof StatType[keyof typeof StatType];

// 2. 修改器类型
export const ModifierType = {
  Flat: 0,      // 加法 (Base + 10)
  PercentAdd: 1 // 百分比加成 (Base * (1 + 0.1))
} as const;

export type ModifierType = typeof ModifierType[keyof typeof ModifierType];

// 3. 修改器接口
export interface IModifier {
  sourceId: string; // 来源 (例如 'buff_lantern_1', 'environment_wind')
  type: ModifierType;
  value: number;
}