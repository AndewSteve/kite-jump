import Phaser from 'phaser';
import { AudioKeys } from '../../config/AssetKeys';
import AudioManager from '../../managers/AudioManager';
import DataManager from '../../managers/DataManager';
import { EntityType } from '../../types/GameTypes';
import { getEncyclopediaEntries } from './EncyclopediaData';

const typeLabelMap: Record<EntityType, string> = {
  buff: '增益',
  hazard: '危险',
  neutral: '中立',
  coin: '金币'
};

export const showEncyclopediaDialog = (scene: Phaser.Scene) => {
  const { width, height } = scene.scale;
  const container = scene.add.container(0, 0).setDepth(200);

  AudioManager.playSfx(AudioKeys.SfxBtnClick);

  const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9)
    .setInteractive();

  const panelWidth = Math.min(920, width * 0.92);
  const panelHeight = Math.min(980, height * 0.92);
  const panel = scene.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x111111, 0.96)
    .setStrokeStyle(2, 0x55aaff);

  const title = scene.add.text(width / 2, height / 2 - panelHeight / 2 + 40, '图鉴', {
    fontSize: '36px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  const closeBtn = scene.add.text(width / 2, height / 2 + panelHeight / 2 - 36, '关闭', {
    fontSize: '26px',
    color: '#ff6666'
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  closeBtn.on('pointerdown', () => {
    AudioManager.playSfx(AudioKeys.SfxBtnClick);
    container.destroy();
  });

  container.add([bg, panel, title, closeBtn]);

  const entries = getEncyclopediaEntries();
  const columns = 4;
  const rows = Math.ceil(entries.length / columns);
  const gridTop = height / 2 - panelHeight / 2 + 90;
  const gridLeft = width / 2 - panelWidth / 2 + 60;
  const cellWidth = (panelWidth - 120) / columns;
  const cellHeight = Math.min(150, (panelHeight - 180) / Math.max(rows, 1));
  const iconSize = 64;
  const hazardColor = '#ff5555';
  const hazardStrokeColor = 0xff4444;

  entries.forEach((entry, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const cellX = gridLeft + col * cellWidth + cellWidth / 2;
    const cellY = gridTop + row * cellHeight + cellHeight / 2;

    const seen = DataManager.isEntitySeen(entry.id);
    const frameStroke = seen && entry.type === EntityType.Hazard ? hazardStrokeColor : (seen ? 0x55aaff : 0x444444);
    const frame = scene.add.rectangle(cellX, cellY, cellWidth - 16, cellHeight - 16, 0x1b1b1b, 0.9)
      .setStrokeStyle(1, frameStroke);

    const icon = scene.add.image(cellX, cellY - 18, entry.texture);
    const maxDim = Math.max(icon.width, icon.height);
    const scale = maxDim > 0 ? iconSize / maxDim : 1;
    icon.setScale(scale);

    const nameColor = seen && entry.type === EntityType.Hazard ? hazardColor : (seen ? '#ffffff' : '#666666');
    const nameText = scene.add.text(cellX, cellY + 30, seen ? entry.name : '???', {
      fontSize: '18px',
      color: nameColor,
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    const typeColor = seen && entry.type === EntityType.Hazard ? hazardColor : (seen ? '#88ddff' : '#444444');
    const typeText = scene.add.text(cellX, cellY + 52, typeLabelMap[entry.type], {
      fontSize: '14px',
      color: typeColor
    }).setOrigin(0.5);

    if (!seen) {
      icon.setTint(0x333333);
      icon.setAlpha(0.5);
    }

    container.add([frame, icon, nameText, typeText]);
  });
};
