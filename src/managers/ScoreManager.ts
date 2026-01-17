import { EVENTS, gameEvents } from '../config/Events';
import { GameConfig } from '../config/GameConfig';
import DataManager from './DataManager';

export default class ScoreManager {
  private scene: Phaser.Scene; // 仅用于可能的调试或扩展，不用于渲染
  
  // 核心数据
  private _currentScore: number = 0;
  private _highestY: number = 0; // 记录玩家到达过的最高像素位置 (Y越小越高)
  private startY: number = 0;

  // 状态
  private isTracking: boolean = false;

  constructor(scene: Phaser.Scene, startY: number) {
    this.scene = scene;
    this.startY = startY;
    this._highestY = startY;

    this.setupListeners();
  }

  private setupListeners() {
    // 监听加分事件 (金币/杀怪)
    gameEvents.on(EVENTS.ADD_SCORE, this.handleAddScore, this);
    gameEvents.on(EVENTS.ADD_COIN, this.handleAddCoin, this);
  }

  private handleAddScore(amount: number) {
    if (!this.isTracking) return;
    this._currentScore += amount;
    // 立即通知 UI 更新
    gameEvents.emit(EVENTS.UPDATE_SCORE, Math.floor(this._currentScore));
  }
  
  private handleAddCoin(amount: number) {
      // 金币逻辑可能包含：加分 + 加钱
      // 这里假设金币直接加到当前局分数，或者你有独立的金币计数器
      // DataManager.data.currency += amount; // 实时存钱还是结算存钱？通常是结算存
      // 这里我们只处理局内表现
      this.handleAddScore(amount); // 假设金币也算分
  }

  /**
   * 开启追踪 (游戏开始时调用)
   */
  public startTracking() {
    this.isTracking = true;
    this._currentScore = 0;
    this._highestY = this.startY;
  }

  /**
   * 停止追踪 (死亡时调用)
   */
  public stopTracking() {
    this.isTracking = false;
  }

  /**
   * 每帧更新 (计算高度分)
   * @param playerY 玩家当前的像素 Y 坐标
   */
  public update(playerY: number) {
    if (!this.isTracking) return;

    // 更新最高高度记录 (Y轴向上变小)
    if (playerY < this._highestY) {
      this._highestY = playerY;
      
      // 通知 UI 更新高度显示
      const logicHeight = this.getCurrentHeightMeters();
      gameEvents.emit(EVENTS.UPDATE_HEIGHT, Math.floor(logicHeight));
    }
  }

  /**
   * 获取当前逻辑高度 (米)
   */
  public getCurrentHeightMeters(): number {
    const pixels = this.startY - this._highestY;
    return pixels / GameConfig.level.pixelsPerMeter;
  }

  public getLogicHeightMeters(heightPx: number): number {
    return heightPx / GameConfig.level.pixelsPerMeter;
  }
  
  public getCurrentScore(): number {
      return Math.floor(this._currentScore);
  }

  /**
   * 结算数据 (用于 Game Over)
   */
  public getFinalStats() {
    return {
      score: Math.floor(this._currentScore),
      height: Math.floor(this.getCurrentHeightMeters())
    };
  }
  
  /**
   * 获取当前死亡深度阈值 (像素 Y)
   */
  public getDeathThresholdY(): number {
      return this._highestY + GameConfig.level.deathDepth;
  }

  public destroy() {
    gameEvents.off(EVENTS.ADD_SCORE, this.handleAddScore, this);
    gameEvents.off(EVENTS.ADD_COIN, this.handleAddCoin, this);
  }
}