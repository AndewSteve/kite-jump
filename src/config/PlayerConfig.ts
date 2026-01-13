import type { IPlayerConfig, IPlayerStateConfig } from "../types/GameTypes";

export const PlayerConfig: IPlayerConfig = {
  startForce: -1200,      // 游戏开始时的初始向上冲量
  jumpForce: -800,       // 吃到云朵后的向上冲量
  moveSpeed: 400,        // 左右移动的最大速度
  acceleration: 1200,     // 左右移动的加速度（反应灵敏度）
  dragX: 800,            // 水平空气阻力（松手后停下的快慢）
  maxFallSpeed: 800,     // 最大下落速度（防止下落过快看不清）
  maxFlySpeed: 10000,     // 最大上升速度（防止上升过快看不清）

  // ✅ 新增：速度影响系数
  // 垂直速度每增加 1，水平加速度增加多少？
  // 例如：下落速度 800 * 1.5 = 额外增加 1200 加速度
  verticalToHorizontalRatio: 2.0,
  
  // 摄像机跟随参数
  cameraLerpX: 0,        // X轴跟随平滑度 (0 = 不跟随)
  cameraLerpY: 0.1,      // Y轴跟随平滑度
  cameraOffsetY: 400,    // 摄像机垂直偏移量（让玩家保持在屏幕下方位置）
}

export const PlayerStateConfig: IPlayerStateConfig = {
  // ✅ 新增：根据策划案配置
  coldBaseRate: 1.5,      // 基础增长 (每秒)
  coldHeightFactor: 0.5,  // 高度系数 (每 1000m 增加多少)
  thresholds: {
    chilly: 25,   // 微寒
    frozen: 55,   // 冻僵
    extreme: 80,  // 极寒
    icebound: 100 // 冰封
  },
  penalties: {
    chillyGravity: 0.1,  // +10%
    frozenGravity: 0.2,  // 累计 +30%
    extremeGravity: 0.5, // 累计 +80%
    frozenDrag: 0.5,     // 操控变沉：加速度和最高速减少 50%
  },
  // 冲刺系统
  dashDuration: 3000,    // 冲刺持续时间 (ms)
  dashSpeed: -1500,      // 冲刺时的向上速度
}