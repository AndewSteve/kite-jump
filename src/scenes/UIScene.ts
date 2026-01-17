import Phaser from "phaser";
import { EVENTS, gameEvents } from "../config/Events";
import { GameConfig } from "../config/GameConfig";

export default class UIScene extends Phaser.Scene {
  private heightText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text; // ✅ 新增
  private gameTitleText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container; // 用于包裹结束面板
  private graphics!: Phaser.GameObjects.Graphics; // 用于画背景框

  constructor() {
    super("UIScene");
  }

  create() {
    const { width } = this.scale;

    // --- 1. 实时分数 (左上角) ---
    this.heightText = this.add.text(20, 20, "Height: 0m", {
      fontSize: "32px",
      color: "#000",
      fontStyle: "bold",
    });
    // 2. ✅ 实时分数 (右上角)
    this.scoreText = this.add
      .text(width - 20, 20, "Score: 0", {
        fontSize: "32px",
        color: "#000",
        fontStyle: "bold",
      })
      .setOrigin(1, 0); // 右对齐

    // --- 2. 初始状态：显示开始画面 ---
    this.showStartScreen();
    this.setupEvents();
  }

  private setupEvents() {
    gameEvents.off(EVENTS.SHOW_GAME_OVER);
    gameEvents.off(EVENTS.UPDATE_HEIGHT);
    gameEvents.off(EVENTS.UPDATE_SCORE); // ✅

    // ✅ 修复：接收一个 data 对象
    gameEvents.on(
      EVENTS.SHOW_GAME_OVER,
      (data: { finalHeight: number; finalScore: number; cause: string }) => {
        // 从对象中取出数据传给显示函数
        this.showGameOverScreen(data.finalHeight, data.finalScore, data.cause);
      },
      this
    );

    // 监听高度更新
    gameEvents.on(
      EVENTS.UPDATE_HEIGHT,
      (height: number) => {
        this.heightText.setText(`Height: ${height}m`);
      },
      this
    );

    // ✅ 监听分数更新
    gameEvents.on(
      EVENTS.UPDATE_SCORE,
      (score: number) => {
        this.scoreText.setText(`Score: ${score}`);
      },
      this
    );
  }

  // === 界面状态 1: 开始画面 ===
  private showStartScreen() {
    const { width, height } = this.scale;

    this.gameTitleText = this.add
      .text(width / 2, height / 3, "KITE JUMP", {
        fontSize: "64px",
        color: "#000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 创建一个纯代码绘制的“按钮”
    const startBtn = this.createButton(
      width / 2,
      height / 2,
      "TAP TO START",
      () => {
        // 隐藏标题和按钮
        this.gameTitleText.setVisible(false);
        startBtn.setVisible(false);

        // 通知游戏开始
        gameEvents.emit(EVENTS.GAME_START);
      }
    );
  }

  // === 界面状态 2: 游戏结束弹窗 ===
  private showGameOverScreen(
    finalHeight: number,
    finalScore: number,
    cause: string
  ) {
    const { width, height } = this.scale;

    // 创建容器方便统一管理
    this.container = this.add.container(0, 0);

    // 1. 半透明黑色遮罩 (全屏)
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, width, height);
    // 拦截点击，防止穿透到游戏层
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    // 2. 弹窗背景板 (圆角矩形)
    const panel = this.add.graphics();
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 20);

    // 3. 文本信息优化
    const title = this.add.text(width / 2, height / 2 - 100, 'GAME OVER', {
      fontSize: '48px', color: '#000', fontStyle: 'bold'
    }).setOrigin(0.5);

    // ✅ 建议：同时显示高度和分数，且死因不同可能有不同的提示
    const heightText = this.add.text(width / 2, height / 2 - 30, `Height: ${finalHeight}m`, {
      fontSize: '32px', color: '#333'
    }).setOrigin(0.5);

    // 注意：之前你写 score 后面带 'm'，通常 score 是积分，height 才是米
    const scoreText = this.add.text(width / 2, height / 2 + 10, `Score: ${finalScore}`, {
      fontSize: '28px', color: '#666'
    }).setOrigin(0.5);
    
    // (可选) 显示死因
    const causeText = this.add.text(width / 2, height / 2 + 130, `Cause: ${cause}`, {
       fontSize: '16px', color: '#999'
    }).setOrigin(0.5);

    // 4. 重开按钮 (添加到容器中需要特殊处理交互，这里简单起见直接add到场景)
    // 注意：为了简单，按钮我们单独放，不放进container，因为container内的交互有时候有坑
    const restartBtn = this.createButton(
      width / 2,
      height / 2 + 80,
      "TRY AGAIN",
      () => {
        // 清理 UI
        this.container.destroy();
        overlay.destroy();
        restartBtn.destroy();

        // 重置分数显示
        this.heightText.setText("Height: 0m");

        // 发送重启信号
        gameEvents.emit(EVENTS.GAME_RESTART);
      }
    );

    // 将非按钮元素加入容器
    this.container.add([panel, title, heightText, scoreText, causeText]);
  }

  // === 工具函数：绘制按钮 ===
  private createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void
  ) {
    const button = this.add.container(x, y);

    // 按钮背景
    const bg = this.add.graphics();
    bg.fillStyle(0x4a90e2, 1); // 蓝色
    bg.fillRoundedRect(-100, -30, 200, 60, 15);

    // 按钮文字
    const label = this.add
      .text(0, 0, text, {
        fontSize: "24px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    button.add([bg, label]);

    // 设置交互区域 (必须手动设置，因为Graphics默认没有大小)
    button.setSize(200, 60);
    button.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      // 点击时的缩放效果
      this.tweens.add({
        targets: button,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        onComplete: onClick,
      });
    });

    return button;
  }
}
