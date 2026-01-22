// src/config/AssetManifest.ts

import { AudioKeys, TextureKeys, UITextureKeys, VFXTextureKeys } from "./AssetKeys";

export interface IAssetDefinition {
  key: string;
  path: string;
  type: 'image' | 'spritesheet' | 'audio'; // ✅ 新增 audio 类型
  frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig; // 用于精灵表
}

const createSpriteSheet = (
  key: string,
  path: string,
  frameWidth: number,
  frameHeight: number,
  _frameMax?: number,
  margin: number = 0,
  spacing: number = 0
): IAssetDefinition => ({
  key,
  path,
  type: 'spritesheet',
  frameConfig: {
    frameWidth,
    frameHeight,
    // frameMax,
    margin,
    spacing
  }
});
const SkinConfigs = [
  { baseKey: TextureKeys.DefaultYellowKite, prefix: 'kite_default_yellow',
    parts: ['body_main',                                          'string', 'knot'] },
  { baseKey: TextureKeys.BlueKite, prefix: 'kite_blue',
    parts: ['body_main',               'left_tail', 'right_tail', 'string', 'knot'] },
  { baseKey: TextureKeys.RedKite,  prefix: 'kite_red',
     parts: ['body_main', 'body_tail', 'left_tail', 'right_tail', 'string', 'knot'] },
  { baseKey: TextureKeys.GreenKite, prefix: 'kite_green',
     parts: ['body_main', 'body_tail', 'left_tail', 'right_tail', 'string', 'knot'] },
];

const SkinAssets: IAssetDefinition[] = SkinConfigs.flatMap(cfg => 
  cfg.parts.map(part => ({
    key: `${cfg.baseKey}_${part}`,         // 例如: kite_blue_body_main
    path: `assets/items/${cfg.prefix}_${part}.png`, // 例如: assets/items/kite_blue_body_main.png
    type: 'image'
  }))
);

