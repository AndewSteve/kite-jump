// src/entities/KiteVisual.ts
import Phaser from 'phaser';
import { KiteTail } from './parts/KiteTail';
import { KiteMainString } from './parts/KiteMainString';
import { KiteSkinIDs, KiteSkins, type IKiteSkin, type KiteSkinID } from '../config/KiteSkinDef';

export class KiteVisual extends Phaser.GameObjects.Container {
  // 零件
  private bodySprite: Phaser.GameObjects.Sprite;
  private knot: Phaser.GameObjects.Sprite;
  private bridleLeft: Phaser.GameObjects.Sprite;
  private bridleRight: Phaser.GameObjects.Sprite;
  
  // ✅ 主垂线：用 Rope（独立于 Container，避免跟随瞬间旋转）
  private mainString: KiteMainString;
  private tails: KiteTail[] = []; // ✅ 改为数组

  private skinConfig: IKiteSkin;
  private mainStringTailAnchored = false;

  // 临时矩阵（避免每帧 new）
  private readonly _tmpMat = new Phaser.GameObjects.Components.TransformMatrix();
  // private _tmpVec = new Phaser.Math.Vector2();

  // --- 动画状态 ---
  // 用于 Tween 的中间变量
  private animState = {
    scaleX: 1,
    skewX: 0,
    skewY: 0,
    rotation: 0
  };

