import Phaser from 'phaser';
import { EVENTS, gameEvents } from '../managers/events';
import { GameConfig } from '../config/consts';

export default class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private gameTitleText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container; // 用于包裹结束面板
  private graphics!: Phaser.GameObjects.Graphics;   // 用于画背景框

  constructor() {
    super('UIScene');
  }

  create() {
    const { width, height } = this.scale;

    // --- 1. 实时分数 (左上角) ---
    this.scoreText = this.add.text(20, 20, 'Height: 0m', {
      fontSize: '32px',
      color: '#000',
      fontStyle: 'bold'
    });

    // --- 2. 初始状态：显示开始画面 ---
    this.showStartScreen();

    // --- 3. 监听事件 ---
    // 监听游戏结束信号
    gameEvents.on(EVENTS.GAME_OVER, this.showGameOverScreen, this);
    // 监听分数更新
    gameEvents.on(EVENTS.UPDATE_SCORE, (score: number) => {
      this.scoreText.setText(`Height: ${score}m`);
    }, this);
  }

  // === 界面状态 1: 开始画面 ===
  private showStartScreen() {
    const { width, height } = this.scale;

    this.gameTitleText = this.add.text(width / 2, height / 3, 'KITE JUMP', {
      fontSize: '64px',
      color: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 创建一个纯代码绘制的“按钮”
    const startBtn = this.createButton(width / 2, height / 2, 'TAP TO START', () => {
      // 隐藏标题和按钮
      this.gameTitleText.setVisible(false);
      startBtn.setVisible(false);
      
      // 通知游戏开始
      gameEvents.emit(EVENTS.GAME_START);
    });
  }

  // === 界面状态 2: 游戏结束弹窗 ===
  private showGameOverScreen(finalScore: number) {
    const { width, height } = this.scale;

    // 创建容器方便统一管理
    this.container = this.add.container(0, 0);

    // 1. 半透明黑色遮罩 (全屏)
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, width, height);
    // 拦截点击，防止穿透到游戏层
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    // 2. 弹窗背景板 (圆角矩形)
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 20);
    
    // 3. 文本信息
    const title = this.add.text(width / 2, height / 2 - 100, 'GAME OVER', {
      fontSize: '48px',
      color: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const score = this.add.text(width / 2, height / 2 - 20, `Score: ${finalScore}m`, {
      fontSize: '32px',
      color: '#666'
    }).setOrigin(0.5);

    // 4. 重开按钮 (添加到容器中需要特殊处理交互，这里简单起见直接add到场景)
    // 注意：为了简单，按钮我们单独放，不放进container，因为container内的交互有时候有坑
    const restartBtn = this.createButton(width / 2, height / 2 + 80, 'TRY AGAIN', () => {
      // 清理 UI
      this.container.destroy();
      overlay.destroy();
      restartBtn.destroy();
      
      // 重置分数显示
      this.scoreText.setText('Height: 0m');
      
      // 发送重启信号
      gameEvents.emit(EVENTS.GAME_RESTART);
    });

    // 将非按钮元素加入容器
    this.container.add([panel, title, score]);
  }

  // === 工具函数：绘制按钮 ===
  private createButton(x: number, y: number, text: string, onClick: () => void) {
    const button = this.add.container(x, y);

    // 按钮背景
    const bg = this.add.graphics();
    bg.fillStyle(0x4a90e2, 1); // 蓝色
    bg.fillRoundedRect(-100, -30, 200, 60, 15);
    
    // 按钮文字
    const label = this.add.text(0, 0, text, {
      fontSize: '24px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.add([bg, label]);

    // 设置交互区域 (必须手动设置，因为Graphics默认没有大小)
    button.setSize(200, 60);
    button.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // 点击时的缩放效果
        this.tweens.add({
          targets: button,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 100,
          yoyo: true,
          onComplete: onClick
        });
      });

    return button;
  }
}