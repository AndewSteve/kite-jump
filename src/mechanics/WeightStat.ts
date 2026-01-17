// src/mechanics/WeightStat.ts
import { ModifierType, type IModifier } from './StatDefinitions';

/**
 * 权重属性类：专门管理单个 EntityId 的生成权重
 * 逻辑与 StatSystem 核心一致：(Base + Flat) * (1 + Percent)
 */
export class WeightStat {
  private _baseValue: number = 0;
  private _modifiers: IModifier[] = [];
  private _dirty: boolean = true;
  private _cachedValue: number = 0;

  constructor(base: number = 0) {
    this._baseValue = base;
  }

  public get baseValue() { return this._baseValue; }
  public set baseValue(v: number) {
    if (this._baseValue !== v) {
      this._baseValue = v;
      this._dirty = true;
    }
  }

  public addModifier(mod: IModifier) {
    this._modifiers.push(mod);
    this._dirty = true;
  }

  public removeModifier(sourceId: string) {
    const initialLen = this._modifiers.length;
    this._modifiers = this._modifiers.filter(m => m.sourceId !== sourceId);
    if (this._modifiers.length !== initialLen) {
      this._dirty = true;
    }
  }
  
  public clearModifiers() {
    if (this._modifiers.length > 0) {
      this._modifiers = [];
      this._dirty = true;
    }
  }

  public getValue(): number {
    if (this._dirty) {
      this.recalculate();
    }
    // 权重不能为负数，保底 0
    return Math.max(0, this._cachedValue);
  }

  private recalculate() {
    let flatSum = 0;
    let percentAddSum = 0;
    let multiplierProduct = 1; // ✅ 乘法基数是 1

    for (const mod of this._modifiers) {
      switch (mod.type) {
        case ModifierType.Flat:
          flatSum += mod.value;
          break;
        case ModifierType.PercentAdd:
          percentAddSum += mod.value;
          break;
        case ModifierType.Multiplier:
          // ✅ 核心差异：乘算
          multiplierProduct *= mod.value;
          break;
      }
    }

    // 公式：(基础 + 固定值) * (1 + 百分比加成总和) * (所有独立倍率的乘积)
    const basePart = Math.max(0, this._baseValue + flatSum);
    const percentPart = Math.max(0, 1 + percentAddSum); // 防止 -120% 变成负数权重
    
    this._cachedValue = basePart * percentPart * multiplierProduct;
    this._dirty = false;
  }
}