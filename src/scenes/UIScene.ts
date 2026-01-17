import Phaser from "phaser";
import { EVENTS, gameEvents } from "../config/Events";
import { GameConfig, SceneKeys } from "../config/GameConfig";
import { UITextureKeys } from "../config/AssetKeys";

export default class UIScene extends Phaser.Scene {
  private heightText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text; // ✅ 新增
  private gameTitleText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container; // 用于包裹结束面板
  private graphics!: Phaser.GameObjects.Graphics; // 用于画背景框
  private coldText!: Phaser.GameObjects.Text; // 新增：寒冷值文本
  private gameOverContainer!: Phaser.GameObjects.Container; // 结束面板容器

  constructor() {
    super(SceneKeys.UI);
  }

  create() {
    const { width } = this.scale;

    // --- 2. 初始状态：显示开始画面 ---
    // this.showStartScreen();
    this.setupEvents();
    this.createTopFrameUI(width);
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
        this.heightText.setText(height.toString() + "m");
      },
      this
    );

    // ✅ 监听分数更新
    gameEvents.on(
      EVENTS.UPDATE_SCORE,
      (score: number) => {
        console.log("Score updated:", score);
        this.scoreText.setText(score.toString());
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

  private createTopFrameUI(screenWidth: number) {
    // --- A. 容器位置 ---
    const containerX = screenWidth / 2;
    const containerY = 60; 
    
    this.container = this.add.container(containerX, containerY);

    // --- B. 3-Slice 核心逻辑 (高清适配版) ---
    
    // 1. 设定目标显示尺寸
    const displayWidth = screenWidth * 0.96; // 比如 680px
    const displayHeight = 80;                // 比如 80px

    // 2. 设定原图尺寸
    const sourceHeight = 480; // 原图高度
    
    // 3. 计算缩放比 ( 80 / 480 = 0.1666... )
    const scaleFactor = displayHeight / sourceHeight;

    // 4. 反推“逻辑宽度”
    // 我们需要创建一个巨大的 NineSlice，这样缩放后它才刚好等于 displayWidth
    const logicalWidth = displayWidth / scaleFactor; 

    // 5. 设定切片参数 (基于 2800x480 的原图像素)
    // 左右耳朵大概 230px，上下设为 0 (垂直方向允许均匀压缩)
    const leftOffset = 230;
    const rightOffset = 230;
    const topOffset = 0;    // ✅ 关键：设为0，变成水平 3-Slice
    const bottomOffset = 0; // ✅ 关键：设为0

    const frame = this.add.nineslice(
        0, 0, 
        UITextureKeys.UITopFrame, 
        undefined,
        logicalWidth, // 👈 使用反推出来的巨大宽度 (~4000px)
        sourceHeight, // 👈 使用原图高度 (480px)
        leftOffset, rightOffset, topOffset, bottomOffset
    );

    // 6. 应用缩放
    frame.setOrigin(0.5, 0.5);
    frame.setScale(scaleFactor); // 👈 这一步把 4000x480 的巨物缩成 680x80
    
    this.container.add(frame);

    // --- C. 图标与文本排布 ---
    // 统一配置：图标缩放比例 (原图~256px -> 目标~40px)
    const iconScale = 0.18; 
    const textStyle = { 
        fontSize: '20px', 
        color: '#ffffff', 
        fontStyle: 'bold', 
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3
    };

    // 1. 左侧：沙漏 (寒冷值/时间) - 对应 ui_hourglass_icon
    // 位置：容器左侧 35% 处
    const leftX = -displayWidth * 0.40;
    const iconHourglass = this.add.sprite(leftX, 0, UITextureKeys.UIHourglassIcon).setScale(iconScale);
    this.coldText = this.add.text(leftX + 25, 0, "0°C", { ...textStyle, color: '#00FFFF' }).setOrigin(0, 0.5);

    // 2. 中间：山峰 (高度) - 对应 ui_mountain_icon
    const midX = 0;
    // 图标往左偏移一点，让整体居中
    const iconMountain = this.add.sprite(midX - 40, 0, UITextureKeys.UIMountainIcon).setScale(iconScale);
    this.heightText = this.add.text(midX - 10, 0, "0m", textStyle).setOrigin(0, 0.5);

    // 3. 右侧：金币 (分数) - 对应 ui_coin_icon
    const rightX = displayWidth * 0.26;
    // 图标在数字左边
    const iconCoin = this.add.sprite(rightX, 0, UITextureKeys.UICoinIcon).setScale(iconScale);
    this.scoreText = this.add.text(rightX + 30, 0, "0", { ...textStyle, color: '#FFD700' }).setOrigin(0, 0.5);

    // --- D. 加入容器 ---
    this.container.add([
        iconHourglass, this.coldText,
        iconMountain, this.heightText,
        iconCoin, this.scoreText
    ]);
    
    this.container.setDepth(100);
    this.container.setScrollFactor(0);
  }
}
