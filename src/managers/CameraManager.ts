// src/CameraManager.ts
import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import type Player from '../entities/Player';

export default class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private target: Player | null = null;

  // 状态变量
  private fallingTimer: number = 0;
  private currentZoom: number = GameConfig.camera.zoom.default;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  // 初始化跟随逻辑
  public follow(target: Player) {
    this.target = target;
    // startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY)
    // 🔴 优化点：roundPixels 设为 GameConfig.camera.roundPixels (false)
    // 这会让插值更平滑，利用 WebGL 的抗锯齿，消除“像素格跳动”的感觉
    this.camera.startFollow(
      target, 
      GameConfig.camera.roundPixels, 
      GameConfig.camera.lerpX, 
      GameConfig.camera.lerpY, 
      0, 
      GameConfig.camera.offsets.climbing
    );

    // 设置死区
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.camera.setDeadzone(
      width * GameConfig.camera.deadzoneX, 
      height * GameConfig.camera.deadzoneY
    );
  }

  // 如果未来需要做“只向上滚动”或者“相机震动”，可以在这里扩展 update 方法
  public update(dt: number) {
    if (!this.target || !this.target.body) return;

    const body = this.target.body as Phaser.Physics.Arcade.Body;
    const playerState = this.target.playerState; // 获取玩家状态 (判断冲刺用)

    // --- 1. 计算目标 Offset Y (上下视野切换) ---
    
    let targetOffsetY = GameConfig.camera.offsets.climbing; // 默认：看天

    // 判定下落：速度向下 (>0) 且不是冲刺状态
    // 如果你在冲刺，即使是向下冲，通常也希望保持一种“向前/向上”的积极视野，或者保持当前视野
    // 这里设定：只要没在冲刺，且速度向下，就开始计时
    if (body.velocity.y > 0 && !playerState.isDashing) {
      // 累加计时器 (dt是毫秒，转为秒)
      this.fallingTimer += dt / 1000;
    } else {
      // 一旦速度回升或冲刺，立即重置计时器，视野切回 Climbing
      this.fallingTimer = 0;
    }

    // 只有当持续下落超过阈值，才切换目标为 Falling
    if (this.fallingTimer > GameConfig.camera.fallingThreshold) {
      targetOffsetY = GameConfig.camera.offsets.falling; // 看地
    }

    // --- 2. 平滑过渡 Offset (关键逻辑) ---
    
    // 获取当前 Offset Y
    const currentOffsetY = this.camera.followOffset.y;
    
    // 使用 Lerp 进行插值，0.05 是平滑系数，越小越慢
    // 这种写法比 Tween 更适合这种每帧都在变的目标
    const newOffsetY = Phaser.Math.Linear(currentOffsetY, targetOffsetY, 0.05);
    
    // 应用新的 Offset
    this.camera.setFollowOffset(this.camera.followOffset.x, newOffsetY);


    // --- 3. 处理 Zoom (冲刺特效) ---
    
    // 目标 Zoom
    let targetZoom = GameConfig.camera.zoom.default;
    if (playerState.isDashing) {
        targetZoom = GameConfig.camera.zoom.sprinting;
    }

    // 同样使用 Lerp 平滑变焦
    this.currentZoom = Phaser.Math.Linear(this.currentZoom, targetZoom, 0.05);
    this.camera.setZoom(this.currentZoom);
  }
}