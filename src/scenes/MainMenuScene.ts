import Phaser from 'phaser';
import DataManager from '../managers/DataManager';
import { AudioKeys, TextureKeys } from '../config/AssetKeys';
import { SceneKeys } from '../config/GameConfig';
import { KiteSkinIDs, KiteSkins, type KiteSkinID } from '../config/KiteSkinDef';
import AudioManager from '../managers/AudioManager';
import { KiteIds, type KiteId } from '../config/KiteConfig';
import { KiteConfigs } from '../config/KiteBuffConfig';

// 定义风筝选项结构：将皮肤ID映射到数据存档ID
interface KiteOption {
  skinId: KiteSkinID;      // 对应 KiteSkinDef (用于显示)
  kiteId: KiteId; // 对应 DataManager (用于存档和Buff)
}

export default class MainMenuScene extends Phaser.Scene {
  private currencyText!: Phaser.GameObjects.Text;
  private kitePreview!: Phaser.GameObjects.Image;
  private kiteNameText!: Phaser.GameObjects.Text;
  private kiteDescText!: Phaser.GameObjects.Text;
  
  // 选项配置列表
  private readonly kiteOptions: KiteOption[] = [
    { skinId: KiteSkinIDs.DefaultYellow, kiteId: KiteIds.Default },
    { skinId: KiteSkinIDs.Green, kiteId: KiteIds.Shu },
    { skinId: KiteSkinIDs.Blue, kiteId: KiteIds.Wei },
    { skinId: KiteSkinIDs.Red, kiteId: KiteIds.Wu },
  ];
  
  private currentOptionIndex: number = 0;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create() {
    const { width, height } = this.scale;
    DataManager.load(); 

    // 初始化当前索引 (根据存档)
    const savedkite = DataManager.data.selectedKite;
    this.currentOptionIndex = this.kiteOptions.findIndex(o => o.skinId === savedkite.skinId);
    if (this.currentOptionIndex === -1) this.currentOptionIndex = 0;

    // --- 背景 ---
    // 加个简单的深色渐变背景，避免纯黑太单调
    const bg = this.add.image(width / 2, height / 2, TextureKeys.BgMainMenu);
    bg.setScale(Math.max(width / bg.width, height / bg.height));

    // =========================================
    // 1. 顶部：材料/金币栏
    // =========================================
    const topBarY = 60;
    const coinIcon = this.add.image(40, topBarY, TextureKeys.Bamboo);
    coinIcon.setScale(0.05); // 根据你的图片大小适当缩放，假设原图较大
    this.currencyText = this.add.text(70, topBarY, `${DataManager.data.currency}`, {
      fontSize: '32px', 
      color: '#ffd700', // 改为白色
      fontStyle: 'bold', 
      fontFamily: 'monospace',
      stroke: '#000000', // 黑色描边
      strokeThickness: 4
    }).setOrigin(0, 0.5);

    // =========================================
    // 2. 次顶部：历史记录 (点击区域)
    // =========================================
    const historyY = 130;
    const historyContainer = this.add.container(width / 2, historyY);
    
    // 背景板
    const historyBg = this.add.rectangle(0, 0, 400, 50, 0x333344, 0.8).setStrokeStyle(1, 0x555566);
    // 文字
    const highScoreText = this.add.text(0, 0, `👑 最高记录: ${DataManager.data.highScore}m`, {
      fontSize: '24px', color: '#ffd700', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    
    historyContainer.add([historyBg, highScoreText]);
    
    // 交互
    historyBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', this.showHistoryDialog, this)
      .on('pointerover', () => historyBg.setStrokeStyle(2, 0xffaa00, 1)) // 悬停变橙色
      .on('pointerout', () => historyBg.setStrokeStyle(2, 0xffffff, 0.8));


    // =========================================
    // 3. 核心容器 (左：风筝选择 | 右：升级)
    // =========================================
    const mainContainerY = 200;
    const mainContainerHeight = 500;
    
    // --- 3A. 左侧：风筝选择器 (占宽 40%) ---
    const leftCenterX = width * 0.25;
    const leftCenterY = mainContainerY + mainContainerHeight / 2;

    // 风筝预览图 (带浮动动画)
    this.kitePreview = this.add.image(
      leftCenterX, leftCenterY - 20, TextureKeys.PlayerKite)
      .setScale(0.8);
    this.tweens.add({
      targets: this.kitePreview,
      y: '+=15',
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 左右箭头按钮
    const arrowY = leftCenterY + 100;
    const leftArrow = this.createArrowButton(leftCenterX - 60, arrowY, true, () => this.changeKite(-1));
    const rightArrow = this.createArrowButton(leftCenterX + 60, arrowY, false, () => this.changeKite(1));

    // 风筝名字
    this.kiteNameText = this.add.text(leftCenterX, leftCenterY - 120, '', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, fill: true }
    }).setOrigin(0.5);

    // --- 3B. 右侧：升级面板 (占宽 60%) ---
    const rightStartX = width * 0.55; 
    const rightStartY = mainContainerY + 50;
    const gapY = 140; // 间距

    this.createUpgradeItem(rightStartX, rightStartY, '轻盈度: 降低基础重力', 'lightness');
    this.createUpgradeItem(rightStartX, rightStartY + gapY, '风力精通: 提升吃符后的上升爆发力', 'windMastery');
    this.createUpgradeItem(rightStartX, rightStartY + gapY * 2, '磁力范围: 增加正面道具吸引范围', 'auraRange');


    // =========================================
    // 4. 描述文本区
    // =========================================
    const descY = mainContainerY + mainContainerHeight + 40;
    // 背景框
    const descBg = this.add.rectangle(width/2, descY, width * 0.9, 100, 0x000000, 0.7)
        .setStrokeStyle(1, 0xaaaaaa);
    this.kiteDescText = this.add.text(width/2, descY, '', {
      fontSize: '18px', color: '#eeeeee', align: 'center', wordWrap: { width: width * 0.85 }
    }).setOrigin(0.5);


    // =========================================
    // 5. 底部：开始游戏
    // =========================================
    const startBtnY = height - 120;
    const startBtn = this.add.container(width / 2, startBtnY);
    
    const btnBg = this.add.rectangle(0, 0, 240, 80, 0xffaa00) // 橙色
        .setStrokeStyle(4, 0xffffff); // 白边
    const btnText = this.add.text(0, 0, '开始游戏', { 
        fontSize: '40px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
        stroke: '#cc6600', strokeThickness: 2 // 深橙色描边
    }).setOrigin(0.5);
    
    startBtn.add([btnBg, btnText]);
    btnBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          AudioManager.playSfx(AudioKeys.SfxBtnClick);
            this.tweens.add({
                targets: startBtn, scaleX: 0.9, scaleY: 0.9, duration: 100, yoyo: true,
                onComplete: () => this.scene.start(SceneKeys.Game)
            });
        });

    // 初始化显示
    this.updateKiteDisplay();
  }

