import { DashEnergyIncrementAction } from "../actions/BuffActions";
import { type IBuffConfig } from "../mechanics/BuffTypes";
import { StatType, ModifierType } from "../mechanics/StatDefinitions";

export const KiteConfigs = {
  shu: {
    tag: 'Passive.ShuCoin',
    description: 'Shu Han: Lower gravity, faster speed, longer dash, double coins while dashing.'
  },
  wei: {
    tag: 'Passive.WeiMechanic',
    description: 'Cao Wei: Higher gravity, enemies become buffs on collision.'
  },
  wu: {
    tag: 'Passive.WuSpawn',
    description: 'Eastern Wu: Cold resistance, more wind talismans, start with dash.',
    coldnessMultiplier: 0.9, // 东吴寒冷增长减半
    windSpawnMultiplier: 2.0,  // 东吴唤风符生成概率翻倍
    windSpawnKey: 'red_cloud' // 唤风符的实体标识
  }
}

// 1. 蜀汉 (Shu - Artificer)
// 特性：重力低，速度快，冲刺长，金币翻倍
export const ShuBuff: IBuffConfig = {
  id: 'kite_shu',
  name: 'Shu Han',
  duration: -1, // -1 代表永久
  maxStack: 1,
  tags: ['Passive.ShuCoin'], // 标记：用于金币翻倍逻辑
  modifiers: [
    { stat: StatType.GravityScale, type: ModifierType.PercentAdd, value: -0.1 }, // 重力 -10%
    { stat: StatType.MoveSpeed, type: ModifierType.PercentAdd, value: 0.1 },     // 速度 +10%
    { stat: StatType.DashDurationIncrease, type: ModifierType.Flat, value: 1.0 },        // 冲刺 +1s
  ]
};

// 2. 曹魏 (Wei - Heavy Metal)
// 特性：重力高，特殊机制(怪物变增益)
export const WeiBuff: IBuffConfig = {
  id: 'kite_wei',
  name: 'Cao Wei',
  duration: -1,
  maxStack: 1,
  tags: ['Passive.WeiMechanic'], // 标记：用于碰撞逻辑覆写
  modifiers: [
    { stat: StatType.GravityScale, type: ModifierType.PercentAdd, value: 0.1 } // 重力 +10%
  ]
};

// 3. 东吴 (Wu - Thermodynamics)
// 特性：抗寒，唤风符变多，开局冲刺
export const WuBuff: IBuffConfig = {
  id: 'kite_wu',
  name: 'Eastern Wu',
  duration: -1,
  maxStack: 1,
  tags: ['Passive.WuSpawn', 'Passive.StartDash'], // 标记
  onAdd: [ new DashEnergyIncrementAction(100) ], // 开局增加100点冲刺能量
  modifiers: [
    { stat: StatType.ColdGrowthRate, type: ModifierType.PercentAdd, value: -0.1 } // 寒冷增长 -10%
  ]
  // 注意：寒冷惩罚降低 10% 的逻辑比较复杂，可以在 PlayerState 里读 Tag 单独处理
};

export const KiteBuffs = {
  none: null,
  shu: ShuBuff,
  wei: WeiBuff,
  wu: WuBuff
};