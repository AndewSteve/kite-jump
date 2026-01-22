import Phaser from 'phaser';
import DataManager from '../../managers/DataManager';
import { getEncyclopediaEntries } from './EncyclopediaData';

export interface EncyclopediaBarUI {
  container: Phaser.GameObjects.Container;
  countText: Phaser.GameObjects.Text;
}

export const createEncyclopediaBar = (
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  onClick: () => void
): EncyclopediaBarUI => {
  const container = scene.add.container(centerX, y);

  const bg = scene.add.rectangle(0, 0, 420, 50, 0x223333, 0.85)
    .setStrokeStyle(1, 0x55aaff);
  const title = scene.add.text(-120, 0, '图鉴', {
    fontSize: '24px',
    color: '#aeefff',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5);

  const entries = getEncyclopediaEntries();
  const seenCount = entries.filter((entry) => DataManager.isEntitySeen(entry.id)).length;
  const countText = scene.add.text(80, 0, `已发现 ${seenCount}/${entries.length}`, {
    fontSize: '20px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 2
  }).setOrigin(0.5);

  container.add([bg, title, countText]);

  bg.setInteractive({ useHandCursor: true })
    .on('pointerdown', onClick)
    .on('pointerover', () => bg.setStrokeStyle(2, 0xffaa00, 1))
    .on('pointerout', () => bg.setStrokeStyle(2, 0xffffff, 0.8));

  return { container, countText };
};
