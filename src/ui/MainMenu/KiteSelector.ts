import Phaser from 'phaser';
import { AudioKeys, TextureKeys } from '../../config/AssetKeys';
import AudioManager from '../../managers/AudioManager';

export interface KiteSelectorUI {
  kitePreview: Phaser.GameObjects.Image;
  kiteNameText: Phaser.GameObjects.Text;
  kiteLockIcon: Phaser.GameObjects.Text;
}

export const createKiteSelector = (
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  onPrev: () => void,
  onNext: () => void
): KiteSelectorUI => {
  const kitePreview = scene.add.image(
    centerX,
    centerY - 20,
    TextureKeys.PlayerKite
  ).setScale(0.8);

  scene.tweens.add({
    targets: kitePreview,
    y: '+=15',
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const arrowY = centerY + 100;
  createArrowButton(scene, centerX - 60, arrowY, true, onPrev);
  createArrowButton(scene, centerX + 60, arrowY, false, onNext);

  const kiteNameText = scene.add.text(centerX, centerY - 120, '', {
    fontSize: '22px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4,
    shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, fill: true }
  }).setOrigin(0.5);

  const kiteLockIcon = scene.add.text(centerX, centerY - 20, '🔒', {
    fontSize: '64px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5).setVisible(false);

  return { kitePreview, kiteNameText, kiteLockIcon };
};

const createArrowButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  isLeft: boolean,
  onClick: () => void
) => {
  const arrow = scene.add.text(x, y, isLeft ? '◀' : '▶', {
    fontSize: '40px',
    color: '#ffffff'
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  arrow.on('pointerdown', () => {
    arrow.setScale(0.8);
    onClick();
    AudioManager.playSfx(AudioKeys.SfxBtnClick);
    scene.time.delayedCall(100, () => arrow.setScale(1));
  });
};
