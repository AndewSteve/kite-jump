// src/managers/VisualManager.ts
import Phaser from 'phaser';
import { EVENTS, gameEvents } from '../config/Events';

export const VisualEventKeys = {
  ToggleKiteTrail: 'toggle_kite_trail',
  // 未来可以添加更多事件键
} as const;

export default class VisualManager {
  // 单例模式 (或者你可以把它挂在 Scene 上)
  private static _instance: VisualManager;
  public static get instance(): VisualManager {
    if (!this._instance) this._instance = new VisualManager();
    return this._instance;
  }

  // 事件发射器，用于通知各个实体开关状态改变
  public events = new Phaser.Events.EventEmitter();

  // 状态记录
  private _isKiteTrailEnabled: boolean = false;

  constructor() {
    gameEvents.on(EVENTS.ToggleDash, 
      (data: { enabled: boolean; }) => this.onToggleDash(data.enabled));
  }

  private onToggleDash(enabled: boolean) {
    console.log(`[VisualManager] Received ToggleDash: ${enabled}`);
    this.setKiteTrailEnabled(enabled);
  }

  // --- 风筝拖尾控制 ---
  
  public get isKiteTrailEnabled(): boolean {
    return this._isKiteTrailEnabled;
  }

  public setKiteTrailEnabled(enabled: boolean) {
    if (this._isKiteTrailEnabled === enabled) return;
    this._isKiteTrailEnabled = enabled;
    
    // 广播事件：'toggle_kite_trail'
    this.events.emit(VisualEventKeys.ToggleKiteTrail, enabled);
    
    console.log(`[VisualManager] Kite Trail: ${enabled ? 'ON' : 'OFF'}`);
  }

  // 这里还可以加其他的，比如 toggle_rain, toggle_distortion 等
}