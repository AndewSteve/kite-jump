import type { IPlayerConfig, IPlayerStateConfig } from "../types/GameTypes";

export const PlayerConfig: IPlayerConfig = {
  startY: 1200,         // 玩家初始高度


  startForce: -900,      // 游戏开始时的初始向上冲量
  jumpForce: -800,       // 吃到云朵后的向上冲量
  moveSpeed: 400,        // 左右移动的最大速度
  acceleration: 1200,     // 左右移动的加速度（反应灵敏度）
  dragX: 800,            // 水平空气阻力（松手后停下的快慢）
  maxFallSpeed: 800,     // 最大下落速度（防止下落过快看不清）
  maxFlySpeed: 8000,     // 最大上升速度（防止上升过快看不清）
  baseRadius: 50, // 基础吸附范围 (像素)
  magnetForce: 600, // 磁力强度 / 吸附速度
  hitRadius: 15, // 受击判定半径

  maxHealth: 3, // ✅ 新增：最大生命值

  // ✅ 新增：速度影响系数
  // 垂直速度每增加 1，水平加速度增加多少？
  // 例如：下落速度 800 * 1.5 = 额外增加 1200 加速度
  verticalToHorizontalRatio: 2.0,
}

export const PlayerStateConfig: IPlayerStateConfig = {
  velocityScalingRef: 2000,
  // ✅ 新增：根据策划案配置
  coldBaseRate: 1.5,      // 基础增长 (每秒)
  coldHeightFactor: 0.5,  // 高度系数 (每 1000m 增加多少)
  thresholds: {
    chilly: 20,   // 微寒
    frozen: 50,   // 冻僵
    extreme: 80,  // 极寒
    icebound: 100 // 冰封
  },
  penalties: {
    chillyGravity: 0.1,  // +10%
    frozenGravity: 0.15,  // 累计 +30%
    extremeGravity: 0.15, // 累计 +80%
    frozenDrag: 0.5,     // 操控变沉：加速度和最高速减少 50%
  },
}