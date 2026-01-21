import Phaser from 'phaser';
import { AudioKeys } from '../../config/AssetKeys';
import AudioManager from '../../managers/AudioManager';
import DataManager from '../../managers/DataManager';

export const showHistoryDialog = (scene: Phaser.Scene) => {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(200);

  AudioManager.playSfx(AudioKeys.SfxBtnClick);

  const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9)
    .setInteractive();

  const panel = scene.add.rectangle(width / 2, height / 2, 600, 900, 0x111111, 0.95)
    .setStrokeStyle(2, 0xffaa00);

  const title = scene.add.text(width / 2, height / 2 - 400, '游玩记录', {
    fontSize: '36px',
    color: '#fff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  const closeBtn = scene.add.text(width / 2, height / 2 + 400, '关闭', {
    fontSize: '28px',
    color: '#ff5555'
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  closeBtn.on('pointerdown', () => {
    AudioManager.playSfx(AudioKeys.SfxBtnClick);
    container.destroy();
  });

  container.add([bg, panel, title, closeBtn]);

  const startY = height / 2 - 320;
  const history = DataManager.data.history.slice().reverse();

  if (history.length === 0) {
    container.add(scene.add.text(width / 2, height / 2, '还没有游玩记录', {
      fontSize: '24px',
      color: '#666'
    }).setOrigin(0.5));
  } else {
    history.forEach((record, index) => {
      if (index > 12) return;
      const y = startY + (index * 50);

      const dateStr = new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const row = scene.add.text(width / 2 - 250, y, dateStr, { fontSize: '20px', color: '#aaaaaa' });
      const score = scene.add.text(width / 2, y, `${record.score} pts`, { fontSize: '20px', color: '#ffd700' }).setOrigin(0.5, 0);
      const heightTxt = scene.add.text(width / 2 + 250, y, `${Math.floor(record.height)}m`, { fontSize: '20px', color: '#00ffff' }).setOrigin(1, 0);

      const line = scene.add.rectangle(width / 2, y + 35, 520, 1, 0x333333);

      container.add([row, score, heightTxt, line]);
    });
  }
};
