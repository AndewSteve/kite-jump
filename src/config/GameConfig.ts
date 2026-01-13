// src/consts.ts

import type { IGameConfig } from "../types/GameTypes";
import { EntityConfig } from "./EntityConfig";
import { PlayerConfig, PlayerStateConfig } from "./PlayerConfig";


export const GameConfig: IGameConfig = {
  // --- 基础设置 ---
  width: 720,
  height: 1280,
  
  // --- 物理世界设置 ---
  physics: {
    gravity: { x: 0, y: 500 }, // 向下的加速度（模拟轻盈的风筝）
    debug: false,              // 是否显示调试框
    fixedStep: false,
  },

  // --- 相机设置 (独立配置) ---
  camera: {
    lerpX: 0.1,        // X轴不跟随
    lerpY: 0.08,     // Y轴跟随平滑度：数值越小越平滑，但也越滞后。0.08 比 0.1 更柔和
    offsetY: 400,    // 垂直偏移
    deadzoneX: 0.2,  // 死区倍率
    roundPixels: true, 
    // roundPixels: false, // 🔴 关键优化：设为 false 可以减少高分屏下的“一卡一卡”的像素抖动感
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

    // ✅ 新增：世界宽度倍率
    worldWidthRatio: 1.5,
    // ✅ 新增：像素与米的换算比例
    // 假设 10 像素 = 1 米 (根据你之前的 UI 逻辑 Score = (startY - y) / 10)
    pixelsPerMeter: 10,

    // ✅ 新增配置
    maxSpawnsPerRow: 2,   // 每一层最多生成 2 个物体
    minSpawnDistance: 150 // 两个物体至少间隔 150 像素
  },

  // --- 玩家（风筝）参数 ---
  player: PlayerConfig,

  // ✅ 新增：玩家状态配置
  playerState: PlayerStateConfig,

  // ✅ 核心：生成表 (Spawn Table)
  // 所有的实体定义都在这里，GameScene 对此一无所知
  spawnTable: EntityConfig,
};