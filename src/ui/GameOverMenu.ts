import Phaser from 'phaser';
import UIButton from './UIButton';

export default class GameOverMenu extends Phaser.GameObjects.Container {
  public onRestart?: () => void;
  public onQuit?: () => void;

  private causeText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private currencyText: Phaser.GameObjects.Text;
  private heightText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;


  constructor(scene: Phaser.Scene, width: number, height: number) {
    super(scene, 0, 0);
    this.setDepth(200);
    this.setVisible(false);

    // 1. 遮罩
    const overlay = scene.add.rectangle(width/2, height/2, width, height, 0x000000, 0.85).setInteractive();
    
    // 2. 标题
    const title = scene.add.text(width/2, height/2 - 200, "游戏结束", {
        fontSize: '40px', color: '#ff4444', fontStyle: 'bold', stroke: '#fff', strokeThickness: 2
    }).setOrigin(0.5);

    // 3. 动态文本
    this.causeText = scene.add.text(width/2, height/2 - 160, "Cause: Unknown", { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    this.scoreText = scene.add.text(width/2, height/2 - 120, "Score: 0", { fontSize: '28px', color: '#fff' }).setOrigin(0.5);
    this.heightText = scene.add.text(width/2, height/2 - 80, "Height: 0m", { fontSize: '28px', color: '#00ffff' }).setOrigin(0.5);
    this.currencyText = scene.add.text(width/2, height/2 - 40, "Currency: 0", { fontSize: '28px', color: '#ffcc00' }).setOrigin(0.5);
    this.timeText = scene.add.text(width/2, height/2, "Time: 0s", { fontSize: '28px', color: '#ff9900' }).setOrigin(0.5);
    this.add([overlay, title, this.causeText, this.scoreText, this.heightText, this.currencyText, this.timeText]);

    // 4. 按钮
    const btnRestart = new UIButton(scene, width/2, height/2 + 60, "TRY AGAIN", () => {
        if (this.onRestart) this.onRestart();
    });
    const btnMenu = new UIButton(scene, width/2, height/2 + 140, "MAIN MENU", () => {
        if (this.onQuit) this.onQuit();
    }, 0x666666);

    this.add([btnRestart, btnMenu]);
    scene.add.existing(this);
  }

  public show(
      finalScore: number,
      finalCurrency: number,
      finalHeight: number,
      finalTime: string,
      cause: string) {
    this.causeText.setText(`游戏结束于: ${cause}`);
    this.scoreText.setText(`分数: ${Math.floor(finalScore)}`);
    this.currencyText.setText(`货币: ${Math.floor(finalCurrency)}`);
    this.heightText.setText(`最大高度: ${Math.floor(finalHeight)}m`);
    this.timeText.setText(`时间: ${finalTime}`);
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