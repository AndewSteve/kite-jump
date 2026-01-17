// src/consts/AssetKeys.ts

// 使用 as const 获得字面量类型推断，比 enum 更轻量且安全
export const TextureKeys = {
  // --- 角色 ---
  PlayerKite: 'kite',
  
  // --- 环境/背景 ---
  BgFrost: 'bg_frost',
  BgRedCliff: 'bg_redcliff',
  BgMarsh: 'bg_marsh',
  BgWindCave: 'bg_wind_cave',
  
  // --- 云朵/道具 ---
  Cloud: 'cloud', // 普通云
  CloudRed: 'cloud_red', // 唤风令
  SkyLantern: 'sky_lantern', // 孔明灯
  Vulture: 'vulture', // 铁秃鹫
  FrostVortexCore: 'frost_vortex_core', // 霜之漩涡核心
  FrostVortex: 'frost_vortex', // 霜之漩涡
  
  // --- 特效/遮罩 ---
  // 这里把那个很长的名字统一管理起来，以后换名字只需要改这里
  TransiOverlay: 'transi_overlay',
  FogOverlay: 'fog_overlay', 
  ThermalVent: 'thermal_vent', // 暂时用 pixel，以后换了图直接改这里的值
  WindArrow: 'wind_arrow',
} as const;

// 导出类型，方便函数参数做类型检查
export type TextureKey = typeof TextureKeys[keyof typeof TextureKeys];