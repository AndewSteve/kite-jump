// src/mechanics/StatDefinitions.ts

// 1. 属性类型枚举
export const StatType = {
  MoveSpeed: 'move_speed',       // 最大移动速度
  Acceleration: 'acceleration',  // 加速度
  GravityScale: 'gravity_scale', // 重力倍率 (1.0 = 正常)
  Drag: 'drag',                  // 空气阻力
  MagnetRange: 'magnet_range',   // 磁场半径
  ScoreMultiplier: 'score_mult', // 分数倍率
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