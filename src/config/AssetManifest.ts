// src/config/AssetManifest.ts

import { TextureKeys, UITextureKeys } from "./AssetKeys";

export interface IAssetDefinition {
  key: string;
  path: string;
  type: 'image' | 'spritesheet';
  frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig; // 用于精灵表
}

export const AssetManifest: IAssetDefinition[] = [
  // --- 角色 ---
  { key: TextureKeys.PlayerKite, path: 'assets/kite.png', type: 'image' },
  { 
    key: `${TextureKeys.BlueKite}_body_main`, 
    path: 'assets/kite_blue_body_main.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_body_tail`, 
    path: 'assets/kite_blue_body_tail.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_left`, 
    path: 'assets/kite_blue_left.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_right`, 
    path: 'assets/kite_blue_right.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_string`, 
    path: 'assets/kite_blue_string.png', 
    type: 'image' 
  },
  { 
    key: `${TextureKeys.BlueKite}_knot`, 
    path: 'assets/kite_blue_knot.png', 
    type: 'image' 
  },
  
  // --- 环境/背景 ---
  { key: TextureKeys.BgFrost, path: 'assets/bg_frost.png', type: 'image' },
  { key: TextureKeys.BgRedCliff, path: 'assets/bg_redcliff.png', type: 'image' },
  { key: TextureKeys.BgMarsh, path: 'assets/bg_marsh.png', type: 'image' },
  { key: TextureKeys.BgWindCave, path: 'assets/bg_wind_cave.png', type: 'image' },
  
  // --- 云朵/道具 ---
  { key: TextureKeys.Cloud, path: 'assets/cloud.png', type: 'image' },
  { key: TextureKeys.CloudRed, path: 'assets/cloud_red.png', type: 'image' },
  { key: TextureKeys.SkyLantern, path: 'assets/sky_lantern.png', type: 'image' },
  { key: TextureKeys.Vulture, path: 'assets/vulture.png', type: 'image' },
  
  // --- 特效/遮罩 ---
  { key: TextureKeys.TransiOverlay, path: 'assets/transi_overlay.png', type: 'image' },

  { key: TextureKeys.FogOverlay, path: 'assets/fog_overlay.png', type: 'image' },
  { key: TextureKeys.ThermalVent, path: 'assets/pixel.png', type: 'image' },
  { key: TextureKeys.WindArrow, path: 'assets/arrow_indicator.png', type: 'image' },
  
  // UI 资产
  { key: UITextureKeys.UITopFrame, path: 'assets/ui_top_frame.png', type: 'image' },
  { key: UITextureKeys.UIHourglassIcon, path: 'assets/ui_hourglass_icon.png', type: 'image' },
  { key: UITextureKeys.UIMountainIcon, path: 'assets/ui_mountain_icon.png', type: 'image' },
  { key: UITextureKeys.UICoinIcon, path: 'assets/ui_coin_icon.png', type: 'image' },
];