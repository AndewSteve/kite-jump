import { ModifierType } from '../mechanics/StatDefinitions';
import { type IBuffConfig } from '../mechanics/BuffTypes';
import { 
  WeatherThunderBuff, 
  WeatherBlizzardBuff, 
  WeatherAuroraBuff 
} from './BuffConfig';
import { AudioKeys, type AudioKey } from './AssetKeys';
import { EntityIds, type EntityId } from './EntityIds';

export interface IWeatherSpawnModifier {
  entityId: EntityId;
  type: typeof ModifierType[keyof typeof ModifierType];
  value: number;
}

export interface IWeatherConfig {
  id: string;
  name: string;
  duration: number; // 持续时间
  weight: number;   // 触发权重
  
  buffs?: IBuffConfig[]; // 关联的全局 Buff
  spawnModifiers?: IWeatherSpawnModifier[]; // 关联的生成修正

  sfxAudioKey?: AudioKey; // 天气音效 Key
  
  visualTag: string; // 视觉特效 Key
  visualTint?: number; // 简单的全屏色调 (测试用)
}

export const WeatherConfig: Record<string, IWeatherConfig> = {
  // 🌩️ 雷暴
  thunder: {
    id: 'thunder',
    name: '雷暴',
    duration: 25,
    sfxAudioKey: AudioKeys.SfxThunderstorm,
    weight: 40,
    visualTag: 'rain_storm',
    visualTint: 0xaaaaaa, // 变暗
    
    // 核心机制：Buff 负责回能和落雷(通过 onTick Summon)
    buffs: [ WeatherThunderBuff ], 
    
    // 暂时没有特殊的生成修正，或者可以增加“乌云”概率
    spawnModifiers: [] 
  },

  // ❄️ 凛冬暴雪
  blizzard: {
    id: 'blizzard',
    name: '凛冬暴雪',
    sfxAudioKey: AudioKeys.SfxBlizzard,
    duration: 25,
    weight: 40,
    visualTag: 'snow_storm',
    visualTint: 0xccccff, // 冷蓝
    
    // 核心机制：重力1.2，寒冷1.2
    buffs: [ WeatherBlizzardBuff ],
    
    // 生成修正：孔明灯 +0.25 (PercentAdd)
    spawnModifiers: [
      {
        entityId: EntityIds.SkyLantern,
        type: ModifierType.PercentAdd,
        value: 0.25 
      },
      {
        entityId: EntityIds.ColdFlue,
        type: ModifierType.PercentAdd,
        value: 0.15
      }
    ]
  },

  // 🌌 极光磁暴 (福利关)
  aurora: {
    id: 'aurora',
    name: '极光磁暴',
    duration: 15,
    sfxAudioKey: AudioKeys.SfxAurora,
    weight: 20,
    visualTag: 'aurora_lights',
    visualTint: 0xff00ff, // 紫色氛围
    
    // 核心机制：低重力，寒冷=0 (通过 Rate 乘 0 实现)
    buffs: [ WeatherAuroraBuff ],
    
    // 生成修正：金币海
    spawnModifiers: [
      // 1. 金币 x5 倍 (或更多)
      {
        entityId: EntityIds.Coin,
        type: ModifierType.PercentAdd,
        value: 2.0
      },
      // 2. 唤风令 +0.2
      {
        entityId: EntityIds.WindKey,
        type: ModifierType.PercentAdd,
        value: 0.2
      },
      // 3. 屏蔽所有危险物 (Multiplier = 0)
      {
        entityId: EntityIds.IronVulture,
        type: ModifierType.Multiplier,
        value: 0
      },
      {
        entityId: EntityIds.ColdFlue,
        type: ModifierType.Multiplier,
        value: 0
      },
      // 也可以屏蔽普通云，让玩家专心吃钱
      {
        entityId: EntityIds.WindRune,
        type: ModifierType.Multiplier,
        value: 0 
      }
    ]
  }
};