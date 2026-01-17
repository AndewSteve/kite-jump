import Phaser from 'phaser';

export const gameEvents = new Phaser.Events.EventEmitter();

export const EVENTS = {
  GAME_START: 'game-start',       // UI -> Game: 玩家点击开始
  GAME_OVER: 'game-over',         // Logic -> Game: 玩家死亡
  SHOW_GAME_OVER: 'show-game-over',// Game -> UI: 玩家死亡
  GAME_RESTART: 'game-restart',   // UI -> Game: 玩家点击重开

  UPDATE_HEIGHT: 'update-height',   // Game -> UI: 更新高度
  UPDATE_SCORE: 'update-score',   // Game -> UI: 更新分数

  UPDATE_COLDNESS: 'update-cold',   // 更新寒冷值 (0-100)
  UPDATE_DASH: 'update-dash',       // 更新冲刺值 (0-100)

  ADD_SCORE: 'add-score',         // Game Logic: 增加分数
  ADD_COIN: 'add-coin',           // Game Logic: 增加金币
  
  WIND_CHANGE: 'wind-change',    // 环境风力变化
};