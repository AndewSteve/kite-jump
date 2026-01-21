import Phaser from 'phaser';
import DataManager from '../../managers/DataManager';
import { TextureKeys } from '../../config/AssetKeys';

export interface TopBarUI {
  currencyText: Phaser.GameObjects.Text;
}

export const createTopBar = (scene: Phaser.Scene, y: number): TopBarUI => {
  const coinIcon = scene.add.image(40, y, TextureKeys.Bamboo);
  coinIcon.setScale(0.05);

  const currencyText = scene.add.text(70, y, `${DataManager.data.currency}`, {
    fontSize: '32px',
    color: '#ffd700',
    fontStyle: 'bold',
    fontFamily: 'monospace',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0, 0.5);

  return { currencyText };
};
