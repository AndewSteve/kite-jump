// src/entities/KiteVisual.ts
import Phaser from 'phaser';
import { KiteTail } from './parts/KiteTail';
import { KiteMainString } from './parts/KiteMainString';

export class KiteVisual extends Phaser.GameObjects.Container {
  // 零件
  private leftWing: Phaser.GameObjects.Sprite;
  private rightWing: Phaser.GameObjects.Sprite;
  private bodySpine: Phaser.GameObjects.Sprite;
  private tail: KiteTail;
  private knot: Phaser.GameObjects.Sprite;
  
  // ✅ 新增：用 Sprite 做连线，而不是 Graphics
  private bridleLeft: Phaser.GameObjects.Sprite;
  private bridleRight: Phaser.GameObjects.Sprite;
  // ✅ 主垂线：用 Rope（独立于 Container，避免跟随瞬间旋转）
  private mainString: KiteMainString;

  private mainStringTailAnchored = false;

  // 临时矩阵（避免每帧 new）
  private readonly _tmpMat = new Phaser.GameObjects.Components.TransformMatrix();

  // 布局常量
  private readonly WING_OFFSET_Y = -50; 
  private readonly KNOT_OFFSET_Y = 800; 
  private readonly TAIL_OFFSET_Y = 180; // 根据 Body 高度调整

  // 动画状态缓存
  private currentLeftScale = 1;
  private currentRightScale = 1;
  private currentBodyScale = 1;
  private currentLeftSkew = 0; // 新增 Skew
  private currentRightSkew = 0;
  private currentRotation = 0;

