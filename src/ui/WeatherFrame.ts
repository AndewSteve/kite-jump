import Phaser from 'phaser';
import { UITextureKeys, type UITextureKey } from '../config/AssetKeys';

interface WeatherFrameOptions {
  iconScale?: number;
}

export default class WeatherFrame extends Phaser.GameObjects.Container {
  private frame: Phaser.GameObjects.Image;
  private icon: Phaser.GameObjects.Image;
  private iconScale: number;

  constructor(scene: Phaser.Scene, x: number, y: number, options: WeatherFrameOptions = {}) {
    super(scene, x, y);

    this.iconScale = options.iconScale ?? 1;

    this.frame = scene.add.image(0, 0, UITextureKeys.UIWeatherFrame);
    this.frame.setOrigin(0.5);

    this.icon = scene.add.image(0, 0, UITextureKeys.UIWeatherThunder);
    this.icon.setOrigin(0.5);
    this.icon.setScale(this.iconScale);

    this.add([this.frame, this.icon]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  public show(iconKey: UITextureKey) {
    this.icon.setTexture(iconKey);
    this.icon.setScale(this.iconScale);
    this.setVisible(true);
  }

  public hide() {
    this.setVisible(false);
  }
}
