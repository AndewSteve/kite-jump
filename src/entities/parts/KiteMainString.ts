import Phaser from 'phaser';

/**
 * 主垂线 Rope（建议作为独立 GameObject 添加到 scene，而不是 KiteVisual Container 内）
 * - 头部点(0)每帧锁定到 knot 的世界坐标
 * - 末端点可启用“锚点模式”：X 在玩家移动时跟随；Y 用弹簧懒跟随上升，并限制头-尾距离范围
 * - 玩家不动（knot 不动）时会进入“抑制风力/睡眠”，避免不自然的持续摇晃
 */
export class KiteMainString extends Phaser.GameObjects.Rope {
  private pointsList: Phaser.Math.Vector2[] = [];
  private prevPoints: Phaser.Math.Vector2[] = [];

  // Rope 本地坐标长度；若 Rope scale=0.5，则世界长度约为 0.5 倍
  private segmentLength = 40;

  // 力学参数（按观感调）
  private gravity = 1.0;
  private stiffness = 0.85;
  private damping = 0.92;
  private constraintIters = 2;

  // --- 静止抑制（避免 knot 不动时一直抖）---
  private idleMoveEps = 10; // world px / frame
  private idleWindScale = 0.0; // 静止时风力缩放
  private sleepVelEps = 0.03; // local px / frame

  // --- 末端锚点模式（X 跟随、Y 弹簧）---
  private tailAnchorEnabled = true;
  private tailAnchorWorldX = 0;
  private tailAnchorWorldY = 0;
  private tailAnchorVelY = 0;

  private tailFollowX = true;
  private tailFollowXLerp = 0.35; // 0-1，越大越跟手

  private tailSpringK = 18;
  private tailSpringDamp = 0.75;
  private tailMinDistance = 220; // world px
  private tailMaxDistance = 520; // world px

  private lastHeadWorldX = 0;
  private lastHeadWorldY = 0;
  private hasLastHead = false;

  constructor(scene: Phaser.Scene, texture: string, segments = 22, segmentLength = 40) {
    super(scene, 0, 0, texture, undefined, segments);

    this.segmentLength = segmentLength;
    for (let i = 0; i < segments; i++) {
      const p = new Phaser.Math.Vector2(0, i * this.segmentLength);
      this.pointsList.push(p.clone());
      this.prevPoints.push(p.clone());
    }

    this.syncPointsToRope();
  }

  public getRestWorldLength() {
    return (this.pointsList.length - 1) * this.segmentLength * (this.scaleY || 1);
  }

  /**
   * 启用末端锚点：初始化时把末端放在头部正下方。
   * X 会在移动时跟随头部；Y 用弹簧懒跟随上升（并限制距离范围）。
   */
  public enableTailAnchorFollowXSpringY(headWorldX: number, headWorldY: number) {
    this.tailAnchorEnabled = true;
    this.tailAnchorWorldX = headWorldX;
    this.tailAnchorWorldY = headWorldY + this.getRestWorldLength();
    this.tailAnchorVelY = 0;

    const lastIndex = this.pointsList.length - 1;
    const { x: ax, y: ay } = this.worldToLocal(this.tailAnchorWorldX, this.tailAnchorWorldY);
    this.pointsList[lastIndex].set(ax, ay);
    this.prevPoints[lastIndex].set(ax, ay);
    this.syncPointsToRope();
  }

  /**
   * 更新末端锚点：X 在移动时跟随；Y 弹簧+范围限制
   */
  public updateTailAnchorFollowXSpringY(headWorldX: number, headWorldY: number, dtSeconds: number, headMoving: boolean) {
    if (!this.tailAnchorEnabled) return;

    const dt = Math.min(0.05, Math.max(0.001, dtSeconds));

    if (this.tailFollowX && headMoving) {
      this.tailAnchorWorldX = Phaser.Math.Linear(this.tailAnchorWorldX, headWorldX, this.tailFollowXLerp);
    }

    const desiredY = headWorldY + this.getRestWorldLength();
    const ay = (desiredY - this.tailAnchorWorldY) * this.tailSpringK;
    this.tailAnchorVelY += ay * dt;

    const damp = Math.pow(this.tailSpringDamp, dt * 60);
    this.tailAnchorVelY *= damp;
    this.tailAnchorWorldY += this.tailAnchorVelY * dt;

    const minY = headWorldY + this.tailMinDistance;
    const maxY = headWorldY + this.tailMaxDistance;
    if (this.tailAnchorWorldY < minY) {
      this.tailAnchorWorldY = minY;
      this.tailAnchorVelY = 0;
    } else if (this.tailAnchorWorldY > maxY) {
      this.tailAnchorWorldY = maxY;
      this.tailAnchorVelY = 0;
    }
  }

