import Phaser from 'phaser';
import UIButton from './UIButton';

export default class PauseMenu extends Phaser.GameObjects.Container {
  public onResume?: () => void;
  public onRestart?: () => void;
  public onQuit?: () => void;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    super(scene, 0, 0);
    this.setDepth(100);
    this.setVisible(false);

    // 1. 遮罩
    const overlay = scene.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7)
        .setInteractive();

    // 2. 面板
    const panel = scene.add.rectangle(width/2, height/2, 400, 350, 0x222222)
        .setStrokeStyle(2, 0xffffff);

    // 3. 标题
    const title = scene.add.text(width/2, height/2 - 120, "PAUSED", {
        fontSize: '40px', color: '#ffd700', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add([overlay, panel, title]);

    // 4. 按钮组
    const btnResume = new UIButton(scene, width/2, height/2 - 30, "RESUME", () => this.handleResume());
    const btnRestart = new UIButton(scene, width/2, height/2 + 50, "RESTART", () => this.handleRestart());
    const btnMenu = new UIButton(scene, width/2, height/2 + 130, "MAIN MENU", () => this.handleQuit(), 0xaa3333);

    this.add([btnResume, btnRestart, btnMenu]);
    scene.add.existing(this);
  }

  private handleResume() {
    this.setVisible(false);
    if (this.onResume) this.onResume();
  }

  private handleRestart() {
    this.setVisible(false);
    if (this.onRestart) this.onRestart();
  }

  private handleQuit() {
    if (this.onQuit) this.onQuit();
  }

  public show() {
      this.setVisible(true);
  }
  
  public hide() {
      this.setVisible(false);
  }
}