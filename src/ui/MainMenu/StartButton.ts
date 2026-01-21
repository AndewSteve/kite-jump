import Phaser from 'phaser';
import { AudioKeys } from '../../config/AssetKeys';
import AudioManager from '../../managers/AudioManager';

export interface StartButtonUI {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
}

export const createStartButton = (
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  onStart: () => void
): StartButtonUI => {
  const startBtn = scene.add.container(centerX, y);
  let isEnabled = true;

  const btnBg = scene.add.rectangle(0, 0, 240, 80, 0xffaa00)
    .setStrokeStyle(4, 0xffffff);
  const btnText = scene.add.text(0, 0, '开始游戏', {
    fontSize: '40px',
    color: '#ffffff',
    fontStyle: 'bold',
    fontFamily: 'Arial',
    stroke: '#cc6600',
    strokeThickness: 2
  }).setOrigin(0.5);

  startBtn.add([btnBg, btnText]);
  btnBg.setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      if (!isEnabled) return;
      AudioManager.playSfx(AudioKeys.SfxBtnClick);
      scene.tweens.add({
        targets: startBtn,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        onComplete: onStart
      });
    });

  const setEnabled = (enabled: boolean) => {
    isEnabled = enabled;
    if (enabled) {
      btnBg.setInteractive({ useHandCursor: true });
      startBtn.setAlpha(1);
    } else {
      btnBg.disableInteractive();
      startBtn.setAlpha(0.6);
    }
  };

  return { container: startBtn, setEnabled };
};