  /**
   * @param headWorldX knot 世界坐标 x
   * @param headWorldY knot 世界坐标 y
   * @param windWorldX 世界风 x
   * @param windWorldY 世界风 y
   */
  public updatePhysics(headWorldX: number, headWorldY: number, windWorldX: number, windWorldY: number) {
    const dt = (this.scene.game.loop.delta || 16.6667) / 1000;

    const headDx = this.hasLastHead ? headWorldX - this.lastHeadWorldX : 0;
    const headDy = this.hasLastHead ? headWorldY - this.lastHeadWorldY : 0;
    const headMoving = Math.abs(headDx) + Math.abs(headDy) > this.idleMoveEps;
    this.lastHeadWorldX = headWorldX;
    this.lastHeadWorldY = headWorldY;
    this.hasLastHead = true;

    // 静止时抑制风力（避免持续摇晃）
    const windScale = headMoving ? 1 : this.idleWindScale;
    const windX = windWorldX * windScale;
    const windY = windWorldY * windScale;

    // 更新末端锚点（如果启用）
    this.updateTailAnchorFollowXSpringY(headWorldX, headWorldY, dt, headMoving);

    // 坐标映射到 Rope 本地（因为 Rope 可能缩放）
    const headLocal = this.worldToLocal(headWorldX, headWorldY);
    const windLocalX = windX / (this.scaleX || 1);
    const windLocalY = windY / (this.scaleY || 1);

    // 1) 锁定头部
    this.pointsList[0].set(headLocal.x, headLocal.y);
    this.prevPoints[0].set(headLocal.x, headLocal.y);

    const lastIndex = this.pointsList.length - 1;
    if (this.tailAnchorEnabled) {
      const tailLocal = this.worldToLocal(this.tailAnchorWorldX, this.tailAnchorWorldY);
      this.pointsList[lastIndex].set(tailLocal.x, tailLocal.y);
      this.prevPoints[lastIndex].set(tailLocal.x, tailLocal.y);
    }

    // 2) Verlet 积分（末端锚点不积分）
    for (let i = 1; i < this.pointsList.length; i++) {
      if (this.tailAnchorEnabled && i === lastIndex) continue;

      const p = this.pointsList[i];
      const pp = this.prevPoints[i];

      const vx = (p.x - pp.x) * this.damping;
      const vy = (p.y - pp.y) * this.damping;

      pp.set(p.x, p.y);

      p.x += vx + windLocalX;
      p.y += vy + this.gravity + windLocalY;
    }

    // 3) 距离约束
    for (let iter = 0; iter < this.constraintIters; iter++) {
      for (let i = 1; i < this.pointsList.length; i++) {
        const p1 = this.pointsList[i - 1];
        const p2 = this.pointsList[i];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.00001;

        const diff = (dist - this.segmentLength) / dist;
        const adjX = dx * diff * this.stiffness;
        const adjY = dy * diff * this.stiffness;

        const p1Fixed = i === 1; // 头部锚点
        const p2Fixed = this.tailAnchorEnabled && i === lastIndex; // 末端锚点

        if (p1Fixed && p2Fixed) continue;
        if (p1Fixed) {
          p2.x -= adjX;
          p2.y -= adjY;
          continue;
        }
        if (p2Fixed) {
          p1.x += adjX;
          p1.y += adjY;
          continue;
        }

        p1.x += adjX * 0.5;
        p1.y += adjY * 0.5;
        p2.x -= adjX * 0.5;
        p2.y -= adjY * 0.5;
      }

      // 每轮后重新锁端点
      this.pointsList[0].set(headLocal.x, headLocal.y);
      if (this.tailAnchorEnabled) {
        const tailLocal = this.worldToLocal(this.tailAnchorWorldX, this.tailAnchorWorldY);
        this.pointsList[lastIndex].set(tailLocal.x, tailLocal.y);
      }
    }

    // 4) 静止时“睡眠”：把速度很小的点直接清零，避免微抖
    if (!headMoving) {
      for (let i = 1; i < this.pointsList.length; i++) {
        if (this.tailAnchorEnabled && i === lastIndex) continue;
        const p = this.pointsList[i];
        const pp = this.prevPoints[i];
        const vx = p.x - pp.x;
        const vy = p.y - pp.y;
        if (Math.abs(vx) + Math.abs(vy) < this.sleepVelEps) {
          pp.set(p.x, p.y);
        }
      }
    }

    this.syncPointsToRope();
  }

  private worldToLocal(worldX: number, worldY: number) {
    const sx = this.scaleX || 1;
    const sy = this.scaleY || 1;
    // 约定 Rope 自身 x/y 不动（为 0），所以只处理 scale 映射
    return { x: worldX / sx, y: worldY / sy };
  }

  private syncPointsToRope() {
    for (let i = 0; i < this.pointsList.length; i++) {
      this.points[i].x = this.pointsList[i].x;
      this.points[i].y = this.pointsList[i].y;
    }
    this.setDirty();
  }
}