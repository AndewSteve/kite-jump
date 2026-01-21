import Phaser from 'phaser';
import DataManager from '../../managers/DataManager';

export interface HistoryBarUI {
  container: Phaser.GameObjects.Container;
}

export const createHistoryBar = (
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  onClick: () => void
): HistoryBarUI => {
  const container = scene.add.container(centerX, y);

  const historyBg = scene.add.rectangle(0, 0, 400, 50, 0x333344, 0.8)
    .setStrokeStyle(1, 0x555566);
  const highScoreText = scene.add.text(0, 0, `👑 最高记录: ${DataManager.data.highScore}m`, {
    fontSize: '24px',
    color: '#ffd700',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5);

  container.add([historyBg, highScoreText]);

  historyBg.setInteractive({ useHandCursor: true })
    .on('pointerdown', onClick)
    .on('pointerover', () => historyBg.setStrokeStyle(2, 0xffaa00, 1))
    .on('pointerout', () => historyBg.setStrokeStyle(2, 0xffffff, 0.8));

  return { container };
};
