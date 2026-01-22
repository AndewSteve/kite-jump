import Phaser from 'phaser';
import DataManager from '../managers/DataManager';
import { TextureKeys } from '../config/AssetKeys';
import { SceneKeys } from '../config/GameConfig';
import { KiteSkinIDs, KiteSkins, type KiteSkinID } from '../config/KiteSkinDef';
import { KiteIds, type KiteId } from '../config/KiteConfig';
import { KiteConfigs } from '../config/KiteBuffConfig';
import { createTopBar } from '../ui/MainMenu/TopBar';
import { createHistoryBar } from '../ui/MainMenu/HistoryBar';
import { createEncyclopediaBar } from '../ui/MainMenu/EncyclopediaBar';
import { createKiteSelector } from '../ui/MainMenu/KiteSelector';
import { createUpgradePanel, UPGRADE_BAR_WIDTH } from '../ui/MainMenu/UpgradePanel';
import { createDescriptionPanel } from '../ui/MainMenu/DescriptionPanel';
import { createStartButton, type StartButtonUI } from '../ui/MainMenu/StartButton';
import { showHistoryDialog } from '../ui/MainMenu/HistoryDialog';
import { showEncyclopediaDialog } from '../ui/MainMenu/EncyclopediaDialog';

// 定义风筝选项结构：将皮肤ID映射到数据存档ID
interface KiteOption {
  skinId: KiteSkinID;      // 对应 KiteSkinDef (用于显示)
  kiteId: KiteId; // 对应 DataManager (用于存档和Buff)
}

export default class MainMenuScene extends Phaser.Scene {
  private currencyText!: Phaser.GameObjects.Text;
  private kitePreview!: Phaser.GameObjects.Image;
  private kiteNameText!: Phaser.GameObjects.Text;
  private kiteLockIcon!: Phaser.GameObjects.Text;
  private kiteTitleText!: Phaser.GameObjects.Text;
  private kiteDescText!: Phaser.GameObjects.Text;
  private startButton!: StartButtonUI;
  private unlockButton!: Phaser.GameObjects.Container;
  private unlockButtonText!: Phaser.GameObjects.Text;
  private readonly upgradePanelRightMargin = 10;
  private readonly upgradeIconWidth = 64;
  
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
    this.currencyText = createTopBar(this, topBarY).currencyText;

    // =========================================
    // 2. 次顶部：历史记录 (点击区域)
    // =========================================
    const historyY = 130;
    createHistoryBar(this, width / 2, historyY, () => showHistoryDialog(this));

    // =========================================
    // 2.5 图鉴入口
    // =========================================
    const encyclopediaY = 185;
    createEncyclopediaBar(this, width / 2, encyclopediaY, () => showEncyclopediaDialog(this));

    // =========================================
    // 3. 核心容器 (左：风筝选择 | 右：升级)
    // =========================================
    const mainContainerY = 230;
    const mainContainerHeight = 500;
    
    // --- 3A. 左侧：风筝选择器 (占宽 40%) ---
    const leftCenterX = width * 0.25;
    const leftCenterY = mainContainerY + mainContainerHeight / 2;

    const kiteSelector = createKiteSelector(
      this,
      leftCenterX,
      leftCenterY,
      () => this.changeKite(-1),
      () => this.changeKite(1)
    );
    this.kitePreview = kiteSelector.kitePreview;
    this.kiteNameText = kiteSelector.kiteNameText;
    this.kiteLockIcon = kiteSelector.kiteLockIcon;

    // --- 3B. 右侧：升级面板 (占宽 60%) ---
    const rightStartX = width - this.upgradePanelRightMargin - UPGRADE_BAR_WIDTH;
    const rightStartY = mainContainerY + 50;
    const gapY = 140; // 间距

    createUpgradePanel(this, rightStartX, rightStartY, gapY, () => {
      this.updateCurrencyUI();
      this.scene.restart();
    }, this.upgradeIconWidth);


    // =========================================
    // 4. 描述文本区
    // =========================================
    const descY = mainContainerY + mainContainerHeight + 40;
    const descPanel = createDescriptionPanel(this, width / 2, descY, width);
    this.kiteTitleText = descPanel.titleText;
    this.kiteDescText = descPanel.descText;


    // =========================================
    // 5. 底部：开始游戏
    // =========================================
    const startBtnY = height - 120;
    this.startButton = createStartButton(this, width / 2, startBtnY, () => {
      if (!this.isCurrentKiteUnlocked()) return;
      this.scene.start(SceneKeys.Game);
    });

    this.unlockButton = this.createUnlockButton(width / 2, startBtnY + 70);

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
    const isUnlocked = DataManager.isKiteUnlocked(opt.kiteId);
    
    // 1. 更新图片 (只显示 Body，因为 Menu 里不方便模拟 Rope)
    // 注意：skinConfig.bodyTexture 是 key
    this.kitePreview.setTexture(skinConfig.bodyTexture);
    this.kitePreview.setScale(skinConfig.scale * 1.5); // 适当缩放显示
    if (isUnlocked) {
      this.kitePreview.clearTint();
      this.kiteLockIcon.setVisible(false);
    } else {
      this.kitePreview.setTint(0x666666);
      this.kiteLockIcon.setVisible(true);
    }
    
    // 2. 更新名字
    this.kiteNameText.setText(KiteConfigs[opt.kiteId].name);

    // 3. 更新描述
    // 从 KiteConfigs 获取描述
    const config = KiteConfigs[opt.kiteId];
    this.kiteTitleText.setText(config.title);
    this.kiteDescText.setText(config.description);

    this.startButton.setEnabled(isUnlocked);
    this.updateUnlockButton(isUnlocked);
  }

  private updateCurrencyUI() {
      this.currencyText.setText(`${DataManager.data.currency}`);
  }

  private isCurrentKiteUnlocked(): boolean {
    const opt = this.kiteOptions[this.currentOptionIndex];
    return DataManager.isKiteUnlocked(opt.kiteId);
  }

  private createUnlockButton(centerX: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(centerX, y);
    const bg = this.add.rectangle(0, 0, 200, 60, 0x555555)
      .setStrokeStyle(3, 0xffffff);
    this.unlockButtonText = this.add.text(0, 0, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    container.add([bg, this.unlockButtonText]);

    bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      const opt = this.kiteOptions[this.currentOptionIndex];
      if (DataManager.unlockKite(opt.kiteId)) {
        this.updateCurrencyUI();
        this.updateKiteDisplay();
      }
    });

    return container;
  }

  private updateUnlockButton(isUnlocked: boolean) {
    if (isUnlocked) {
      this.unlockButton.setVisible(false);
      return;
    }

    const cost = DataManager.getUnlockCost();
    this.unlockButtonText.setText(`解锁 ${cost}`);
    this.unlockButton.setVisible(true);
  }
}
