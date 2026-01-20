import Phaser from "phaser";
import { EVENTS, gameEvents } from "../config/Events";
import { SceneKeys } from "../config/GameConfig";
import StartOverlay from "../ui/StartOverlay";
import PauseMenu from "../ui/PauseMenu";
import GameOverMenu from "../ui/GameOverMenu";
import { SciFiGauge } from "../ui/SciFiGauge";
import InfoBar from "../ui/InfoBar";

export default class UIScene extends Phaser.Scene {
  // 组件引用
  private startOverlay!: StartOverlay;
  private pauseMenu!: PauseMenu;
  private gameOverMenu!: GameOverMenu;

  private gauge!: SciFiGauge;
  private infoBar!: InfoBar;

  constructor() {
    super(SceneKeys.UI);
  }

  create() {
    const { width, height } = this.scale;

    // 1. 初始化所有 UI 组件
    this.startOverlay = new StartOverlay(this, width, height);
    this.pauseMenu = new PauseMenu(this, width, height);
    this.gameOverMenu = new GameOverMenu(this, width, height);

        // 2. 实例化组件，放置在屏幕右下角
        this.gauge = new SciFiGauge(this, width-50, 400, {
            // 根据你的图，能量条应该在背景的上半部分
            // 假设往上移 50px
            energyBarOffset: { x: 20, y: -25 }, 
            
            // 根据你的图，表盘在背景的最下方
            // 假设往下移 120px
            pointerPosOffset: { x: 27, y: 150 },

            // 【关键】指针的旋转中心
            // 看着你的图，旋钮在指针的顶部。
            // 所以 Origin X 应该是 0.5 (水平居中)
            // Origin Y 应该是 0.1 或 0.2 (靠近顶部)
            pointerOrigin: { x: 0.555, y: 0.24 },

            // 角度范围：左下(-135度) 到 右下(-45度) ? 
            // 或是 左(-90) 到 右(90)? 根据你的美术图调整
            minAngle: -15,
            maxAngle: 165
        });
        
        // 3. 初始化状态
        this.gauge.setSpeed(0, true);   // 速度归零
        this.gauge.setEnergy(1.0);      // 80% 能量




        const centerX = this.scale.width / 2 + 150;
        this.infoBar = new InfoBar(this, centerX, 60);

    // 2. 绑定组件内部交互回调 (View -> Scene -> GameEvents)
    this.bindComponentEvents();

    // 3. 监听游戏逻辑事件 (GameEvents -> Scene -> View)
    this.setupGameEventListeners();
    
  }

  /**
   * 绑定 UI 组件发出的动作
   */
  private bindComponentEvents() {

    // --- Start Screen ---
    this.startOverlay.onStartClick = () => {
        // 开始游戏：显示暂停按钮，通知游戏层
        gameEvents.emit(EVENTS.GAME_START);
    };

    // --- Pause Menu ---
    this.pauseMenu.onResume = () => {
        gameEvents.emit(EVENTS.GAME_RESUME);
    };
    this.pauseMenu.onRestart = () => {
        // 重置 UI 状态
        this.resetUIState();
        gameEvents.emit(EVENTS.GAME_RESTART);
    };
    this.pauseMenu.onQuit = () => {
        gameEvents.emit(EVENTS.GAME_QUIT);
    };

    // --- Game Over Menu ---
    this.gameOverMenu.onRestart = () => {
        this.gameOverMenu.hide();
        this.resetUIState();
        gameEvents.emit(EVENTS.GAME_RESTART);
    };
    this.gameOverMenu.onQuit = () => {
        gameEvents.emit(EVENTS.GAME_QUIT);
    };
  }

  /**
   * 监听来自 GameScene 的数据流
   */
  private setupGameEventListeners() {
    // 数据更新
    gameEvents.on(EVENTS.UPDATE_HEIGHT, (val: number) => this.infoBar.setHeight(val));
    gameEvents.on(EVENTS.UPDATE_SCORE, (val: number) => this.infoBar.setScore(val));
    gameEvents.on(EVENTS.UPDATE_COLDNESS, (val: number) => this.infoBar.setBambooCount(val));

    // 游戏状态
    gameEvents.on(EVENTS.SHOW_GAME_OVER, (data: { score: number, height: number }) => {
        this.gameOverMenu.show(data.score, data.height);
    });
    
    // 如果需要由外部强制恢复 (比如从广告回来)
    gameEvents.on(EVENTS.GAME_RESUME, () => {
        this.pauseMenu.hide();
    });
  }

  private resetUIState() {
      
      this.startOverlay.show();
      this.pauseMenu.hide();
      this.gameOverMenu.hide();
  }

  update(_time: number, delta: number) {
    // 只有 HUD 里的特效需要每帧更新 (Punch effect)
    this.infoBar.updateEffect(delta);
  }
}