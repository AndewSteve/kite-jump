// src/scenes/PreloadScene.ts
import Phaser from 'phaser';
import { AssetManifest } from '../config/AssetManifest';
import { SceneKeys } from '../config/GameConfig';
import AudioManager from '../managers/AudioManager';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload() {
    // 1. 制作一个简易进度条
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);

    // 2. 监听加载进度事件
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 4 + 10, height / 2 - 20, (width / 2 - 20) * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // 3. ✅ 你的核心代码：集中加载所有资产
    // Load alpha test webp sequence for LabScene experiment.
    // const alphaFrameCount = 59;
    // for (let i = 1; i <= alphaFrameCount; i++) {
    //   const frame = String(i).padStart(3, '0');
    //   const key = `video_alpha_${frame}`;
    //   this.load.image(key, `assets/video_alpha_test/out${frame}.webp`);
    // }

    AssetManifest.forEach(asset => {
       if (asset.type === 'image') {
         this.load.image(asset.key, asset.path);
       } else if (asset.type === 'spritesheet' && asset.frameConfig) {
         this.load.spritesheet(asset.key, asset.path, asset.frameConfig);
       } else if (asset.type === 'audio') { // ✅ 处理音频
         this.load.audio(asset.key, asset.path);
       }
       // 还可以扩展 audio, json 等
    });
  }

  create() {
    // 资源加载完毕，准备进入游戏
    AudioManager.init(this.game);
    
    // this.scene.start(SceneKeys.Lab);
    this.scene.start(SceneKeys.MainMenu);
    // // 🧪 检查 URL 参数，决定是进实验室还是进游戏
    // const urlParams = new URLSearchParams(window.location.search);
    // if (urlParams.has('lab')) {
    //     console.log('🧪 Switching to Lab Mode');
    //     this.scene.start(SceneKeys.Lab);
    // } else {
    //     this.scene.start(SceneKeys.MainMenu); // 或者 'MenuScene'
    // }
  }
}
