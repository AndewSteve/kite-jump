import Phaser from 'phaser';

export default class UIButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private textObj: Phaser.GameObjects.Text;
  private onClick: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, color: number = 0x444444) {
    super(scene, x, y);
    this.onClick = onClick;

    // 背景
    this.bg = scene.add.rectangle(0, 0, 200, 60, color)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    // 文本
    this.textObj = scene.add.text(0, 0, text, {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add([this.bg, this.textObj]);

    // 交互逻辑
    this.bg.on('pointerdown', this.handleDown, this);
    this.bg.on('pointerover', () => this.bg.setFillStyle(color + 0x222222));
    this.bg.on('pointerout', () => this.bg.setFillStyle(color));
    
    scene.add.existing(this);
  }

  private handleDown() {
    this.scene.tweens.add({
      targets: this,
      scale: 0.95,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        if (this.onClick) this.onClick();
      }
    });
  }
}