  // --- 可取消 Tween（防止快速点按鬼畜，但不引入明显延迟）---
  private _turnDir: -1 | 0 | 1 = 0;
  private _turnTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, textureKey: string) {
    super(scene, 0, 0);

    // 2. 主垂线（Rope）：添加到 scene，而不是 Container
    this.mainString = new KiteMainString(scene, `${textureKey}_string`, 22);
    this.mainString.setScale(0.5);
    this.mainString.setDepth(-1);
    scene.add.existing(this.mainString);

    // 3. 翅膀
    this.leftWing = scene.add.sprite(0, this.WING_OFFSET_Y, `${textureKey}_left`);
    this.leftWing.setOrigin(1, 0.4); // 锚点右侧
    this.leftWing.x = -2;

    this.rightWing = scene.add.sprite(0, this.WING_OFFSET_Y, `${textureKey}_right`);
    this.rightWing.setOrigin(0, 0.4); // 锚点左侧
    this.rightWing.x = 2;

    // 4. 身体
    this.bodySpine = scene.add.sprite(0, 0, `${textureKey}_body_main`);
    this.bodySpine.setOrigin(0.5, 0.5);

    // ✅ 5. 提线 (Bridle Lines) - 使用 Sprite
    // 初始位置随便设，会在 update 里每帧对齐
    this.bridleLeft = scene.add.sprite(0, 0, `${textureKey}_string`);
    this.bridleLeft.setOrigin(0, 0.5); // 锚点：左侧中心 (作为起点)
    
    this.bridleRight = scene.add.sprite(0, 0, `${textureKey}_string`);
    this.bridleRight.setOrigin(0, 0.5);
    // 6. 绳结
    this.knot = scene.add.sprite(0, this.KNOT_OFFSET_Y, `${textureKey}_knot`);

    // 添加顺序决定层级：线在翅膀上面，结在最上面
    this.add([this.bridleLeft, this.bridleRight, this.knot]);
    this.add([this.leftWing, this.rightWing, this.bodySpine]);

    // 1. 尾巴
    this.tail = new KiteTail(scene, 0, this.TAIL_OFFSET_Y, `${textureKey}_body_tail`);
    // this.tail.setDepth(0); // 在身体后面
    this.add(this.tail);
    
    this.setScale(0.25);
  }

  public updateVisuals(inputX: number, windX: number, windY: number) {
    // --- A. 3D 透视转向逻辑 (V2.0 激进版) ---
    const deadZone = 0.2;
    const dir: -1 | 0 | 1 = inputX < -deadZone ? -1 : inputX > deadZone ? 1 : 0;

    // 方向变化时启动一个可取消 tween，避免频繁点按堆叠导致鬼畜
    if (dir !== this._turnDir) {
      this._turnDir = dir;
      this.startTurnTween(dir);
    }

    // 应用变换
    this.leftWing.setScale(this.currentLeftScale, 1);
    this.setSpriteSkew(this.leftWing, 0, this.currentLeftSkew);

    this.rightWing.setScale(this.currentRightScale, 1);
    this.setSpriteSkew(this.rightWing, 0, this.currentRightSkew);

    this.bodySpine.setScale(this.currentBodyScale, 1);
    this.setRotation(this.currentRotation);

    // --- B. 尾巴物理 (修改部分) ---
    
    // 1. 计算尾巴挂载点的世界坐标
    // 挂载点在 Container 内部的 (0, TAIL_OFFSET_Y)
    // 使用 transformMatrix 转换局部点 (0, 350) -> 世界坐标
    const worldTransform = this.getWorldTransformMatrix(this._tmpMat);
    
    // transformPoint(localX, localY) -> {x, y}
    // 这里 localX=0, localY=TAIL_OFFSET_Y
    const anchorWorldX = worldTransform.tx + (0 * worldTransform.a + this.TAIL_OFFSET_Y * worldTransform.c);
    const anchorWorldY = worldTransform.ty + (0 * worldTransform.b + this.TAIL_OFFSET_Y * worldTransform.d);

    // 2. 传入世界坐标进行更新
    // 注意：windX/Y 如果是基于屏幕的（通常是），直接传即可
    this.tail.updatePhysics(anchorWorldX, anchorWorldY, windX, windY);

    // --- C. 提线动态连接 (核心) ---
    this.updateBridleSprites();

    // --- D. 主垂线 Rope：下端被动物理跟随 knot ---
    const mat = this.knot.getWorldTransformMatrix(this._tmpMat);
    const knotWorldX = mat.tx;
    const knotWorldY = mat.ty;

    // 底端锚点：X 在玩家移动时跟随；Y 用弹簧“懒跟随”上升，并限制距离范围
    if (!this.mainStringTailAnchored) {
      this.mainString.enableTailAnchorFollowXSpringY(knotWorldX, knotWorldY);
      this.mainStringTailAnchored = true;
    }

    this.mainString.updatePhysics(knotWorldX, knotWorldY, windX * 0.2, windY * 0.2);
  }

  private startTurnTween(dir: -1 | 0 | 1) {
    let tLeftScale = 1;
    let tRightScale = 1;
    let tBodyScale = 1;
    let tRot = 0;
    let tLeftSkew = 0;
    let tRightSkew = 0;

    if (dir < 0) {
      tLeftScale = 0.35;
      tLeftSkew = -0.15;

      tRightScale = 0.75;
      tRightSkew = 0.1;

      tBodyScale = 0.5;
      tRot = -0.25;
    } else if (dir > 0) {
      tLeftScale = 0.75;
      tLeftSkew = -0.1;

      tRightScale = 0.35;
      tRightSkew = 0.15;

      tBodyScale = 0.5;
      tRot = 0.25;
    }

    // 取消旧 tween（关键：防止频繁点按堆叠）
    if (this._turnTween) {
      this._turnTween.stop();
      this._turnTween.remove();
      this._turnTween = undefined;
    }

    // 双保险：杀掉所有以 this 为 targets 的 tween
    this.scene.tweens.killTweensOf(this);

    const duration = dir === 0 ? 120 : 80;
    const ease = dir === 0 ? 'Sine.easeOut' : 'Quad.easeOut';

    this._turnTween = this.scene.tweens.add({
      targets: this,
      currentLeftScale: tLeftScale,
      currentRightScale: tRightScale,
      currentBodyScale: tBodyScale,
      currentLeftSkew: tLeftSkew,
      currentRightSkew: tRightSkew,
      currentRotation: tRot,
      duration,
      ease,
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

  private updateBridleSprites() {
    // 1. 获取翅膀连接点的**世界坐标** (相对于 Container)
    // 左翼连接点：翅膀宽度的 60% 处
    // 注意：因为 LeftWing scaleX 变了，连接点也会跟着跑，这正是我们要的！
    const leftLocalX = this.leftWing.x + (this.leftWing.width * -0.6 * this.leftWing.scaleX);
    const leftLocalY = this.leftWing.y+10;

    const rightLocalX = this.rightWing.x + (this.rightWing.width * 0.6 * this.rightWing.scaleX);
    const rightLocalY = this.rightWing.y+10;

    const knotX = this.knot.x;
    const knotY = this.knot.y - 10;

    // 2. 更新左线 (Sprite Stretch)
    this.alignSpriteToPoints(this.bridleLeft, leftLocalX, leftLocalY, knotX, knotY);

    // 3. 更新右线
    this.alignSpriteToPoints(this.bridleRight, rightLocalX, rightLocalY, knotX, knotY);
  }

  /**
   * 通用方法：拉伸 Sprite 连接两点
   */
  private alignSpriteToPoints(sprite: Phaser.GameObjects.Sprite, x1: number, y1: number, x2: number, y2: number) {
    // 1. 设置起点位置
    sprite.setPosition(x1, y1);

    // 2. 计算距离 (作为宽度)
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    sprite.setDisplaySize(dist, 30); // 宽度=距离, 高度=绳子粗细(比如10px)

    // 3. 计算角度
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    sprite.setRotation(angle);
  }

  /**
   * Phaser 的类型定义里 Sprite 可能没有 setSkew，但运行时可能存在 skewX/skewY 或 setSkew。
   * 这里用 any 做一个兼容层，避免 TS 编译错误。
   */
  private setSpriteSkew(sprite: Phaser.GameObjects.Sprite, skewX: number, skewY: number) {
    const s = sprite as any;

    if (typeof s.setSkew === 'function') {
      s.setSkew(skewX, skewY);
      return;
    }

    s.skewX = skewX;
    s.skewY = skewY;
  }
}