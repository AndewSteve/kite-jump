// src/consts/AssetKeys.ts

// 使用 as const 获得字面量类型推断，比 enum 更轻量且安全
export const TextureKeys = {
  // --- 角色 ---
  PlayerKite: 'kite',
  BlueKite: 'kite_blue',
  RedKite: 'kite_red',
  GreenKite: 'kite_green',
  DefaultYellowKite: 'kite_default_yellow',
  
  // --- 环境/背景 ---
  BgMainMenu: 'bg_main_menu',
  BgFrost: 'bg_frost',
  BgRedCliff: 'bg_redcliff',
  BgMarsh: 'bg_marsh',
  BgWindCave: 'bg_wind_cave',
  
  // --- 云朵/道具 ---
  Cloud: 'cloud', // 普通云
  Baozi: 'baozi', // 包子云
  Gourd: 'gourd', // 葫芦云
  WindRune: 'wind_rune', // 普通云
  WindKey: 'wind_key', // 唤风令
  SkyLantern: 'sky_lantern', // 孔明灯
  TacticsShild: 'tactics', // 八卦盾
  Bamboo: 'bamboo', // 竹子
  ColdFlue: 'cold_flue', // 寒流
  IceCrystals: 'ice_crystals', // 寒流
  ChaoticRune: 'chaotic_rune', // 乱流符
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

export const UITextureKeys = {
  UITopFrame: 'ui_top_frame',
  UIHUDFrame: 'ui_hud_frame',
  UIHourglassIcon: 'ui_hourglass_icon',
  UIMountainIcon: 'ui_mountain_icon',

  UIEnergyFrame: 'ui_energy_frame',
  UIEnergyFrameBack: 'ui_energy_frame_back',
  UIEnergyFill: 'ui_energy_fill',
  UIEnergyPointer: 'ui_energy_pointer',

  UIColdnessFrameEmpty: 'ui_coldness_frame_empty',          // 框-空 (0%)
  UIColdnessFrameMid: 'ui_coldness_frame_empty_ice_mid',    // 框-半冰 (50%)
  UIColdnessFrameFull: 'ui_coldness_frame_ice_full',        // 框-全冰 (100%)
  UIColdnessBackWater: 'ui_coldness_frame_back_water',      // 底-水 (常驻背景)
  UIColdnessBackIceFull: 'ui_coldness_frame_back_ice_full',      // 底-冰 (Shader控制)
  UIColdnessBackIceMight: 'ui_coldness_frame_back_ice_might',      // 底-冰 (Shader控制)

  UILiveUp: 'ui_live_up',
  UILiveOff: 'ui_live_off',
} as const;
export type UITextureKey = typeof UITextureKeys[keyof typeof UITextureKeys];

export const VFXTextureKeys = {
  // --- 新增 VFX 特效纹理 ---
  // 对应截图下方的长条波浪图 (用来做极坐标护盾)
  VfxNoiseBar: 'vfx_noise_bar', 
  // 对应截图上方的圆环图 (用来做冲击波)
  VfxRing: 'vfx_ring',
} as const;
export type VFXTextureKey = typeof VFXTextureKeys[keyof typeof VFXTextureKeys];

// ✅ 新增：音频 Key
export const AudioKeys = {
  // BGM
  BgmMainMenu: 'bgm_main_menu',
  BgmGame: 'bgm_game',
  
  // SFX (UI)
  SfxBtnClick: 'sfx_btn_click',
  SfxBtnLevelUp: 'sfx_btn_level_up',
  SfxGameStart: 'sfx_game_start',
  
  // SFX (Player)
  SfxJump: 'sfx_jump',       // 吃云加速
  SfxDash: 'sfx_dash',       // 冲刺
  // SfxCollect: 'sfx_collect_coin1', // 吃金币
  SfxCollectCoin1: 'sfx_collect_coin1', // 吃金币
  SfxCollectCoin2: 'sfx_collect_coin2', // 吃金币
  SfxCollectCoin3: 'sfx_collect_coin3', // 吃金币
  SfxNegativeCollect: 'sfx_negative_collect', // 吃负面道具
  SfxHit: 'sfx_hit',         // 撞击/受伤
  SfxHeal: 'sfx_heal',         // 治疗
  SfxCrash: 'sfx_crash',     // 撞击地面
  SfxThunderbolt: 'sfx_thunderbolt', // 落雷

  // SFX (环境)
  SfxWind: 'sfx_wind',               // 环境风声
  SfxBlizzard: 'sfx_blizzard',       // 暴雪开始——持续音效
  SfxThunderstorm: 'sfx_thunderstorm', // 雷暴开始——持续音效
  SfxAurora: 'sfx_aurora',           // 极光——持续音效
} as const;

export type AudioKey = typeof AudioKeys[keyof typeof AudioKeys];