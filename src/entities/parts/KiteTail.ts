import Phaser from 'phaser';

export class KiteTail extends Phaser.GameObjects.Rope {
  // 物理点：存储【世界坐标】
  private pointsList: Phaser.Math.Vector2[] = [];
  private prevPoints: Phaser.Math.Vector2[] = [];

  // --- 物理参数 ---
  private segmentLength: number = 5; 
  private gravity: number = 0.5;      
  private drag: number = 0.75;       
  private constraintIters: number = 10; // 稍微增加迭代次数，让它更“硬”一点，减少果冻感

  // --- ✅ 新增：静止抑制参数 (复刻自 MainString) ---
  private lastHeadX: number = 0;
  private lastHeadY: number = 0;
  private hasInitialized: boolean = false;

  // 1. 阈值：如果头部移动小于这个距离，视为“静止”
  private idleMoveEps: number = 10; 
  // 2. 阈值：如果节点速度小于这个值，强制停止 (防止微抖)
  private sleepVelEps: number = 1; 
  // 3. 系数：静止时风力乘数 (0.1 表示静止时只受 10% 的风，避免乱飘)
  private idleWindScale: number = 0.1; 

  constructor(
    scene: Phaser.Scene, 
    x: number, y: number, 
    texture: string, 
    length: number = 20,
    idleMoveEps?: number,
  ) {
    super(scene, x, y, texture, undefined, length);
    this.idleMoveEps = idleMoveEps ?? this.idleMoveEps;
    // 初始化点
    for (let i = 0; i < length; i++) {
      this.pointsList.push(new Phaser.Math.Vector2(0, i * this.segmentLength));
      this.prevPoints.push(new Phaser.Math.Vector2(0, i * this.segmentLength));
    }
  }

  public updatePhysics(headWorldX: number, headWorldY: number, windX: number, windY: number) {
    // --- 1. 检测头部移动 ---
    let headMoving = true;
    
    if (!this.hasInitialized) {
      this.hasInitialized = true;
      this.lastHeadX = headWorldX;
      this.lastHeadY = headWorldY;
    } else {
      const dx = Math.abs(headWorldX - this.lastHeadX);
      const dy = Math.abs(headWorldY - this.lastHeadY);
      // 如果移动量非常小，认为处于 Idle 状态
      if (dx + dy < this.idleMoveEps) {
        headMoving = false;
      }
      this.lastHeadX = headWorldX;
      this.lastHeadY = headWorldY;
    }

    // --- 2. 锁定头部 ---
    const head = this.pointsList[0];
    const prevHead = this.prevPoints[0];
    head.set(headWorldX, headWorldY);
    prevHead.set(headWorldX, headWorldY);

    // --- 3. 调整环境力 ---
    // 如果风筝没动，大幅减弱风力，防止尾巴在原地“抽搐”
    const currentWindX = headMoving ? windX : windX * this.idleWindScale;
    const currentWindY = headMoving ? windY : windY * this.idleWindScale;

    // --- 4. Verlet 积分 ---
    for (let i = 1; i < this.pointsList.length; i++) {
      const p = this.pointsList[i];
      const pp = this.prevPoints[i];

      // 速度 = (当前 - 上一帧) * 阻力
      let vx = (p.x - pp.x) * this.drag;
      let vy = (p.y - pp.y) * this.drag;

      // 保存旧位置
      pp.set(p.x, p.y);

      // 应用新位置
      p.x += vx + currentWindX;
      p.y += vy + this.gravity + currentWindY;
    }

    // --- 5. 距离约束 ---
    for (let iter = 0; iter < this.constraintIters; iter++) {
      for (let i = 1; i < this.pointsList.length; i++) {
        const p1 = this.pointsList[i - 1];
        const p2 = this.pointsList[i];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 0.001;

        const difference = (this.segmentLength - dist) / dist;
        
        // 简单的一对一拉伸
        const offsetX = dx * difference * 0.5;
        const offsetY = dy * difference * 0.5;

        if (i === 1) {
             // 第一根骨头：头部不动，全部作用于 p2
             p2.x += offsetX * 2;
             p2.y += offsetY * 2;
        } else {
             p1.x -= offsetX;
             p1.y -= offsetY;
             p2.x += offsetX;
             p2.y += offsetY;
        }
      }
    }

    // --- ✅ 6. 强制休眠逻辑 (Anti-Jitter) ---
    // 如果头部没动，检查每个节点：如果它动得很慢，直接把它“钉死”在当前位置
    if (!headMoving) {
      for (let i = 1; i < this.pointsList.length; i++) {
        const p = this.pointsList[i];
        const pp = this.prevPoints[i];
        
        // 计算当前速度
        const vx = p.x - pp.x;
        const vy = p.y - pp.y;
        
        // 如果速度小于阈值，且受到的重力影响已经稳定下来（这里主要靠速度判断）
        if (Math.abs(vx) + Math.abs(vy) < this.sleepVelEps) {
           // 让上一帧位置 = 当前位置，下一帧的时候 vx, vy 就会变成 0
           pp.set(p.x, p.y);
        }
      }
    }

    // --- 7. 渲染同步 ---
    this.syncWorldToLocal();
  }

  private syncWorldToLocal() {
    const container = this.parentContainer as Phaser.GameObjects.Container;
    if (!container) return;

    const parentX = container.x;
    const parentY = container.y;
    const parentRot = container.rotation;
    const parentScaleX = container.scaleX;
    const parentScaleY = container.scaleY;

    const c = Math.cos(-parentRot);
    const s = Math.sin(-parentRot);

    for (let i = 0; i < this.pointsList.length; i++) {
      const worldP = this.pointsList[i];
      let dx = worldP.x - parentX;
      let dy = worldP.y - parentY;
      let localX = dx * c - dy * s;
      let localY = dx * s + dy * c;
      localX /= parentScaleX;
      localY /= parentScaleY;

      this.points[i].x = localX;
      this.points[i].y = localY;
    }
    this.setDirty();
  }
}