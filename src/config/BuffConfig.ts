import { type IBuffConfig } from "../mechanics/BuffTypes";
import { StatType, ModifierType } from "../mechanics/StatDefinitions";

// --- 公共的操控性修正 (模拟之前的 2.0x 乘数) ---
// 加速度 +100% (x2)，阻力 +100% (x2) -> 极致灵敏，松手即停
const DashControlMods = [
  { stat: StatType.Acceleration, type: ModifierType.PercentAdd, value: 1.0 },
  { stat: StatType.Drag, type: ModifierType.PercentAdd, value: 1.0 },
  // 磁力全开 (比如加 500 范围)
  { stat: StatType.MagnetRange, type: ModifierType.Flat, value: 500 }
];

export const DashConfig = {
  Lv1 :{
    tag: 'State.Dash.Lv1',
    duration: 4,
    speed: -1800,
  },
  Lv2: {
    tag: 'State.Dash.Lv2',
    duration: 5,
    speed: -2200,
  },
  Lv3: {
    tag: 'State.Dash.Lv3',
    duration: 6,
    speed: -2500,
  }
}

// Lv1: 雏鹰起飞
export const DashLv1Buff: IBuffConfig = {
  id: 'dash_lv1',
  name: 'Dash Lv1',
  duration: DashConfig.Lv1.duration, 
  maxStack: 1,
  tags: ['State.Dash', DashConfig.Lv1.tag, 'State.Invincible'], // 状态标签
  modifiers: [...DashControlMods]
};

// Lv2: 凌空飞燕
export const DashLv2Buff: IBuffConfig = {
  id: 'dash_lv2',
  name: 'Dash Lv2',
  duration: DashConfig.Lv2.duration,
  maxStack: 1,
  tags: ['State.Dash', DashConfig.Lv2.tag, 'State.Invincible'],
  modifiers: [...DashControlMods]
};

// Lv3: 风神降临
export const DashLv3Buff: IBuffConfig = {
  id: 'dash_lv3',
  name: 'Dash Lv3',
  duration: DashConfig.Lv3.duration,
  maxStack: 1,
  tags: ['State.Dash', DashConfig.Lv3.tag, 'State.Invincible', 'State.GoldMode'], // 金币模式标签
  modifiers: [...DashControlMods]
};