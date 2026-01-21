import Phaser from 'phaser';

export const gameEvents = new Phaser.Events.EventEmitter();

export const EVENTS = {
  GAME_START: 'game-start',       // UI -> Game: 玩家点击开始
  GAME_PAUSE: 'game-pause',       // UI -> Game: 暂停
  GAME_RESUME: 'game-resume',     // UI -> Game: 恢复
  GAME_OVER: 'game-over',         // Logic -> Game: 玩家死亡
  SHOW_GAME_OVER: 'show-game-over',// Game -> UI: 玩家死亡
  GAME_RESTART: 'game-restart',   // UI -> Game: 玩家点击重开
  GAME_QUIT: 'game-quit',         // UI -> Game: 返回主菜单

  UPDATE_LIFE: 'update-life',     // Game -> UI: 更新生命值显示

  UPDATE_HEIGHT: 'update-height',   // Game -> UI: 更新高度
  UPDATE_SCORE: 'update-score',   // Game -> UI: 更新分数
  UPDATE_COIN: 'update-coin',   // Game -> UI: 更新金币数
  UPDATE_TIME: 'update_time', // ✅ 确保加上这个

  UPDATE_COLDNESS: 'update-cold',   // 更新寒冷值 (0-100)
  UPDATE_DASH: 'update-dash',       // 更新冲刺值 (0-100)
  UPDATE_SPEED: 'update-speed',     // 更新速度显示

  ADD_SCORE: 'add-score',         // Game Logic: 增加分数
  ADD_COIN: 'add-coin',           // Game Logic: 增加金币
  
  WIND_CHANGE: 'wind-change',    // 环境风力变化

  PHASE_TRANSITION_START: 'phase-transition-start', // 过渡态开始
  PHASE_NORMAL_START: 'phase-normal-start',         // 正常态开始
};