export const AssetManifest: IAssetDefinition[] = [
  { key: TextureKeys.PlayerKite, path: 'assets/items/kite.png', type: 'image' },
  ...SkinAssets,
  
  // --- 环境/背景 ---
  { key: TextureKeys.BgMainMenu, path: 'assets/bg/bg_main_menu.png', type: 'image' },
  // { key: TextureKeys.BgFrost, path: 'assets/bg/bg_frost.png', type: 'image' },
  // { key: TextureKeys.BgRedCliff, path: 'assets/bg/bg_redcliff.png', type: 'image' },
  // { key: TextureKeys.BgMarsh, path: 'assets/bg/bg_marsh.png', type: 'image' },
  // { key: TextureKeys.BgWindCave, path: 'assets/bg/bg_wind_cave.png', type: 'image' },

  { key: TextureKeys.BgL1Land, path: 'assets/bg/bg_L1_land.png', type: 'image' },
  { key: TextureKeys.BgL1Sky, path: 'assets/bg/bg_L1_sky.png', type: 'image' },
  { key: TextureKeys.BgL2, path: 'assets/bg/bg_L2_smoke_alternative.png', type: 'image' },
  { key: TextureKeys.BgL3, path: 'assets/bg/bg_L3.png', type: 'image' },
  { key: TextureKeys.BgL4, path: 'assets/bg/bg_L4_aurora.png', type: 'image' },
  
  // --- 云朵/道具 ---
  { key: TextureKeys.Cloud, path: 'assets/items/cloud.png', type: 'image' },
  { key: TextureKeys.Baozi, path: 'assets/items/baozi.png', type: 'image' },
  { key: TextureKeys.Gourd, path: 'assets/items/gourd.png', type: 'image' },
  { key: TextureKeys.WindRune, path: 'assets/items/wind_rune.png', type: 'image' },
  { key: TextureKeys.WindKey, path: 'assets/items/wind_key.png', type: 'image' },
  { key: TextureKeys.SkyLantern, path: 'assets/items/sky_lantern.png', type: 'image' },
  { key: TextureKeys.TacticsShild, path: 'assets/items/tactics_shild.png', type: 'image' },
  { key: TextureKeys.Bamboo, path: 'assets/items/bamboo.png', type: 'image' },
  { key: TextureKeys.Vulture, path: 'assets/items/vulture.png', type: 'image' },
  { key: TextureKeys.IceCrystals, path: 'assets/items/ice_crystals.png', type: 'image' },
  { key: TextureKeys.ChaoticRune, path: 'assets/items/chaotic_rune.png', type: 'image' },
  { key: TextureKeys.WindArrow, path: 'assets/items/arrow_indicator.png', type: 'image' },
  
  // --- 特效/遮罩 ---
  { key: TextureKeys.TransiOverlay, path: 'assets/bg/bg_transi_overlay.png', type: 'image' },
  // { key: TextureKeys.FogOverlay, path: 'assets/bg/fog_overlay.png', type: 'image' },
  { key: TextureKeys.FogOverlay, path: 'assets/bg/bg_transi_overlay.png', type: 'image' },
  { key: TextureKeys.ThermalVent, path: 'assets/items/thermal_vent.png', type: 'image' },

  
  // UI 资产
  // { key: UITextureKeys.UITopFrame, path: 'assets/ui/ui_top_frame.png', type: 'image' },
  { key: UITextureKeys.UIHUDFrame, path: 'assets/ui/ui_hud_frame.png', type: 'image' },
  // { key: UITextureKeys.UIHourglassIcon, path: 'assets/ui/ui_hourglass_icon.png', type: 'image' },
  // { key: UITextureKeys.UIMountainIcon, path: 'assets/ui/ui_mountain_icon.png', type: 'image' },

  { key: UITextureKeys.UIEnergyFrame, path: 'assets/ui/ui_energy_frame_empty.png', type: 'image' },
  { key: UITextureKeys.UIEnergyFrameBack, path: 'assets/ui/ui_energy_frame_back_empty.png', type: 'image' },
  { key: UITextureKeys.UIEnergyFill, path: 'assets/ui/ui_energy_fill.png', type: 'image' },
  { key: UITextureKeys.UIEnergyPointer, path: 'assets/ui/ui_energy_pointer.png', type: 'image' },

  { key: UITextureKeys.UIColdnessFrameEmpty, path: 'assets/ui/ui_coldness_frame_empty.png', type: 'image' },
  { key: UITextureKeys.UIColdnessFrameMid, path: 'assets/ui/ui_coldness_frame_empty_ice_mid.png', type: 'image' },
  { key: UITextureKeys.UIColdnessFrameFull, path: 'assets/ui/ui_coldness_frame_ice_full.png', type: 'image' },
  { key: UITextureKeys.UIColdnessBackWater, path: 'assets/ui/ui_coldness_frame_back_water.png', type: 'image' },
  { key: UITextureKeys.UIColdnessBackIceFull, path: 'assets/ui/ui_coldness_frame_back_ice_full.png', type: 'image' },
  { key: UITextureKeys.UIColdnessBackIceMight, path: 'assets/ui/ui_coldness_frame_back_ice_might.png', type: 'image' },

  { key: UITextureKeys.UILiveUp, path: 'assets/ui/ui_live_up.png', type: 'image' },
  { key: UITextureKeys.UILiveOff, path: 'assets/ui/ui_live_off.png', type: 'image' },
  { key: UITextureKeys.UIPluginWind, path: 'assets/ui/ui_plugin_wind.png', type: 'image' },
  { key: UITextureKeys.UIPluginMagnet, path: 'assets/ui/ui_plugin_magnet.png', type: 'image' },
  { key: UITextureKeys.UIPluginG, path: 'assets/ui/ui_plugin_g.png', type: 'image' },

  // --- 新增 VFX ---
  // 请将截图里的 "FX_TEX_Gra_Water_Wave_01.png" 改名为 noise_bar.png
  { key: VFXTextureKeys.VfxNoiseBar, path: 'assets/vfx/noise_bar.png', type: 'image' },
  // 请将截图里的 "FX_TEX_Circle_Ring_Wave_01.png" 改名为 ring.png
  { key: VFXTextureKeys.VfxRing, path: 'assets/vfx/ring.png', type: 'image' },
  createSpriteSheet(VFXTextureKeys.VfxLightningLine, 'assets/vfx/FX_TEX_Lightning_Line_03a.png', 256, 64, 4),
  { key: VFXTextureKeys.VfxAlertIcon, path: 'assets/vfx/FX_TEX_Alert_01.png', type: 'image' },
  // 3x3 网格，256 / 3 = 85.33，向下取整为 85
  createSpriteSheet(VFXTextureKeys.VfxAlertBg, 'assets/vfx/FX_TEX_Lightning_04.png', 85, 85, 9),



  // ✅ 新增：音频资源
  // BGM
  // { key: AudioKeys.BgmMainMenu, path: 'assets/audio/bgm_main_menu.mp3', type: 'audio' },
  // { key: AudioKeys.BgmGame, path: 'assets/audio/bgm_game.mp3', type: 'audio' },

  // SFX
  { key: AudioKeys.SfxBtnClick, path: 'assets/audio/sfx_btn_click.wav', type: 'audio' },
  // { key: AudioKeys.SfxGameStart, path: 'assets/audio/sfx_game_start.mp3', type: 'audio' },
  { key: AudioKeys.SfxBtnLevelUp, path: 'assets/audio/sfx_btn_level_up.wav', type: 'audio' },

  { key: AudioKeys.SfxJump, path: 'assets/audio/sfx_jump.mp3', type: 'audio' },
  { key: AudioKeys.SfxDash, path: 'assets/audio/sfx_dash.mp3', type: 'audio' },
  { key: AudioKeys.SfxCollectCoin1, path: 'assets/audio/sfx_collect_coin1.wav', type: 'audio' },
  { key: AudioKeys.SfxCollectCoin2, path: 'assets/audio/sfx_collect_coin2.wav', type: 'audio' },
  { key: AudioKeys.SfxCollectCoin3, path: 'assets/audio/sfx_collect_coin3.wav', type: 'audio' },
  { key: AudioKeys.SfxNegativeCollect, path: 'assets/audio/sfx_negative_collect.wav', type: 'audio' },
  { key: AudioKeys.SfxHit, path: 'assets/audio/sfx_hit.mp3', type: 'audio' },
  { key: AudioKeys.SfxHeal, path: 'assets/audio/sfx_heal.wav', type: 'audio' },
  { key: AudioKeys.SfxCrash, path: 'assets/audio/sfx_crash.mp3', type: 'audio' },
  { key: AudioKeys.SfxThunderbolt, path: 'assets/audio/sfx_thunderbolt.mp3', type: 'audio' },

  // { key: AudioKeys.SfxWind, path: 'assets/audio/sfx_wind.mp3', type: 'audio' },
  { key: AudioKeys.SfxBlizzard, path: 'assets/audio/sfx_blizzard.mp3', type: 'audio' },
  { key: AudioKeys.SfxThunderstorm, path: 'assets/audio/sfx_thunderstorm.wav', type: 'audio' },
  { key: AudioKeys.SfxAurora, path: 'assets/audio/sfx_aurora.mp3', type: 'audio' },
]




