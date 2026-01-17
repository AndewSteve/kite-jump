import { ChangeWindAction, ColdnessIncrementAction, DashEnergyIncrementAction, ResetWindAction, SpawnMode, SummonAction } from "../actions/BuffActions";
import { LightningStrikeAction } from "../actions/MechanicActions";
import { type IBuffConfig } from "../mechanics/BuffTypes";
import { StatType, ModifierType } from "../mechanics/StatDefinitions";
import { SummonId } from "./SummonConfig";

// --- 公共的操控性修正 (模拟之前的 2.0x 乘数) ---
// 加速度 +100% (x2)，阻力 +100% (x2) -> 极致灵敏，松手即停
const DashControlMods = [
  { stat: StatType.Acceleration, type: ModifierType.PercentAdd, value: 1.0 },
  { stat: StatType.Drag, type: ModifierType.PercentAdd, value: -0.5 },
  // 磁力全开 (比如加 500 范围)
  { stat: StatType.GoldMagnetRange, type: ModifierType.Flat, value: 500 }
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
  },
  universalTag: 'State.Dash',
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

export const TransitionDashConfig = {
  tag: 'State.Transition',
  duration: 6,
  speed: -2000,
};

// 过渡冲刺 Buff
export const TransitionBuff: IBuffConfig = {
  id: 'biome_transition',
  name: 'Biome Transition',
  duration: -1, // ♾️ 永久，直到 Phase 结束手动移除
  maxStack: 1,
  tags: [
    'State.Dash',       // ✅ 复用：让 getFinalGravityY 返回 0
    'State.Invincible', // ✅ 复用：无敌
    TransitionDashConfig.tag  // 🆕 新增：用于区分普通冲刺，锁定输入
  ],
  modifiers: [
    // 可以加一些视觉上的 Modifier，比如拖尾宽度
  ]
};

export const SkyLaternBuff: IBuffConfig = {
  id: 'sky_lantern',
  name: 'Sky Lantern',
  duration: 8,
  maxStack: 2,
  tags: ['Buff.SkyLantern'],
  tickInterval: 1.0, // 每秒触发一次
  onTick: [
    new ColdnessIncrementAction(-6) // 每秒减少 6 点寒冷
  ],
};

// ✅ L2 生态机制控制器
export const RedCliffMechanicBuff: IBuffConfig = {
  id: 'biome_l2_control',
  name: '赤壁环境控制',
  duration: -1,   // 永久 (直到 Phase 结束被移除)
  maxStack: 1,
  
  // 核心节奏：10秒一次循环 (5秒存在 + 5秒空窗)
  tickInterval: 10.0, 
  
  // 1. 进场时立即召唤一次 (不用等10秒)
  onAdd: [
    new SummonAction(SummonId.ThermalVent, 5.0, SpawnMode.RandomScreenX)
  ],
  
  // 2. 每10秒召唤一次
  onTick: [
    new SummonAction(SummonId.ThermalVent, 5.0, SpawnMode.RandomScreenX)
  ]
};

// ✅ L3 云梦泽机制控制器
export const CloudMarshMechanicBuff: IBuffConfig = {
  id: 'biome_l3_control',
  name: '云梦泽大雾',
  duration: -1,   // 永久 (直到 Phase 结束被自动清理)
  maxStack: 1,
  
  // 进场时召唤大雾
  onAdd: [
    // 参数2: lifeTime = -1 (永久，直到被 clearAll)
    // 参数3: SpawnMode.RandomScreenX (这里传什么都无所谓，FogOverlay 会自己跑到顶上去)
    new SummonAction(SummonId.FogOverlay, -1, SpawnMode.RandomScreenX)
  ],
  
  // L3 不需要 onTick 循环召唤，只要一个遮罩盖住就行
};

export const WindCaveMechanicBuff: IBuffConfig = {
  id: 'biome_l4_control',
  name: '墨家风洞机制',
  duration: -1, // 永久
  maxStack: 1,
  tickInterval: 5.0, // ✅ 每 5 秒切一次风

  // 进场：召唤风向标 + 初始变风
  onAdd: [
    new SummonAction(SummonId.WindVane, -1, SpawnMode.RandomScreenX), // 位置由 WindVane 自己修正
    new ChangeWindAction()
  ],

  // 心跳：变风
  onTick: [
    new ChangeWindAction()
  ],

  // 退场：重置风力 (非常重要！)
  onRemove: [
    new ResetWindAction()
  ]
};

// 八卦盾
export const TacticsConfig = {
  tag: 'Buff.Tactics',
}
export const TacticsBuff: IBuffConfig = {
  id: 'tactics_buff',
  name: '墨家战术',
  duration: -1, // 永久
  maxStack: 1,
  tags: [TacticsConfig.tag],
};

// 1. 雷暴 Buff
export const WeatherThunderBuff: IBuffConfig = {
  id: 'weather_thunder_buff',
  name: '雷暴环境',
  duration: -1, // 由 WeatherManager 手动移除
  maxStack: 1,
  
  // 机制1：每秒回能 8%
  tickInterval: 1.0,
  onTick: [
    new DashEnergyIncrementAction(8),
    // ✅ 尝试落雷：40% 概率
    // 逻辑：每秒醒来一次 -> 检查场上没雷 -> 40%概率 -> 召唤 -> (雷存在1.5s+0.3s) -> 期间不会再召唤
    new LightningStrikeAction(0.4)
  ],
  
  // 冲刺免疫雷击逻辑 -> 已经在 Player.ts 的 update 里通过 tags.includes('State.Invincible') 处理
};

// 2. 暴雪 Buff
export const WeatherBlizzardBuff: IBuffConfig = {
  id: 'weather_blizzard_buff',
  name: '暴雪环境',
  duration: -1,
  maxStack: 1,
  modifiers: [
    // 机制1：寒冷值增长 1.2倍
    {
      stat: StatType.ColdGrowthRate,
      type: ModifierType.Multiplier,
      value: 1.2 
    },
    // 机制2：重力 1.2倍
    {
      stat: StatType.GravityScale,
      type: ModifierType.Multiplier, // 注意：这里用 Multiplier 比 PercentAdd 更安全，防止和其他重力Buff叠加失控
      value: 1.2
    }
  ]
};

// 3. 极光 Buff
export const WeatherAuroraBuff: IBuffConfig = {
  id: 'weather_aurora_buff',
  name: '极光环境',
  duration: -1,
  maxStack: 1,
  modifiers: [
    // 机制1：低重力 (0.6倍)
    {
      stat: StatType.GravityScale,
      type: ModifierType.Multiplier,
      value: 0.6
    },
    // 机制2：寒冷值不再增加 (增长率乘 0)
    {
      stat: StatType.ColdGrowthRate,
      type: ModifierType.Multiplier,
      value: 0
    }
  ],
  // 可以在 onAdd 里加一个 Action 把当前寒冷值清零 (如果策划要求瞬间暖和)
  // onAdd: [ new ResetColdnessAction() ] 
};