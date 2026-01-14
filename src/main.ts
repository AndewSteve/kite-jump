import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { GameConfig } from './config/GameConfig';
import UIScene from './scenes/UIScene';
import MainMenuScene from './scenes/MainMenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GameConfig.width,   // 使用配置
  height: GameConfig.height, // 使用配置
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: GameConfig.physics.gravity, // 向下的加速度，比默认重力小，模拟风筝的漂浮感
      debug: true, // 开发时设为 true 可以看到碰撞框
      fixedStep: GameConfig.physics.fixedStep,
    },
  },
  // ✅ 新增：缩放与居中配置
  scale: {
    // 模式：FIT (保持长宽比缩放以适应屏幕，不会拉伸变形)
    // 如果你坚持要 1:1 像素显示不缩放，可以用 Phaser.Scale.NONE
    mode: Phaser.Scale.FIT, 
    
    // 居中：水平和垂直都居中
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainMenuScene,GameScene, UIScene],
  // scene: [GameScene, UIScene],
};

new Phaser.Game(config);