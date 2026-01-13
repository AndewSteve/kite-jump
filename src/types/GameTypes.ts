// import Phaser from 'phaser';

import type { IAction } from "../actions/ActionInterfaces";

// ✅ 1. 将 EntityConfig 移到这里
export interface IEntityConfig {
  texture: string;
  color?: number;
  scale?: number;
  actions: IAction[]; // 行为列表
}

// ✅ 2. 定义“生成定义” (用于配置表)
export interface ISpawnDefinition {
  weight: number; // 生成权重
  // 工厂函数：每次生成时调用，返回一个新的配置对象
  // 为什么要用函数？因为 Action 可能包含状态，我们希望每个实体都有自己独立的 Action 实例
  init: () => IEntityConfig; 
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
  cameraLerpX: number;
  cameraLerpY: number;
  cameraOffsetY: number;

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
  // 冲刺系统
  dashDuration: number,    // 冲刺持续时间 (ms)
  dashSpeed: number,      // 冲刺时的向上速度
}

export interface ICameraConfig {
  lerpX: number;
  lerpY: number;
  offsetY: number;
  deadzoneX: number;
  roundPixels: boolean;
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
  spawnTable: Record<string, ISpawnDefinition>;
}