  // --- 可取消 Tween（防止快速点按鬼畜，但不引入明显延迟）---
  private _turnDir: -1 | 0 | 1 = 0;
  private _turnTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, skinId: KiteSkinID) {
    super(scene, 0, 0);

    // 1. 加载配置 (如果没有找到，就回退到默认)
    this.skinConfig = KiteSkins[skinId] || KiteSkins[KiteSkinIDs.DefaultYellow];

    // 2. 主垂线 (Rope) - 独立于 Container
    this.mainString = new KiteMainString(scene, this.skinConfig.stringTexture, 22);
    // ✅ 修改点：使用配置的 stringScale，默认为 0.5
    const strScale = this.skinConfig.stringScale ?? 0.5;
    this.mainString.setScale(strScale);
    this.mainString.setDepth(-1); // 在风筝后面
    scene.add.existing(this.mainString);

    // 3. 提线 (Bridle Lines)
    this.bridleLeft = scene.add.sprite(0, 0, this.skinConfig.stringTexture).setOrigin(0, 0.5);
    this.bridleRight = scene.add.sprite(0, 0, this.skinConfig.stringTexture).setOrigin(0, 0.5);

    // 4. 绳结
    const kPos = this.skinConfig.knotOffset;
    this.knot = scene.add.sprite(kPos.x, kPos.y, this.skinConfig.knotTexture || this.skinConfig.stringTexture);
    // ✅ 修改点：使用配置的 knotScale，默认为 1.0
    const kScale = this.skinConfig.knotScale ?? 1.0;
    this.knot.setScale(kScale);
    // 5. 主体 (Body)
    this.bodySprite = scene.add.sprite(0, 0, this.skinConfig.bodyTexture);
    this.bodySprite.setOrigin(0.5, 0.5);

    // 6. 添加进容器 (层级：线 -> 身体 -> 结)
    this.add([this.bridleLeft, this.bridleRight, this.bodySprite, this.knot]);

    // 7. 初始化尾巴 (支持多条)
    this.createTails(scene);

    // 8. 应用整体缩放
    this.setScale(this.skinConfig.scale);
  }

  private createTails(scene: Phaser.Scene) {
    if (!this.skinConfig.tails) return;

    this.skinConfig.tails.forEach(tailDef => {
      // 创建尾巴
      const tail = new KiteTail(
        scene, 
        0, 0, // 初始位置稍后 update 修正
        tailDef.textureKey,
        tailDef.length || 20 // 允许配置长度
      );
      
      // 应用尾巴特定的缩放 (叠加风筝整体缩放)
      if (tailDef.scale) {
        tail.setScale(tailDef.scale);
      }
      
      // 尾巴需要放在身体后面
      this.addAt(tail, 0); 
      this.tails.push(tail);
    });
  }

  public updateVisuals(inputX: number, windX: number, windY: number) {
    // --- A. 转向动画逻辑 ---
    // 抽象化：不再操作 LeftWing/RightWing，而是操作 Body 的 Skew/Rotation
    const deadZone = 0.1;
    const dir: -1 | 0 | 1 = inputX < -deadZone ? -1 : inputX > deadZone ? 1 : 0;

    if (dir !== this._turnDir) {
      this._turnDir = dir;
      this.startTurnTween(dir);
    }

    // 应用动画状态到 Body
    this.bodySprite.setScale(this.animState.scaleX, 1); // 模拟透视挤压
    this.bodySprite.setRotation(this.animState.rotation);
    this.setSpriteSkew(this.bodySprite, this.animState.skewX, this.animState.skewY);

    // --- B. 计算关键点的世界坐标 ---
    // 获取 Container 的世界变换矩阵
    const worldMat = this.getWorldTransformMatrix(this._tmpMat);

    // --- C. 更新尾巴 (核心难点：多尾巴跟随) ---
    this.updateTails(inputX, windX, windY, worldMat);

    // --- D. 更新提线 (Bridle) ---
    this.updateBridleLines();

    // --- E. 更新主垂线 (Main String) ---
    // 绳结的世界坐标
    // Knot 在 Container 里基本不动 (或者你可以给 Knot 也加一点摆动)
    const knotWorldX = worldMat.tx + (this.knot.x * worldMat.a + this.knot.y * worldMat.c);
    const knotWorldY = worldMat.ty + (this.knot.x * worldMat.b + this.knot.y * worldMat.d);

    if (!this.mainStringTailAnchored) {
      this.mainString.enableTailAnchorFollowXSpringY(knotWorldX, knotWorldY);
      this.mainStringTailAnchored = true;
    }
    this.mainString.updatePhysics(knotWorldX, knotWorldY, windX * 0.2, windY * 0.2);
  }

  private updateTails(_inputX: number, windX: number, windY: number, worldMat: Phaser.GameObjects.Components.TransformMatrix) {
    if (!this.skinConfig.tails || this.tails.length === 0) {
      return;
    }
    this.skinConfig.tails.forEach((tailDef, index) => {
      const tailObj = this.tails[index];
      
      // 1. 计算挂载点在 Body 局部空间的位置 (考虑 Body 的旋转/Skew)
      // 这一步比较复杂，因为 bodySprite 在 container 里也在动。
      // 简化方案：我们直接计算 container 里的局部坐标，因为 tail 也是 container 的子物体？
      // 不，Tail 是 Verlet 物理对象，通常需要世界坐标的风力，但渲染在 Container 里。
      // 为了物理模拟准确，KiteTail 的 updatePhysics 需要传入 "挂载点的世界坐标"。

      // 计算 Body 自身的变换矩阵 (相对于 Container)
      const bodyMat = this.bodySprite.getLocalTransformMatrix();
      
      // 将 Config 里的 Offset (相对于 Body 中心) 转换为 Container 坐标
      // p = BodyMatrix * Offset
      const localInContainerX = bodyMat.tx + (tailDef.offsetX * bodyMat.a + tailDef.offsetY * bodyMat.c);
      const localInContainerY = bodyMat.ty + (tailDef.offsetX * bodyMat.b + tailDef.offsetY * bodyMat.d);

      // 再转为世界坐标 (用于物理计算)
      // P_world = ContainerMatrix * P_local
      const worldX = worldMat.tx + (localInContainerX * worldMat.a + localInContainerY * worldMat.c);
      const worldY = worldMat.ty + (localInContainerX * worldMat.b + localInContainerY * worldMat.d);

      // 更新尾巴物理
      tailObj.updatePhysics(worldX, worldY, windX, windY);
    });
  }

  private startTurnTween(dir: -1 | 0 | 1) {
    // 目标状态
    let tScaleX = 1;
    // let tSkewX = 0;
    let tSkewY = 0;
    let tRot = 0;

    if (dir < 0) { // 向左转
      tScaleX = 0.9;   // 稍微变窄，模拟透视
      tSkewY = -0.15;  // 纵向倾斜
      tRot = -0.15;    // 整体旋转
    } else if (dir > 0) { // 向右转
      tScaleX = 0.9;
      tSkewY = 0.15;
      tRot = 0.15;
    }

    // 停止旧 Tween
    if (this._turnTween) {
      this._turnTween.stop();
    }

    const duration = dir === 0 ? 200 : 150;
    const ease = dir === 0 ? 'Sine.easeOut' : 'Quad.easeOut';

    this._turnTween = this.scene.tweens.add({
      targets: this.animState,
      scaleX: tScaleX,
      skewY: tSkewY,
      rotation: tRot,
      duration: duration,
      ease: ease
    });
  }

  public override destroy(fromScene?: boolean) {
    if (this._turnTween) {
      this._turnTween.stop();
      this._turnTween.remove();
      this._turnTween = undefined;
    }
    this.scene?.tweens?.killTweensOf(this);

    // mainString 不在 Container 里，需要手动销毁
    this.mainString?.destroy();
    super.destroy(fromScene);
  }

  private updateBridleLines() {
    // 1. 获取 Body 上挂载点的当前位置 (因为 Body 在旋转/Skew)
    const bodyMat = this.bodySprite.getLocalTransformMatrix();
    const def = this.skinConfig;

    // 左挂载点 (Container 空间)
    const lx = bodyMat.tx + (def.bridleLeftOffset.x * bodyMat.a + def.bridleLeftOffset.y * bodyMat.c);
    const ly = bodyMat.ty + (def.bridleLeftOffset.x * bodyMat.b + def.bridleLeftOffset.y * bodyMat.d);

    // 右挂载点
    const rx = bodyMat.tx + (def.bridleRightOffset.x * bodyMat.a + def.bridleRightOffset.y * bodyMat.c);
    const ry = bodyMat.ty + (def.bridleRightOffset.x * bodyMat.b + def.bridleRightOffset.y * bodyMat.d);

    // 绳结位置 (相对静止)
    const kx = this.knot.x;
    const ky = this.knot.y; // 绳结稍向下偏移

    // 拉伸 Sprite
    this.alignSpriteToPoints(this.bridleLeft, lx, ly, kx, ky);
    this.alignSpriteToPoints(this.bridleRight, rx, ry, kx, ky);
  }

  /**
   * 通用方法：拉伸 Sprite 连接两点
   */
  private alignSpriteToPoints(sprite: Phaser.GameObjects.Sprite, x1: number, y1: number, x2: number, y2: number) {
    sprite.setPosition(x1, y1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    sprite.setRotation(angle);
    // ✅ 修改点：计算线条粗细
    // 基础粗细设为 4px (或者根据你的原图尺寸定)，乘以配置的缩放
    const baseThickness = 4; 
    const scale = this.skinConfig.bridleScale ?? 1.0;
    
    // setDisplaySize(宽度=距离, 高度=粗细)
    sprite.setDisplaySize(dist, baseThickness * scale);
  }

  /**
   * Phaser 的类型定义里 Sprite 可能没有 setSkew，但运行时可能存在 skewX/skewY 或 setSkew。
   * 这里用 any 做一个兼容层，避免 TS 编译错误。
   */
  private setSpriteSkew(sprite: Phaser.GameObjects.Sprite, x: number, y: number) {
    const s = sprite as any;
    if (typeof s.setSkew === 'function') s.setSkew(x, y);
    else { s.skewX = x; s.skewY = y; }
  }
}