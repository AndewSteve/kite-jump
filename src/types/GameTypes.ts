import Phaser from 'phaser';

// ✅ 新增：详细的子配置接口
export interface PlayerConfig {
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
}

export interface CameraConfig {
  lerpX: number;
  lerpY: number;
  offsetY: number;
  deadzoneX: number;
  roundPixels: boolean;
}

// 单个云朵类型的配置结构
export interface CloudTypeConfig {
  key: string;       // 唯一标识，如 'normal', 'red'
  color: number;     // 16进制颜色，如 0xff0000
  boost: number;     // 加速力度
  probability: number; // 生成概率权重 (0-100)
}

/**
 * 自定义云朵接口
 * 扩展了 Phaser 的 Sprite，增加了游戏逻辑需要的状态标记
 */
export interface ICloud extends Phaser.Physics.Arcade.Sprite {
  // 状态锁：是否可以提供加速
  // true = 新鲜的云，没碰过
  // false = 已经踩过了，不予理会
  canBoost: boolean;

  // ✅ 新增：这朵云特定的弹跳力
  boostForce: number;

  // 未来可以在这里扩展更多状态，例如：
  // isMoving?: boolean;
  // type?: 'normal' | 'poison' | 'golden';
}

export interface LevelConfig {
  deathDepth: number;      // 死亡深度
  cloudGap: number;        // 云朵间距
  cloudCount: number;      // 初始数量
  cleanupThreshold: number; // 回收阈值 (下边界)
  spawnBuffer: number;     // ✅ 新增：生成缓冲 (上边界，替代硬编码的 100)
}

// ✅ 完善：主配置接口
export interface IGameConfig {
  width: number;
  height: number;
  physics: { 
    gravity: { x: number, y: number };
    debug: boolean;
  };
  player: PlayerConfig; // 不再是 any
  camera: CameraConfig; // 不再是 any
  level: LevelConfig;
  clouds: {
    types: Record<string, CloudTypeConfig>;
  };
}