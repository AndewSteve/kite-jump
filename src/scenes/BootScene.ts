// src/scenes/BootScene.ts
import Phaser from 'phaser';
import { SceneKeys } from '../config/GameConfig';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload() {
    // 这里只加载进度条的背景图，或者 Logo
    // this.load.image('logo', 'assets/logo.png');
  }

  create() {
    console.log('🤖 Booting Game...');
    
    // 配置全局注册表 (Registry)
    // this.registry.set('highscore', 0);
    
    // 立刻切换到加载场景
    this.scene.start('PreloadScene');
  }
}