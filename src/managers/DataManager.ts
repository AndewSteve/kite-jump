// src/managers/DataManager.ts

import { GameConfig } from "../config/GameConfig";
import { KiteSkinIDs, type KiteSkinID } from "../config/KiteSkinDef";

export interface GameRecord {
  date: string;
  score: number;
  height: number;
}

export interface UserSaveData {
  currency: number;
  highScore: number;
  history: GameRecord[]; // 游玩历史
  upgrades: {
    lightness: number;   // 轻盈度等级
    windMastery: number; // 御风值等级
    auraRange: number;   // 灵韵磁场等级
  };
  selectedKiteId: KiteSkinID; // 当前选中的风筝
}

const DEFAULT_SAVE: UserSaveData = {
  currency: 1000, // 初始给点钱方便测试
  highScore: 0,
  history: [],
  upgrades: { lightness: 0, windMastery: 0, auraRange: 0 },
  selectedKiteId: KiteSkinIDs.DefaultYellow
};

export default class DataManager {
  private static _data: UserSaveData;
  private static readonly SAVE_KEY = 'kite_jump_save_v1';

  // --- 基础读写 ---
  static load() {
    const raw = localStorage.getItem(this.SAVE_KEY);
    if (raw) {
      this._data = JSON.parse(raw);
    } else {
      this._data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  }

  static save() {
    localStorage.setItem(this.SAVE_KEY, JSON.stringify(this._data));
  }

  static get data() {
    if (!this._data) this.load();
    return this._data;
  }

  // --- 游戏记录 ---
  static addRecord(score: number, height: number) {
    const record: GameRecord = {
      date: new Date().toLocaleDateString(),
      score,
      height
    };
    this.data.history.unshift(record); // 最新的在前面
    // 只保留最近 20 条
    if (this.data.history.length > 20) this.data.history.pop();
    
    // 更新最高分
    if (score > this.data.highScore) {
        this.data.highScore = score;
    }
    
    // 累加金币 (假设分数 1:1 转金币，或者你可以定义转换率)
    this.data.currency += Math.floor(score * 0.5); 
    
    this.save();
  }

  // --- 升级系统核心逻辑 ---

  // 1. 获取升级消耗 (公式：基础价 * (等级+1))
  static getUpgradeCost(type: keyof UserSaveData['upgrades']): number {
    const level = this.data.upgrades[type];
    const basePrices = {
      lightness: 100,
      windMastery: 100,
      auraRange: 150
    };
    return basePrices[type] * (level + 1);
  }

  // 2. 执行升级
  static upgrade(type: keyof UserSaveData['upgrades']): boolean {
    const cost = this.getUpgradeCost(type);
    if (this.data.currency >= cost) {
      this.data.currency -= cost;
      this.data.upgrades[type]++;
      this.save();
      return true;
    }
    return false;
  }

  // --- 属性加成计算 (提供给游戏内的数值) ---

  // A. 轻盈度：每级减少 3% 的基础重力 (G)
  static getGravityScale(): number {
    // 0级=1.0, 10级=0.7
    return Math.max(0.5, 1.0 - (this.data.upgrades.lightness * 0.03));
  }

  // B. 御风值：每级增加 5% 的爆发力
  static getBoostScale(): number {
    // 0级=1.0, 10级=1.5
    return 1.0 + (this.data.upgrades.windMastery * 0.05);
  }

  // C. 灵韵磁场：每级增加 4像素 的判定半径
  static getHitboxRadiusBonus(): number {
    return this.data.upgrades.auraRange * 0.01 * GameConfig.player.baseRadius; // 转为像素
  }
}