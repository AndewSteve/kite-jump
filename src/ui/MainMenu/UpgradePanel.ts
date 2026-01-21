import Phaser from 'phaser';
import { AudioKeys, UITextureKeys } from '../../config/AssetKeys';
import AudioManager from '../../managers/AudioManager';
import DataManager from '../../managers/DataManager';

export type UpgradeType = 'lightness' | 'windMastery' | 'auraRange';

export const UPGRADE_BAR_WIDTH = 220;

export const createUpgradePanel = (
  scene: Phaser.Scene,
  startX: number,
  startY: number,
  gapY: number,
  onUpgradeSuccess: () => void,
  iconWidth: number
) => {
  createUpgradeItem(scene, startX, startY, '轻盈度', '降低基础重力', 'lightness', onUpgradeSuccess, iconWidth);
  createUpgradeItem(scene, startX, startY + gapY, '风力精通', '提升吃符后的上升爆发力', 'windMastery', onUpgradeSuccess, iconWidth);
  createUpgradeItem(scene, startX, startY + gapY * 2, '磁力范围', '增加正面道具吸引范围', 'auraRange', onUpgradeSuccess, iconWidth);
};

const createUpgradeItem = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  title: string,
  description: string,
  type: UpgradeType,
  onUpgradeSuccess: () => void,
  iconWidth: number
) => {
  const container = scene.add.container(x, y);

  const titleText = scene.add.text(0, 0, title, {
    fontSize: '18px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0, 1);

  const descText = scene.add.text(0, 6, description, {
    fontSize: '16px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0, 0);

  const barW = UPGRADE_BAR_WIDTH;
  const barH = 12;
  const barY = descText.y + descText.height + 10;
  const barBg = scene.add.rectangle(0, barY, barW, barH, 0x000000, 0.5).setOrigin(0, 0.5);

  const currentLvl = DataManager.data.upgrades[type];
  const maxLvl = 10;
  const fillWidth = (currentLvl / maxLvl) * barW;
  const barFill = scene.add.rectangle(0, barY, fillWidth, barH, 0xffaa00).setOrigin(0, 0.5);

  const cost = DataManager.getUpgradeCost(type);
  const isMax = currentLvl >= maxLvl;
  const btnColor = isMax ? 0x666666 : (DataManager.data.currency >= cost ? 0xffd700 : 0xcc4444);

  const btnW = 140;
  const btnH = 40;
  const btnY = barY + 45;

  const btnBg = scene.add.rectangle(0, btnY, btnW, btnH, 0x222222)
    .setStrokeStyle(2, btnColor)
    .setOrigin(0, 0.5);

  const btnTextStr = isMax ? 'MAX' : `LVUP ${cost}`;
  const btnText = scene.add.text(btnW / 2, btnY, btnTextStr, {
    fontSize: '20px',
    color: isMax ? '#888' : '#fff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  const iconGap = 12;
  const topY = -titleText.height;
  const bottomY = btnY + (btnH / 2);
  const iconCenterY = (topY + bottomY) / 2;
  const icon = scene.add.image(0, iconCenterY, getUpgradeIcon(type));
  const iconScale = iconWidth / icon.width;
  icon.setScale(iconScale);
  icon.x = -(icon.displayWidth / 2 + iconGap);

  if (!isMax) {
    btnBg.setInteractive({ useHandCursor: true });
    btnBg.on('pointerdown', () => {
      if (DataManager.upgrade(type)) {
        onUpgradeSuccess();
        AudioManager.playSfx(AudioKeys.SfxBtnLevelUp);
      } else {
        scene.tweens.add({ targets: btnBg, x: '+=5', duration: 50, yoyo: true, repeat: 3 });
      }
    });
  }

  container.add([icon, titleText, descText, barBg, barFill, btnBg, btnText]);
};

const getUpgradeIcon = (type: UpgradeType) => {
  switch (type) {
    case 'lightness':
      return UITextureKeys.UIPluginG;
    case 'windMastery':
      return UITextureKeys.UIPluginWind;
    case 'auraRange':
      return UITextureKeys.UIPluginMagnet;
    default:
      return UITextureKeys.UIPluginG;
  }
};
