// src/mechanics/StatSystem.ts
import { StatType, ModifierType, type IModifier } from './StatDefinitions';

class Stat {
  private _baseValue: number;
  private _modifiers: IModifier[] = [];
  private _dirty: boolean = true;
  private _cachedValue: number = 0;

  constructor(base: number) {
    this._baseValue = base;
  }

  public get baseValue() { return this._baseValue; }
  public set baseValue(v: number) {
    this._baseValue = v;
    this._dirty = true;
  }

  public addModifier(mod: IModifier) {
    this._modifiers.push(mod);
    this._dirty = true;
  }

  public removeModifier(sourceId: string) {
    // 移除指定来源的所有修改器
    this._modifiers = this._modifiers.filter(m => m.sourceId !== sourceId);
    this._dirty = true;
  }

  public getValue(): number {
    if (this._dirty) {
      this.recalculate();
    }
    return this._cachedValue;
  }

  private recalculate() {
    let flatSum = 0;
    let percentSum = 0;

    for (const mod of this._modifiers) {
      if (mod.type === ModifierType.Flat) {
        flatSum += mod.value;
      } else if (mod.type === ModifierType.PercentAdd) {
        percentSum += mod.value;
      }
    }

    // 公式：(基础值 + 固定加成) * (1 + 百分比加成)
    // 这种公式通常比 (基础 * 百分比) + 固定 更通用，防止固定值不受倍率影响
    this._cachedValue = (this._baseValue + flatSum) * (1 + percentSum);
    this._dirty = false;
  }
}

export default class StatSystem {
  private stats: Map<StatType, Stat> = new Map();

  // 初始化一个属性
  public initStat(type: StatType, baseValue: number) {
    this.stats.set(type, new Stat(baseValue));
  }

  // 获取属性值 (安全访问，如果没初始化则返回 0 或报错)
  public get(type: StatType): number {
    const stat = this.stats.get(type);
    return stat ? stat.getValue() : 0;
  }

  // 快捷添加修改器 (供 Buff 系统调用)
  public addModifier(type: StatType, mod: IModifier) {
    const stat = this.stats.get(type);
    if (stat) stat.addModifier(mod);
  }

  // 快捷移除修改器
  public removeModifier(type: StatType, sourceId: string) {
    const stat = this.stats.get(type);
    if (stat) stat.removeModifier(sourceId);
  }
  
  // 修改基础值 (比如局外升级后)
  public setBaseValue(type: StatType, val: number) {
      const stat = this.stats.get(type);
      if (stat) stat.baseValue = val;
  }
}