// src/consts.ts

import type { IGameConfig } from "../types/GameTypes";


export const GameConfig: IGameConfig = {
  // --- 基础设置 ---
  width: 720,
  height: 1280,
  
  // --- 物理世界设置 ---
  physics: {
    gravity: { x: 0, y: 500 }, // 向下的加速度（模拟轻盈的风筝）
    debug: false,              // 是否显示调试框
  },

  // --- 玩家（风筝）参数 ---
  player: {
    startForce: -1200,      // 游戏开始时的初始向上冲量
    jumpForce: -800,       // 吃到云朵后的向上冲量
    moveSpeed: 400,        // 左右移动的最大速度
    acceleration: 1200,     // 左右移动的加速度（反应灵敏度）
    dragX: 800,            // 水平空气阻力（松手后停下的快慢）
    maxFallSpeed: 800,     // 最大下落速度（防止下落过快看不清）
    maxFlySpeed: 10000,     // 最大上升速度（防止上升过快看不清）
    
    // 摄像机跟随参数
    cameraLerpX: 0,        // X轴跟随平滑度 (0 = 不跟随)
    cameraLerpY: 0.1,      // Y轴跟随平滑度
    cameraOffsetY: 400,    // 摄像机垂直偏移量（让玩家保持在屏幕下方位置）
  },

  // --- 相机设置 (独立配置) ---
  camera: {
    lerpX: 0,        // X轴不跟随
    lerpY: 0.08,     // Y轴跟随平滑度：数值越小越平滑，但也越滞后。0.08 比 0.1 更柔和
    offsetY: 400,    // 垂直偏移
    deadzoneX: 1.5,  // 死区倍率
    roundPixels: false, // 🔴 关键优化：设为 false 可以减少高分屏下的“一卡一卡”的像素抖动感
  },

  // --- 关卡生成 ---
  level: {
    cloudGap: 250,         // 云朵生成的垂直间距
    cloudCount: 10,        // 初始生成的云朵数量
    cleanupThreshold: 1280 * 0.8, // 离开屏幕下方多少像素后销毁物体
    // ✅ 新增：允许坠落的最大深度
    // 例如：1.5 倍屏幕高度。意味着你可以掉下来一整屏多还能救回来，再多就死
    deathDepth: 1280 * 1,
    spawnBuffer: 100,     // ✅ 新增：云朵生成的上边界缓冲 (避免一开始就卡在屏幕顶端)
  },

  // ✅ 新增：云朵类型配置表
  clouds: {
    types: {
      normal: {
        key: 'normal',
        color: 0xffffff, // 原色（白色）
        boost: -800,     // 基础跳跃
        probability: 70, // 生成权重 (70%)
      },
      purple: {
        key: 'purple',
        color: 0xbd00ff, // 紫色
        boost: -1200,    // 强力跳跃
        probability: 20, // 20%
      },
      red: {
        key: 'red',
        color: 0xff0000, // 红色
        boost: -1800,    // 超级火箭
        probability: 10, // 10%
      }
    }
  }
};