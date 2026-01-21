import { EVENTS, gameEvents } from '../config/Events';
import { GameConfig } from '../config/GameConfig';
import type GameScene from '../scenes/GameScene';

export default class ScoreManager {
  private scene: GameScene; // 仅用于可能的调试或扩展，不用于渲染
  
  // 核心数据
  private _currentScore: number = 0;
  private _highestY: number = 0; // 记录玩家到达过的最高像素位置 (Y越小越高)
  private startY: number = 0;

  // ✅ 新增：时间相关数据
  private _startTime: number = 0;      // 开始追踪的时间戳
  private _elapsedTime: number = 0;    // 已逝去的时间 (ms)
  private _lastSecondSnapshot: number = 0; // 上一次更新UI时的秒数 (用于节流)

  // 状态
  private isTracking: boolean = false;

  constructor(scene: GameScene, startY: number) {
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
      gameEvents.emit(EVENTS.UPDATE_COIN, Math.floor(this._currentScore));
      this.handleAddScore(amount); // 假设金币也算分
  }

  /**
   * 开启追踪 (游戏开始时调用)
   */
  public startTracking() {
    this.isTracking = true;
    this._currentScore = 0;
    this._highestY = this.startY;

    // ✅ 新增：重置时间
    this._startTime = this.scene.time.now; // 使用 Phaser 的场景时间，暂停时更安全
    this._elapsedTime = 0;
    this._lastSecondSnapshot = 0;

    // 立即刷新一次 UI 时间为 00:00
    this.emitTimeUpdate();
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
    if (this.scene.isPaused) return;

    // 更新最高高度记录 (Y轴向上变小)
    if (playerY < this._highestY) {
      this._highestY = playerY;
      
      // 通知 UI 更新高度显示
      const logicHeight = this.getCurrentHeightMeters();
      gameEvents.emit(EVENTS.UPDATE_HEIGHT, Math.floor(logicHeight));
    }

    // ✅ 2. 新增：时间逻辑
    // 计算当前耗时
    const now = this.scene.time.now;
    this._elapsedTime = now - this._startTime;

    // 将毫秒转换为秒
    const totalSeconds = Math.floor(this._elapsedTime / 1000);

    // 节流：只有当秒数发生变化时，才发送事件 (防止每帧发送60次事件)
    if (totalSeconds > this._lastSecondSnapshot) {
        this._lastSecondSnapshot = totalSeconds;
        this.emitTimeUpdate();
    }
  }

  /**
   * ✅ 新增：发送时间更新事件
   */
  private emitTimeUpdate() {
      const timeStr = this.formatTime(this._elapsedTime);
      // 发送 formatted string ("01:30") 给 UI
      gameEvents.emit(EVENTS.UPDATE_TIME, timeStr);
  }

  /**
   * ✅ 新增：格式化时间 (ms -> MM:SS)
   */
  private formatTime(ms: number): string {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // 补零操作，例如 1:5 变成 01:05
      const minStr = minutes.toString().padStart(2, '0');
      const secStr = seconds.toString().padStart(2, '0');

      return `${minStr}:${secStr}`;
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
      currency: Math.floor(this._currentScore), // 如果金币和分数相同
      height: Math.floor(this.getCurrentHeightMeters()),
      // ✅ 新增：结算时带上存活时间字符串
      timeStr: this.formatTime(this._elapsedTime),
      // ✅ 新增：如果需要存数据库，也可以带上原始毫秒数
      timeMs: this._elapsedTime
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