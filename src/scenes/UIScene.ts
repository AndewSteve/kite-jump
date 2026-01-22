import Phaser from "phaser";
import { EVENTS, gameEvents } from "../config/Events";
import { SceneKeys } from "../config/GameConfig";
import StartOverlay from "../ui/StartOverlay";
import PauseMenu from "../ui/PauseMenu";
import GameOverMenu from "../ui/GameOverMenu";
import { SciFiGauge } from "../ui/SciFiGauge";
import InfoBar from "../ui/InfoBar";
import LifeBar from "../ui/LifeBar";
import ColdnessBar from "../ui/ColdnessBar";
import RenderManager from "../managers/RenderManager";
import WeatherFrame from "../ui/WeatherFrame";
import { UITextureKeys, type UITextureKey } from "../config/AssetKeys";
// import InputZones from "../ui/InputZones";

export default class UIScene extends Phaser.Scene {
  private renderManager!: RenderManager;
  // 组件引用
  private startOverlay!: StartOverlay;
  private pauseMenu!: PauseMenu;
  private gameOverMenu!: GameOverMenu;

  private lifeBar!: LifeBar;
  private infoBar!: InfoBar;
  private gauge!: SciFiGauge;

  private coldnessBar!: ColdnessBar;
  private weatherFrame!: WeatherFrame;
  // private inputZones!: InputZones;

  constructor() {
    super(SceneKeys.UI);
  }

  create() {
    const { width, height } = this.scale;
    // 1. 直接实例化 RenderManager
    // 因为 pipeline 是全局的，这里只是为了获取 getPipeline 方法的访问权
    // 即使 GameScene 已经注册过了，这里也不会重复注册，非常安全
    this.renderManager = new RenderManager(this);

    // 1. 初始化所有 UI 组件
    this.startOverlay = new StartOverlay(this, width, height);
    this.pauseMenu = new PauseMenu(this, width, height);
    this.gameOverMenu = new GameOverMenu(this, width, height);

    this.lifeBar = new LifeBar(this, 50, 50);
    const weatherFrameLeftMargin = 20;
    const weatherIconScale = 0.9;
    const lifeBarBounds = this.lifeBar.getBounds();
    this.weatherFrame = new WeatherFrame(
      this,
      lifeBarBounds.right + weatherFrameLeftMargin,
      50,
      { iconScale: weatherIconScale }
    );

    const centerX = this.scale.width / 2 + 150;
    this.infoBar = new InfoBar(this, centerX, 60);

    // 2. 实例化组件，放置在屏幕右下角
    this.gauge = new SciFiGauge(this, width-50, 400);
    // this.gauge.setEnergy(0.9);

    // 2. 传递给 ColdnessBar
    this.coldnessBar = new ColdnessBar(this, 50, 400, this.renderManager);
    this.coldnessBar.setColdness(0);
    // this.inputZones = new InputZones(this);
    // new InputZones(this);
        

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
    gameEvents.off(EVENTS.UPDATE_HEIGHT);
    gameEvents.off(EVENTS.UPDATE_SCORE);
    gameEvents.off(EVENTS.UPDATE_COIN);
    gameEvents.off(EVENTS.UPDATE_LIFE);
    gameEvents.off(EVENTS.UPDATE_DASH);
    gameEvents.off(EVENTS.UPDATE_SPEED);
    gameEvents.off(EVENTS.WEATHER_START);
    gameEvents.off(EVENTS.WEATHER_END);
    gameEvents.off(EVENTS.SHOW_GAME_OVER);
    // 数据更新
    gameEvents.on(EVENTS.UPDATE_HEIGHT, (val: number) => this.infoBar.setHeight(val));
    gameEvents.on(EVENTS.UPDATE_SCORE, (val: number) => this.infoBar.setScore(val));
    gameEvents.on(EVENTS.UPDATE_COIN, (val: number) => this.infoBar.setBambooCount(val));
    gameEvents.on(EVENTS.UPDATE_TIME, (timeStr: string) => this.infoBar.setTime(timeStr));
    gameEvents.on(EVENTS.UPDATE_LIFE, (lives: number) => this.lifeBar.setLives(lives));
    gameEvents.on(EVENTS.UPDATE_DASH, (val: number) => this.gauge.setEnergy(val / 100));
    gameEvents.on(EVENTS.UPDATE_COLDNESS, (val: number) => this.coldnessBar.setColdness(val));
    gameEvents.on(EVENTS.UPDATE_SPEED, (val: number) => this.gauge.setSpeed(val));
    gameEvents.on(EVENTS.WEATHER_START, (weatherId: string) => {
      const iconMap: Record<string, UITextureKey> = {
        thunder: UITextureKeys.UIWeatherThunder,
        blizzard: UITextureKeys.UIWeatherBlizzard,
        aurora: UITextureKeys.UIWeatherAurora
      };
      const iconKey = iconMap[weatherId];
      if (iconKey) {
        this.weatherFrame.show(iconKey);
      } else {
        this.weatherFrame.hide();
      }
    });
    gameEvents.on(EVENTS.WEATHER_END, () => {
      this.weatherFrame.hide();
    });
    gameEvents.on(EVENTS.SHOW_GAME_OVER, (data: {
      finalScore: number,
      finalCurrency: number,
      finalHeight: number,
      finalTime: string,
      cause: string
    }) => {
        this.gameOverMenu.show(
            data.finalScore, 
            data.finalCurrency,
            data.finalHeight, 
            data.finalTime, 
            data.cause);
    });
    
    // 如果需要由外部强制恢复 (比如从广告回来)
    gameEvents.on(EVENTS.GAME_RESUME, () => {
        this.pauseMenu.hide();
    });
  }

  private resetUIState() {
      this.gauge.setEnergy(0);
      this.gauge.setSpeed(0);
      this.startOverlay.show();
      this.pauseMenu.hide();
      this.gameOverMenu.hide();
  }

  update(time: number, delta: number) {
    // 只有 HUD 里的特效需要每帧更新 (Punch effect)
    this.infoBar.update(time, delta);
    this.lifeBar.updateEffect(delta);
    if (this.coldnessBar) {
      this.coldnessBar.update(time, delta);
    }
    // if (this.inputZones) {
    //   this.inputZones.update();
    // }
  }
}
