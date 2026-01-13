import Phaser from 'phaser';

export const gameEvents = new Phaser.Events.EventEmitter();

export const EVENTS = {
  GAME_START: 'game-start',       // UI -> Game: 玩家点击开始
  GAME_OVER: 'game-over',         // Game -> UI: 玩家死亡
  GAME_RESTART: 'game-restart',   // UI -> Game: 玩家点击重开
  UPDATE_SCORE: 'update-score',   // Game -> UI: 更新分数
};