// src/entities/parts/KiteSkinDef.ts

import { TextureKeys } from "./AssetKeys";

export const KiteSkinIDs = {
  DefaultYellow: "kite_default_yellow",
  Red: "kite_red",
  Green: "kite_green",
  Blue: "kite_blue",
} as const;
export type KiteSkinID = typeof KiteSkinIDs[keyof typeof KiteSkinIDs];

export interface ITailDef {
  textureKey: string;  // 尾巴贴图 Key
  offsetX: number;     // 挂载点 X (相对于主体中心)
  offsetY: number;     // 挂载点 Y (相对于主体中心)
  length?: number;     // 尾巴长度 (节数)
  scale?: number;      // 尾巴缩放
}

export interface IKiteSkin {
  id: KiteSkinID;
  
  // 贴图资源
  bodyTexture: string;
  stringTexture: string;
  knotTexture: string;

  // 尺寸调整
  scale: number; 

  // 提线挂载点 (Bridle Anchors) - 相对于主体中心
  // 即使是单张图，我们也需要定义绳子连在图的哪个位置
  bridleLeftOffset: { x: number, y: number };
  bridleRightOffset: { x: number, y: number };
  bridleScale?: number;    // 提线(连线)粗细缩放 (默认 1.0)
  
  // 绳结位置 (相对于中心)
  knotOffset: { x: number, y: number };
  knotScale?: number;      // 绳结缩放 (默认 1.0)

  stringScale?: number;    // 主垂线粗细缩放 (默认 0.5)

  // 尾巴列表 (支持多个)
  tails?: ITailDef[];
}

// --- 预设配置 (示例) ---
export const KiteSkins: Record<KiteSkinID, IKiteSkin> = {
  [KiteSkinIDs.DefaultYellow]: {
    id: KiteSkinIDs.DefaultYellow,
    bodyTexture: `${TextureKeys.DefaultYellowKite}_body_main`, // 假设现在主体叫这个
    stringTexture: `${TextureKeys.DefaultYellowKite}_string`,
    knotTexture: `${TextureKeys.DefaultYellowKite}_knot`, // 假设有这个图，没有就用 string
    scale: 0.5,
    
    // 假设主体图宽 500，高 500，中心在 (0,0)
    // 左线连在左边翅膀骨架处，右线连在右边
    bridleLeftOffset: { x: -150, y: 0 }, 
    bridleRightOffset: { x: 150, y: 0 },
    bridleScale: 5.0,

    stringScale: 0.2,
    
    knotOffset: { x: 0, y: 200 }, // 绳结在身体下方一点点
    knotScale: 0.3,
  },

  // 示例：燕子风筝 (双尾)
  [KiteSkinIDs.Green]: {
    id: KiteSkinIDs.Green,
    bodyTexture: `${TextureKeys.GreenKite}_body_main`,
    stringTexture: `${TextureKeys.GreenKite}_string`,
    knotTexture: `${TextureKeys.GreenKite}_knot`,
    scale: 0.25,
    bridleLeftOffset: { x: -220, y: 100 },
    bridleRightOffset: { x: 220, y: 100 },
    bridleScale: 6.0,
    stringScale: 0.2,
    knotOffset: { x: 0, y: 600 },
    knotScale: 0.4,
    tails: [
      { textureKey: `${TextureKeys.GreenKite}_body_tail`, offsetX: 0, offsetY: 260, length: 10 }, // 左尾
      { textureKey: `${TextureKeys.GreenKite}_left_tail`, offsetX: -450, offsetY: 30, length: 10 }, // 左尾
      { textureKey: `${TextureKeys.GreenKite}_right_tail`, offsetX: 450, offsetY: 30, length: 10 }   // 右尾
    ]
  },


  [KiteSkinIDs.Blue]: {
    id: KiteSkinIDs.Blue,
    bodyTexture: `${TextureKeys.BlueKite}_body_main`,
    stringTexture: `${TextureKeys.BlueKite}_string`,
    knotTexture: `${TextureKeys.BlueKite}_knot`,
    scale: 0.25,
    bridleLeftOffset: { x: -180, y: 100 },
    bridleRightOffset: { x: 180, y: 100 },
    bridleScale: 6.0,
    stringScale: 0.125,
    knotOffset: { x: 0, y: 800 },
    knotScale: 0.8,
    tails: [
      // { textureKey: `${TextureKeys.BlueKite}_body_tail`, offsetX: 0, offsetY: 330, length: 15, scale: 0.7 }, // 左尾
      { textureKey: `${TextureKeys.BlueKite}_left_tail`, offsetX: -200, offsetY: 120, length: 10 }, // 左尾
      { textureKey: `${TextureKeys.BlueKite}_right_tail`, offsetX: 200, offsetY: 120, length: 10 }   // 右尾
    ]
  },
  [KiteSkinIDs.Red]: {
    id: KiteSkinIDs.Red,
    bodyTexture: `${TextureKeys.RedKite}_body_main`,
    stringTexture: `${TextureKeys.RedKite}_string`,
    knotTexture: `${TextureKeys.RedKite}_knot`,
    scale: 0.25,
    bridleLeftOffset: { x: -180, y: 100 },
    bridleRightOffset: { x: 180, y: 100 },
    bridleScale: 6.0,
    stringScale: 0.25,
    knotOffset: { x: 0, y: 800 },
    knotScale: 0.8,
    tails: [
      { textureKey: `${TextureKeys.RedKite}_body_tail`, offsetX: 0, offsetY: 330, length: 15, scale: 0.7 }, // 左尾
      { textureKey: `${TextureKeys.RedKite}_left_tail`, offsetX: -190, offsetY: 140, length: 10 }, // 左尾
      { textureKey: `${TextureKeys.RedKite}_right_tail`, offsetX: 190, offsetY: 140, length: 10 }   // 右尾
    ]
  },
};