import Phaser from 'phaser';
import UIButton from './UIButton';

export default class GameOverMenu extends Phaser.GameObjects.Container {
  public onRestart?: () => void;
  public onQuit?: () => void;

  private scoreText: Phaser.GameObjects.Text;
  private heightText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    super(scene, 0, 0);
    this.setDepth(200);
    this.setVisible(false);

    // 1. 遮罩
    const overlay = scene.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85).setInteractive();
    
    // 2. 标题
    const title = scene.add.text(width/2, height/2 - 200, "FLIGHT ENDED", {
        fontSize: '40px', color: '#ff4444', fontStyle: 'bold', stroke: '#fff', strokeThickness: 2
    }).setOrigin(0.5);

    // 3. 动态文本
    this.scoreText = scene.add.text(width/2, height/2 - 120, "Score: 0", { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
    this.heightText = scene.add.text(width/2, height/2 - 80, "Height: 0m", { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5);

    this.add([overlay, title, this.scoreText, this.heightText]);

    // 4. 按钮
    const btnRestart = new UIButton(scene, width/2, height/2 + 20, "TRY AGAIN", () => {
        if (this.onRestart) this.onRestart();
    });
    const btnMenu = new UIButton(scene, width/2, height/2 + 100, "MAIN MENU", () => {
        if (this.onQuit) this.onQuit();
    }, 0x666666);

    this.add([btnRestart, btnMenu]);
    scene.add.existing(this);
  }

  public show(score: number, height: number) {
    this.scoreText.setText(`Score: ${Math.floor(score)}`);
    this.heightText.setText(`Max Height: ${Math.floor(height)}m`);

    this.setVisible(true);
    this.setAlpha(0);
    
    this.scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: 500
    });
  }
  
  public hide() {
      this.setVisible(false);
  }
}