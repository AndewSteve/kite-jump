import Phaser from 'phaser';

export interface DescriptionPanelUI {
  titleText: Phaser.GameObjects.Text;
  descText: Phaser.GameObjects.Text;
}

export const createDescriptionPanel = (
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  width: number
): DescriptionPanelUI => {
  scene.add.rectangle(centerX, y, width * 0.9, 100, 0x000000, 0.7)
    .setStrokeStyle(1, 0xaaaaaa);

  const titleText = scene.add.text(centerX, y - 12, '', {
    fontSize: '18px',
    color: '#eeeeee',
    align: 'center',
    wordWrap: { width: width * 0.85 }
  }).setOrigin(0.5);

  const descText = scene.add.text(centerX, y + 12, '', {
    fontSize: '14px',
    color: '#eeeeee',
    align: 'center',
    wordWrap: { width: width * 0.85 }
  }).setOrigin(0.5);

  return { titleText, descText };
};
