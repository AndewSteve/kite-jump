// src/managers/AudioManager.ts
import Phaser from 'phaser';
import DataManager from './DataManager';
import { type AudioKey } from '../config/AssetKeys';

export default class AudioManager {
  private static soundManager: Phaser.Sound.BaseSoundManager;
  private static currentBgm: Phaser.Sound.BaseSound | null = null;
  private static currentBgmKey: string = '';

  // 初始化 (需要在 BootScene 或 PreloadScene 调用)
  static init(game: Phaser.Game) {
    this.soundManager = game.sound;
    
    // 读取存档设置并应用
    const settings = DataManager.data.settings;
    this.soundManager.mute = settings.muted;
    // Phaser 并没有区分 bgm/sfx volume 的原生总开关，我们需要自己维护
    // 这里我们先不设置全局 volume，而是在播放时乘上这个系数
    
    // 监听暂停/恢复事件，处理音频上下文
    game.events.on(Phaser.Core.Events.BLUR, () => this.soundManager.mute = true);
    game.events.on(Phaser.Core.Events.FOCUS, () => {
       if (!DataManager.data.settings.muted) this.soundManager.mute = false;
    });
  }

  /**
   * 播放背景音乐 (带淡入淡出切换)
   */
  static playBgm(scene: Phaser.Scene,key: AudioKey) {
    if (!this.soundManager) return;
    if (this.currentBgmKey === key && this.currentBgm?.isPlaying) return;
    // console.log('player bgm:', key);
    

    // 1. 淡出旧 BGM
    if (this.currentBgm) {
      const oldBgm = this.currentBgm; // 闭包引用
      scene.tweens.add({
        targets: oldBgm,
        volume: 0,
        duration: 500,
        onComplete: () => {
          oldBgm.stop();
          oldBgm.destroy();
        }
      });
    }

    // 2. 播放新 BGM
    const settings = DataManager.data.settings;
    this.currentBgmKey = key;
    this.currentBgm = this.soundManager.add(key, {
      loop: true,
      volume: 0 // 初始 0，淡入
    });
    
    this.currentBgm.play();

    // 淡入
    scene.tweens.add({
      targets: this.currentBgm,
      volume: settings.bgmVolume,
      duration: 1000
    });
  }

  /**
   * 播放音效 (一次性)
   * @param key 音频 Key
   * @param config 额外配置 (volume 0-1, rate 0.5-2.0, detune)
   */
  static playSfx(key: AudioKey, config?: { volume?: number, rate?: number, detune?: number }) {
    if (!this.soundManager) return;
    // console.log('play sfx:', key);
    
    const settings = DataManager.data.settings;
    // 最终音量 = 存档SFX音量 * 此次播放的修正音量
    const finalVolume = settings.sfxVolume * (config?.volume ?? 1.0);

    this.soundManager.play(key, {
      volume: finalVolume,
      rate: config?.rate ?? 1.0,
      detune: config?.detune ?? 0
    });
  }

  // --- 设置控制 ---

  // ✅ 新增：停止所有非 BGM 的音效 (用于暂停时)
  static stopAllSfx() {
    if (!this.soundManager) return;

    // 获取所有正在播放的声音
    const allSounds = this.soundManager.getAllPlaying();
    
    allSounds.forEach(sound => {
        // 如果不是当前的 BGM，就停止
        if (sound !== this.currentBgm) {
            sound.stop();
            // 如果是 OneShot 的音效，Phaser 通常会自动销毁
            // 如果是 Loop 的环境音效，这里停止后需要逻辑层重新播放，或者用 pause 替代 stop
            // 根据需求"清空队列"，stop 是最干净的
        }
    });
  }

  static setBgmVolume(val: number) {
    const v = Phaser.Math.Clamp(val, 0, 1);
    DataManager.data.settings.bgmVolume = v;
    DataManager.save();

    // 实时调整当前 BGM
    if (this.currentBgm && this.currentBgm.isPlaying) {
      (this.currentBgm as any).volume = v; 
      // 注意：WebAudioSound 的 volume 是属性，HTML5AudioSound 也是
    }
  }

  static setSfxVolume(val: number) {
    const v = Phaser.Math.Clamp(val, 0, 1);
    DataManager.data.settings.sfxVolume = v;
    DataManager.save();
  }

  static toggleMute(): boolean {
    const newState = !DataManager.data.settings.muted;
    DataManager.data.settings.muted = newState;
    DataManager.save();
    
    this.soundManager.mute = newState;
    return newState;
  }
}