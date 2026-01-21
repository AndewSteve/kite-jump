import Phaser from 'phaser';

export default class StartOverlay extends Phaser.GameObjects.Container {
  public onStartClick?: () => void;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    super(scene, 0, 0);

    // 1. 全屏透明点击区域 (Hit Area)
    const hitArea = scene.add.rectangle(width/2, height/2, width, height, 0x000000, 0.01)
        .setInteractive()
        .setDepth(2000);
    
    // 2. 提示文本
    const hintText = scene.add.text(width / 2, height * 0.7, "点击开始游戏", {
        fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(2000);

    // 3. 呼吸动画
    scene.tweens.add({
        targets: hintText,
        scale: 1.1,
        alpha: 0.8,
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    // 4. 手指图标
    const hand = scene.add.text(width/2, height * 0.7 + 50, "👆", { fontSize: '40px' })
      .setOrigin(0.5)
      .setDepth(2000);
    scene.tweens.add({
        targets: hand,
        y: '+=20',
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    this.add([hitArea, hintText, hand]);

    // 事件
    hitArea.once('pointerdown', () => {
        if (this.onStartClick) this.onStartClick();
        this.setVisible(false); // 点击后自动隐藏
    });

    this.setDepth(2000);
    scene.add.existing(this);
  }
  
  public show() {
      this.setVisible(true);
      // 重新绑定一次性事件可能比较麻烦，通常Start只用一次。
      // 如果需要复用，可以在这里重新 setInteractive
  }
}


