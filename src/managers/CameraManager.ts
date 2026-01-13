// src/CameraManager.ts
import Phaser from 'phaser';
import { GameConfig } from '../config/consts';

export default class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  // 初始化跟随逻辑
  public follow(target: Phaser.GameObjects.GameObject) {
    // startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY)
    // 🔴 优化点：roundPixels 设为 GameConfig.camera.roundPixels (false)
    // 这会让插值更平滑，利用 WebGL 的抗锯齿，消除“像素格跳动”的感觉
    this.camera.startFollow(
      target, 
      GameConfig.camera.roundPixels, 
      GameConfig.camera.lerpX, 
      GameConfig.camera.lerpY, 
      0, 
      GameConfig.camera.offsetY
    );

    // 设置死区
    const width = this.scene.scale.width;
    this.camera.setDeadzone(width * GameConfig.camera.deadzoneX, GameConfig.camera.offsetY);
  }

  // 如果未来需要做“只向上滚动”或者“相机震动”，可以在这里扩展 update 方法
  public update() {
    // 示例：如果你想要 Doodle Jump 那种“只能上不能下”的相机，可以在这里写：
    // if (this.camera.scrollY > target.y ...) { ... }
    // 目前保持默认的跟随即可
  }
}