  // --- 逻辑：切换风筝 ---
  private changeKite(delta: number) {
    const len = this.kiteOptions.length;
    this.currentOptionIndex = (this.currentOptionIndex + delta + len) % len;
    
    // 立即保存选择
    const opt = this.kiteOptions[this.currentOptionIndex];
    DataManager.data.selectedKite = {
      skinId: opt.skinId,
      kiteId: opt.kiteId
    };
    DataManager.save();

    this.updateKiteDisplay();
  }

  // --- 逻辑：刷新风筝展示与描述 ---
  private updateKiteDisplay() {
    const opt = this.kiteOptions[this.currentOptionIndex];
    const skinConfig = KiteSkins[opt.skinId];
    
    // 1. 更新图片 (只显示 Body，因为 Menu 里不方便模拟 Rope)
    // 注意：skinConfig.bodyTexture 是 key
    this.kitePreview.setTexture(skinConfig.bodyTexture);
    this.kitePreview.setScale(skinConfig.scale * 1.5); // 适当缩放显示
    
    // 2. 更新名字
    this.kiteNameText.setText(KiteConfigs[opt.kiteId].name);

    // 3. 更新描述
    // 从 KiteConfigs 获取描述
    const desc = KiteConfigs[opt.kiteId].description;
    this.kiteDescText.setText(desc);
  }

