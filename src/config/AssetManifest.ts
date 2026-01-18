// src/config/AssetManifest.ts

import { TextureKeys, UITextureKeys, VFXTextureKeys } from "./AssetKeys";

export interface IAssetDefinition {
  key: string;
  path: string;
  type: 'image' | 'spritesheet';
  frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig; // 用于精灵表
}

export const AssetManifest: IAssetDefinition[] = [
  // --- 角色 ---
  { key: TextureKeys.PlayerKite, path: 'assets/items/kite.png', type: 'image' },
  { 
    key: `${TextureKeys.BlueKite}_body_main`, 
    path: 'assets/items/kite_blue_body_main.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_body_tail`, 
    path: 'assets/items/kite_blue_body_tail.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_left`, 
    path: 'assets/items/kite_blue_left.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_right`, 
    path: 'assets/items/kite_blue_right.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_string`, 
    path: 'assets/items/kite_blue_string.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_knot`, 
    path: 'assets/items/kite_blue_knot.png', 
    type: 'image' 
  },
  
  // --- 环境/背景 ---
  { key: TextureKeys.BgFrost, path: 'assets/bg/bg_frost.png', type: 'image' },
  { key: TextureKeys.BgRedCliff, path: 'assets/bg/bg_redcliff.png', type: 'image' },
  { key: TextureKeys.BgMarsh, path: 'assets/bg/bg_marsh.png', type: 'image' },
  { key: TextureKeys.BgWindCave, path: 'assets/bg/bg_wind_cave.png', type: 'image' },
  
  // --- 云朵/道具 ---
  { key: TextureKeys.Cloud, path: 'assets/items/cloud.png', type: 'image' },
  { key: TextureKeys.CloudRed, path: 'assets/items/cloud_red.png', type: 'image' },
  { key: TextureKeys.SkyLantern, path: 'assets/items/sky_lantern.png', type: 'image' },
  { key: TextureKeys.Vulture, path: 'assets/items/vulture.png', type: 'image' },
  { key: TextureKeys.WindArrow, path: 'assets/items/arrow_indicator.png', type: 'image' },
  
  // --- 特效/遮罩 ---
  { key: TextureKeys.TransiOverlay, path: 'assets/bg/transi_overlay.png', type: 'image' },
  { key: TextureKeys.FogOverlay, path: 'assets/bg/fog_overlay.png', type: 'image' },
  { key: TextureKeys.ThermalVent, path: 'assets/bg/thermal_vent.png', type: 'image' },

  
  // UI 资产
  { key: UITextureKeys.UITopFrame, path: 'assets/ui/ui_top_frame.png', type: 'image' },
  { key: UITextureKeys.UIHourglassIcon, path: 'assets/ui/ui_hourglass_icon.png', type: 'image' },
  { key: UITextureKeys.UIMountainIcon, path: 'assets/ui/ui_mountain_icon.png', type: 'image' },
  { key: UITextureKeys.UICoinIcon, path: 'assets/ui/ui_coin_icon.png', type: 'image' },

  // --- 新增 VFX ---
  // 请将截图里的 "FX_TEX_Gra_Water_Wave_01.png" 改名为 noise_bar.png
  { key: VFXTextureKeys.VfxNoiseBar, path: 'assets/vfx/noise_bar.png', type: 'image' },
  // 请将截图里的 "FX_TEX_Circle_Ring_Wave_01.png" 改名为 ring.png
  { key: VFXTextureKeys.VfxRing, path: 'assets/vfx/ring.png', type: 'image' },
];