import Phaser from 'phaser';
import GameScene from '../scenes/GameScene';
import { WeatherConfig, type IWeatherConfig } from '../config/WeatherConfig';
import AudioManager from './AudioManager';

export const WeatherState = {
  Idle: 'idle',     // 空闲 (等待触发)
  Active: 'active',   // 天气运行中
  Cooldown: 'cooldown'  // 冷却中
} as const;
export type WeatherState = typeof WeatherState[keyof typeof WeatherState];

export default class WeatherManager {
  private scene: GameScene;
  
  private state: WeatherState = WeatherState.Idle;
  private currentTimer: number = 0; // 通用计时器 (用于持续时间和冷却)
  private cooldownDuration: number = 20; // 冷却时间 (秒)
  
  private currentWeather: IWeatherConfig | null = null;
  private hasTriggeredFirstTime: boolean = false; // 是否已触发过首次

  // 避免极光连续触发的记录
  private lastWeatherId: string | null = null;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  public update(dt: number) {
    // 转换为秒
    const dtSec = dt / 1000;

    switch (this.state) {
      case WeatherState.Idle:
        this.checkTriggerCondition();
        break;

      case WeatherState.Active:
        this.currentTimer -= dtSec;
        if (this.currentTimer <= 0) {
          this.stopWeather();
        }
        break;

      case WeatherState.Cooldown:
        this.currentTimer -= dtSec;
        if (this.currentTimer <= 0) {
          this.state = WeatherState.Idle;
          console.log("[WeatherManager] Cooldown finished. Ready for next weather.");
        }
        break;
    }
  }

  private checkTriggerCondition() {
    // 1. 高度检查 (> 600m)
    // 假设 GameConfig.level.weatherTriggerHeight = 600
    const currentHeight = this.scene.scoreManager.getCurrentHeightMeters();
    if (currentHeight < 600) return;

    // 2. 触发天气
    this.triggerRandomWeather();
  }

  private triggerRandomWeather() {
    // 筛选候选天气
    const candidates = Object.values(WeatherConfig).filter(w => {
        // 极光不能连续触发 (策划规则：极光磁暴不能连续触发，必须间隔一次)
        if (w.id === 'aurora' && this.lastWeatherId === 'aurora') {
            return false;
        }
        return true;
    });

    if (candidates.length === 0) return;

    // 简单的随机权重 (或者你可以像 SpawnManager 那样做权重随机)
    // 这里简单实现：随机选一个
    const selected = Phaser.Math.RND.pick(candidates);
    
    this.startWeather(selected);
  }

  public startWeather(config: IWeatherConfig) {
    console.log(`[WeatherManager] Starting Weather: ${config.name}`);
    
    this.currentWeather = config;
    this.state = WeatherState.Active;
    this.currentTimer = config.duration;
    this.lastWeatherId = config.id;
    this.hasTriggeredFirstTime = true;

    // 1. 应用 Buffs (重力、寒冷、回能等)
    if (config.buffs) {
      config.buffs.forEach(buff => {
        this.scene.player.playerState.buffs.addBuff(buff);
      });
    }

    // 2. 应用生成修正 (Spawn Modifiers)
    if (config.spawnModifiers) {
      const sourceId = `weather_${config.id}`; // 🏷️ 来源标签
      config.spawnModifiers.forEach(mod => {
        this.scene.spawnManager.addWeightModifier(mod.entityId, {
          type: mod.type,
          value: mod.value,
          sourceId: sourceId
        });
      });
    }

    // 3. 视觉表现 (Shader / Particles)
    // this.scene.visualManager.playWeatherEffect(config.visualTag);
    // 简单的背景色调模拟
    if (config.visualTint) {
        // this.scene.cameras.main.setTint(config.visualTint);
    }

    if (config.sfxAudioKey) {
      AudioManager.playSfx(config.sfxAudioKey);
    }
  }

  public stopWeather() {
    if (!this.currentWeather) return;
    console.log(`[WeatherManager] Stopping Weather: ${this.currentWeather.name}`);

    const config = this.currentWeather;
    const sourceId = `weather_${config.id}`;

    // 1. 移除 Buffs
    // 我们需要按 ID 移除，这里假设 BuffConfig 里定义的 ID 和 Weather 里引用的一致
    if (config.buffs) {
      config.buffs.forEach(buff => {
        this.scene.player.playerState.buffs.removeBuffById(buff.id);
      });
    }

    // 2. 移除生成修正 (精确清理)
    this.scene.spawnManager.removeModifiersBySource(sourceId);

    // 3. 停止视觉
    // this.scene.visualManager.stopWeatherEffect();
    // this.scene.cameras.main.clearTint();

    // 4. 进入冷却
    this.currentWeather = null;
    this.state = WeatherState.Cooldown;
    this.currentTimer = this.cooldownDuration;
  }
}