  // --- 组件：箭头按钮 ---
  private createArrowButton(x: number, y: number, isLeft: boolean, onClick: () => void) {
    const arrow = this.add.text(x, y, isLeft ? '◀' : '▶', {
      fontSize: '40px', color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    arrow.on('pointerdown', () => {
      arrow.setScale(0.8);
      onClick();
      AudioManager.playSfx(AudioKeys.SfxBtnClick);
      this.time.delayedCall(100, () => arrow.setScale(1));
    });
    return arrow;
  }

  // --- 组件：升级条目 ---
  private createUpgradeItem(x: number, y: number, name: string, type: 'lightness' | 'windMastery' | 'auraRange') {
    const container = this.add.container(x, y);

    // 1. 标题 (左对齐)
    const label = this.add.text(0, 0, name, { 
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0, 1);
    
    // 2. 进度条背景 (左对齐)
    const barW = 220;
    const barH = 12;
    const barBg = this.add.rectangle(0, 20, barW, barH, 0x000000, 0.5).setOrigin(0, 0.5);
    
    // 3. 进度条前景 (左对齐)
    const currentLvl = DataManager.data.upgrades[type];
    const maxLvl = 10;
    const fillWidth = (currentLvl / maxLvl) * barW;
    const barFill = this.add.rectangle(0, 20, fillWidth, barH, 0xffaa00).setOrigin(0, 0.5);

    // 4. 升级按钮 (✅ 修改点 2：修复对齐)
    const cost = DataManager.getUpgradeCost(type);
    const isMax = currentLvl >= maxLvl;
    const btnColor = isMax ? 0x666666 : (DataManager.data.currency >= cost ? 0xffd700 : 0xcc4444);
    
    const btnW = 140;
    const btnH = 40;
    const btnY = 65;

    // 背景：设置 Origin 为 (0, 0.5)，这样 x=0 时左边缘就在容器的 x=0 线上
    const btnBg = this.add.rectangle(0, btnY, btnW, btnH, 0x222222)
        .setStrokeStyle(2, btnColor)
        .setOrigin(0, 0.5); 

    // 文字：需要放在按钮的中心。
    // 既然按钮左边缘在 0，宽度 140，那中心就在 70
    const btnTextStr = isMax ? "MAX" : `LVUP ${cost}`;
    const btnText = this.add.text(btnW / 2, btnY, btnTextStr, { 
        fontSize: '20px', color: isMax ? '#888' : '#fff', fontStyle: 'bold'
    }).setOrigin(0.5);

    // 交互
    if (!isMax) {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => {
            if (DataManager.upgrade(type)) {
                this.updateCurrencyUI();
                this.scene.restart(); 
                AudioManager.playSfx(AudioKeys.SfxBtnLevelUp);
            } else {
                this.tweens.add({ targets: btnBg, x: '+=5', duration: 50, yoyo: true, repeat: 3 });
            }
        });
    }

    container.add([label, barBg, barFill, btnBg, btnText]);
  }

  private updateCurrencyUI() {
      this.currencyText.setText(`${DataManager.data.currency}`);
  }

  private showHistoryDialog() {
    const { width, height } = this.scale;
    const container = this.add.container(0, 0).setDepth(200);

    AudioManager.playSfx(AudioKeys.SfxBtnClick);
    
    // 遮罩
    const bg = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.9)
        .setInteractive(); // 阻挡点击
    
    // 面板
    const panel = this.add.rectangle(width/2, height/2, 600, 900, 0x111111, 0.95)
        .setStrokeStyle(2, 0xffaa00);
    
    const title = this.add.text(width/2, height/2 - 400, '游玩记录', { 
        fontSize: '36px', color: '#fff', fontStyle: 'bold' 
    }).setOrigin(0.5);
    
    const closeBtn = this.add.text(width/2, height/2 + 400, '关闭', { 
        fontSize: '28px', color: '#ff5555' 
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => {
        AudioManager.playSfx(AudioKeys.SfxBtnClick);
        container.destroy();
    });

    container.add([bg, panel, title, closeBtn]);

    // 列表内容
    const startY = height/2 - 320;
    const history = DataManager.data.history.slice().reverse(); // 最新的在上面

    if (history.length === 0) {
        container.add(this.add.text(width/2, height/2, "还没有游玩记录", { fontSize: '24px', color: '#666' }).setOrigin(0.5));
    } else {
        history.forEach((record, index) => {
            if (index > 12) return;
            const y = startY + (index * 50);
            
            const dateStr = new Date(record.date).toLocaleDateString(undefined, {month:'short', day:'numeric'});
            
            const row = this.add.text(width/2 - 250, y, dateStr, { fontSize: '20px', color: '#aaaaaa' });
            const score = this.add.text(width/2, y, `${record.score} pts`, { fontSize: '20px', color: '#ffd700' }).setOrigin(0.5, 0);
            const heightTxt = this.add.text(width/2 + 250, y, `${Math.floor(record.height)}m`, { fontSize: '20px', color: '#00ffff' }).setOrigin(1, 0);
            
            const line = this.add.rectangle(width/2, y + 35, 520, 1, 0x333333);

            container.add([row, score, heightTxt, line]);
        });
    }
  }
}