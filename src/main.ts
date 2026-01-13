import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { GameConfig } from './config/consts';
import UIScene from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GameConfig.width,   // 使用配置
  height: GameConfig.height, // 使用配置
  parent: 'app',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: GameConfig.physics.gravity, // 向下的加速度，比默认重力小，模拟风筝的漂浮感
      debug: false, // 开发时设为 true 可以看到碰撞框
    },
  },
  scene: [GameScene, UIScene],
};

new Phaser.Game(config);