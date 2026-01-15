// src/mechanics/BuffTypes.ts
import type { IBuffAction } from '../actions/ActionInterfaces';
import { StatType, ModifierType } from './StatDefinitions';

// 1. Buff 的静态配置 (策划配表用)
export interface IBuffConfig {
  id: string;          // 例如 'lantern', 'wind_god'
  name: string;
  duration: number;    // 持续时间 (秒)，-1 代表永久
  maxStack: number;    // 最大堆叠数 (1=唯一, >1=可堆叠)
  tags?: string[];     // 赋予玩家的标签，例如 ['State.WindGod']
  onAdd?: IBuffAction[];
  onRemove?: IBuffAction[];
  onTick?: IBuffAction[]; // 每秒触发的行为
  tickInterval?: number; // 触发间隔(秒)
  // 数值修改列表
  modifiers?: {
    stat: StatType;
    type: ModifierType;
    value: number;
  }[];
}

// 2. Buff 的运行时实例
export class BuffInstance {
  public readonly runtimeId: string; // 唯一ID，用于独立计时
  public timer: number;              // 剩余时间
  public config: IBuffConfig;
  public isExpired: boolean = false;
  public tickAccumulator: number = 0;

  constructor(config: IBuffConfig) {
    this.runtimeId = Phaser.Math.RND.uuid();
    this.config = config;
    this.timer = config.duration;
  }
}