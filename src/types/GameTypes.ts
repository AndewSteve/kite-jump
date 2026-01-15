// import Phaser from 'phaser';

import type { IEntityAction } from "../actions/ActionInterfaces";

// ✅ 新增：使用可擦除的字符串类型（erasableSyntaxOnly 不允许 enum）
export const EntityType = {
  Buff: 'buff',       // 有利道具 (可被磁场吸附)
  Hazard: 'hazard',   // 有害陷阱/敌人 (不可吸附，撞击扣血)
  Neutral: 'neutral', // 中立物体 (仅作为平台，无特殊反应)
  Coin: 'coin',     // 金币 (可被磁场吸附)
} as const;

export type EntityType = typeof EntityType[keyof typeof EntityType];

// ✅ 1. 将 EntityConfig 移到这里
export interface IEntityConfig {
  texture: string;
  color?: number;
  scale?: number;
  comment?: string;
  type: EntityType; // ✅ 新增：用于区分好坏
  actions: IEntityAction[]; // 行为列表
}

// ✅ 2. 定义“生成定义” (用于配置表)
export interface ISpawnDefinition {
  weight: number; // 生成权重
  // 工厂函数：每次生成时调用，返回一个新的配置对象
  // 为什么要用函数？因为 Action 可能包含状态，我们希望每个实体都有自己独立的 Action 实例
  init: () => IEntityConfig; 
}

// 生态群系配置接口
export interface IBiomeConfig {
  minHeight: number;      // 比如 0, 1000, 5000
  bgTexture?: string;     // 该区域背景图
  spawnTable: Record<string, ISpawnDefinition>; // { 'normal_cloud': 100, 'iron_vulture': 20 }
}

// ✅ 新增：详细的子配置接口
export interface IPlayerConfig {
  jumpForce: number;
  startForce: number;
  moveSpeed: number;
  acceleration: number;
  dragX: number;
  maxFallSpeed: number;
  maxFlySpeed: number;
  baseRadius: number; // 基础吸附范围 (像素)
  magnetForce: number; // 磁力强度 / 吸附速度
  hitRadius: number; // 受击判定半径

  maxHealth: number; // ✅ 新增：最大生命值

  // ✅ 新增：速度影响系数
  // 垂直速度每增加 1，水平加速度增加多少？
  // 例如：下落速度 800 * 1.5 = 额外增加 1200 加速度
  verticalToHorizontalRatio: number; // 新增：垂直移动与水平移动的速度比率
}

export interface IPlayerStateConfig {
  coldBaseRate: number; // 体温降低速率
  coldHeightFactor: number; // 体温降低速率
  thresholds: {
    chilly: number,   // 微寒
    frozen: number,   // 冻僵
    extreme: number,  // 极寒
    icebound: number // 冰封
  },
  penalties: {
    chillyGravity: number,  // +10%
    frozenGravity: number,  // 累计 +30%
    extremeGravity: number, // 累计 +80%
    frozenDrag: number,     // 操控变沉：加速度和最高速减少 50%
  },
}

export interface ICameraConfig {
  lerpX: number;
  lerpY: number;
  deadzoneX: number;
  deadzoneY: number;
  roundPixels: boolean;
  // ✅ 新增：动态相机参数
  offsets: {
    climbing: number, // 向上飞时，相机向上偏，人就在下面
    falling: number,   // 下落时，相机向下偏，人就在上面
  },
  fallingThreshold: number, // 判定下落的时间阈值 (秒)
  zoom: {
    default: number,
    sprinting: number, // 视场变大 (拉远)
  },
}

export interface ILevelConfig {
  pixelsPerMeter: number; // 每米像素数,
  deathDepth: number;      // 死亡深度
  cloudGap: number;        // 云朵间距
  cloudCount: number;      // 初始数量
  cleanupThreshold: number; // 回收阈值 (下边界)
  spawnBuffer: number;     // ✅ 新增：生成缓冲 (上边界，替代硬编码的 100)

  worldWidthRatio: number; // ✅ 新增：世界宽度倍率

  // ✅ 新增：每行最大生成数量 (比如 1-2 个)
  maxSpawnsPerRow: number;
  // ✅ 新增：同层生成的最小间距 (防止两个云叠在一起)
  minSpawnDistance: number;
}

// ✅ 完善：主配置接口
export interface IGameConfig {
  width: number;
  height: number;
  physics: { 
    gravity: { x: number, y: number };
    debug: boolean;
    fixedStep?: boolean;
  };
  player: IPlayerConfig; // 不再是 any
  camera: ICameraConfig; // 不再是 any
  level: ILevelConfig;
  playerState: IPlayerStateConfig;
  // ✅ 实体定义表改为工厂：每次生成都拿到全新 IEntityConfig 实例
  entityTable: Record<string, () => IEntityConfig>;
}