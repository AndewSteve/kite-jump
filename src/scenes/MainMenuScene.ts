import Phaser from 'phaser';
import DataManager from '../managers/DataManager';
import { AssetManifest } from '../config/AssetManifest';
import { TextureKeys } from '../config/AssetKeys';

export default class MainMenuScene extends Phaser.Scene {
  private currencyText!: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenuScene');
  }

  preload() {
    AssetManifest.forEach(asset => {
      if (asset.type === 'image') {
        this.load.image(asset.key, asset.path);
      } else if (asset.type === 'spritesheet' && asset.frameConfig) {
        this.load.spritesheet(asset.key, asset.path, asset.frameConfig);
      }
    });
  }

  create() {
    const { width, height } = this.scale;
    DataManager.load(); // 确保数据已加载

    // --- 1. 顶部：金币栏 ---
    const topBar = this.add.container(0, 0);
    const coinIcon = this.add.circle(30, 30, 15, 0xffd700); // 假装是金币图标
    this.currencyText = this.add.text(55, 15, `${DataManager.data.currency}`, {
      fontSize: '28px', color: '#ffd700', fontStyle: 'bold'
    });
    topBar.add([coinIcon, this.currencyText]);

    // --- 2. 顶部下方：历史成绩 ---
    const historyBg = this.add.graphics();
    historyBg.fillStyle(0x333333, 0.8);
    historyBg.fillRoundedRect(width / 2 - 150, 70, 300, 50, 10);
    // 设为可点击
    historyBg.setInteractive(new Phaser.Geom.Rectangle(width / 2 - 150, 70, 300, 50), Phaser.Geom.Rectangle.Contains);
    historyBg.on('pointerdown', this.showHistoryDialog, this);

    const highScoreText = this.add.text(width / 2, 95, `Best Score: ${DataManager.data.highScore}`, {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);

    // --- 3. 中间容器 (风筝展示 + 升级) ---
    // 容器区域大致从 Y=150 到 Y=Height-150
    const contentY = 150;
    const contentH = height - 300;

    // A. 左侧 2/3：风筝展示
    // 这里放个大大的风筝图，稍微带点浮动动画
    const kitePreview = this.add.image(width * 0.33, contentY + contentH / 2, TextureKeys.PlayerKite);
    kitePreview.setScale(2);
    this.tweens.add({
        targets: kitePreview,
        y: '+=20',
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // B. 右侧 1/3：升级面板
    const upgradePanelX = width * 0.66;
    const upgradeStartY = contentY + 50;
    
    // 创建三个升级条目
    this.createUpgradeItem(upgradePanelX, upgradeStartY, 'Lightness', 'lightness');
    this.createUpgradeItem(upgradePanelX, upgradeStartY + 180, 'Wind Power', 'windMastery');
    this.createUpgradeItem(upgradePanelX, upgradeStartY + 360, 'Magnet', 'auraRange');


    // --- 4. 底部：开始按钮 ---
    const startBtn = this.add.container(width / 2, height - 100);
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x44ff44, 1);
    btnBg.fillRoundedRect(-100, -40, 200, 80, 20);
    const btnText = this.add.text(0, 0, 'START', { fontSize: '40px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5);
    
    startBtn.add([btnBg, btnText]);
    const hitArea = new Phaser.Geom.Rectangle(-100, -40, 200, 80);
    startBtn.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    this.input.enableDebug(startBtn);
    
    // 交互逻辑
    startBtn.on('pointerdown', () => {
      console.log('Start Game!');
        this.tweens.add({
            targets: startBtn, scaleX: 0.9, scaleY: 0.9, duration: 100, yoyo: true,
            onComplete: () => {
                this.scene.start('GameScene'); // 进入游戏
            }
        });
    });
  }

  // 辅助方法：创建单个升级项 (Label + Level Bar + Button)
  private createUpgradeItem(x: number, y: number, name: string, type: 'lightness' | 'windMastery' | 'auraRange') {
    const container = this.add.container(x, y);

    // 1. 标题
    const label = this.add.text(0, 0, name, { fontSize: '20px', color: '#fff' }).setOrigin(0.5, 1);
    
    // 2. 进度条背景
    const barBg = this.add.rectangle(0, 20, 180, 10, 0x555555);
    // 3. 进度条前景 (根据当前等级计算宽度)
    const currentLvl = DataManager.data.upgrades[type];
    const maxLvl = 10; // 假设满级10级
    const fillWidth = (currentLvl / maxLvl) * 180;
    const barFill = this.add.rectangle(-90, 20, fillWidth, 10, 0x00ffff).setOrigin(0, 0.5);

    // 4. 升级按钮
    const cost = DataManager.getUpgradeCost(type);
    const btnBg = this.add.rectangle(0, 60, 120, 40, 0x1a1a1a).setStrokeStyle(2, 0xffffff);
    const btnText = this.add.text(0, 60, `LV.${currentLvl}\n$${cost}`, { 
        fontSize: '14px', color: '#ffd700', align: 'center' 
    }).setOrigin(0.5);

    // 交互
    btnBg.setInteractive();
    btnBg.on('pointerdown', () => {
        if (currentLvl >= maxLvl) return;

        if (DataManager.upgrade(type)) {
            // 升级成功：刷新UI
            this.updateCurrencyUI();
            // 简单粗暴重绘当前场景 (或者你可以把上面的UI元素存起来单独更新)
            this.scene.restart(); 
        } else {
            // 钱不够：按钮抖动
            this.tweens.add({ targets: btnBg, x: '+=5', duration: 50, yoyo: true, repeat: 3 });
        }
    });

    container.add([label, barBg, barFill, btnBg, btnText]);
  }

  private updateCurrencyUI() {
      this.currencyText.setText(`${DataManager.data.currency}`);
  }

  // 弹出历史记录对话框
  private showHistoryDialog() {
    // 简单的全屏遮罩 + 列表
    const { width, height } = this.scale;
    const container = this.add.container(0, 0).setDepth(100);
    
    const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8).setInteractive();
    const panel = this.add.rectangle(width/2, height/2, 500, 800, 0x222222).setStrokeStyle(2, 0x666666);
    
    const title = this.add.text(width/2, height/2 - 350, 'HISTORY', { fontSize: '32px' }).setOrigin(0.5);
    const closeBtn = this.add.text(width/2, height/2 + 350, '[ CLOSE ]', { fontSize: '24px' }).setOrigin(0.5).setInteractive();
    
    closeBtn.on('pointerdown', () => container.destroy());

    container.add([bg, panel, title, closeBtn]);

    // 渲染列表
    DataManager.data.history.forEach((record, index) => {
        const y = height/2 - 300 + (index * 40);
        const text = this.add.text(width/2 - 200, y, 
            `${record.date} - Score: ${record.score} - ${record.height}m`, 
            { fontSize: '18px', color: '#aaa' }
        );
        container.add(text);
    });
  }
}