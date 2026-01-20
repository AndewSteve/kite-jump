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
  
  // 主垂线
  private mainString: KiteMainString;
  private tails: KiteTail[] = [];

  // ✅ 新增：隐形脊柱 (用于驱动绳结物理)
  private knotSpine: KiteTail;

  private skinConfig: IKiteSkin;
  private mainStringTailAnchored = false;

  // 临时矩阵
  private readonly _tmpMat = new Phaser.GameObjects.Components.TransformMatrix();

  // --- 动画状态 ---
  private animState = {
    scaleX: 1,
    skewX: 0,
    skewY: 0,
    rotation: 0
  };

  private _turnDir: -1 | 0 | 1 = 0;
  private _turnTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, skinId: KiteSkinID) {
    super(scene, 0, 0);

    // 1. 加载配置
    this.skinConfig = KiteSkins[skinId] || KiteSkins[KiteSkinIDs.DefaultYellow];

    // 2. 主垂线 (Rope) - 独立于 Container
    const strScale = this.skinConfig.stringScale ?? 0.5;
    const strSegments = this.skinConfig.stringSegments ?? 22;
    const strSegmentLength = this.skinConfig.stringSegmentLength ?? 40;
    this.mainString = new KiteMainString(
      scene, 
      this.skinConfig.stringTexture, 
      strSegments, strSegmentLength
    );
    this.mainString.setScale(strScale);
    this.mainString.setDepth(-1);
    scene.add.existing(this.mainString);

    // 3. 提线 (Bridle Lines)
    this.bridleLeft = scene.add.sprite(0, 0, this.skinConfig.stringTexture).setOrigin(0, 0.5);
    this.bridleRight = scene.add.sprite(0, 0, this.skinConfig.stringTexture).setOrigin(0, 0.5);

    // 4. 绳结 (Knot)
    const kPos = this.skinConfig.knotOffset;
    this.knot = scene.add.sprite(kPos.x, kPos.y, this.skinConfig.knotTexture || this.skinConfig.stringTexture);
    const kScale = this.skinConfig.knotScale ?? 1.0;
    this.knot.setScale(kScale);

    // 5. 主体 (Body)
    this.bodySprite = scene.add.sprite(0, 0, this.skinConfig.bodyTexture);
    this.bodySprite.setOrigin(0.5, 0.5);

    // 6. ✅ 初始化隐形脊柱 (Knot Spine)
    // 计算需要的长度和节数 (假设每节 10px，这样比较硬，不会太软)
    const spineLen = Math.max(50, Math.abs(this.skinConfig.knotOffset.y)); // 至少50px长度
    const segLen = 10;
    const segCount = Math.ceil(spineLen / segLen);

    // 创建脊柱 (使用 'pixel' 或任意纹理，因为不可见)
    this.knotSpine = new KiteTail(scene, 0, 0, this.skinConfig.stringTexture, segCount, 10000);
    this.knotSpine.setVisible(false); // 关键：不可见
    
    // 强制设置物理参数 (需要绕过 TS private 检查，或者你在 KiteTail 里加 setter)
    // 这里为了方便直接 cast any，建议你在 KiteTail 加 setPhysicsConfig
    const spinePhys = this.knotSpine as any;
    spinePhys.segmentLength = segLen; 
    spinePhys.gravity = 0.8; // 重力稍大，保持垂坠感
    spinePhys.drag = 0.9;    // 阻力大，防止乱晃
    
    // 7. 添加进容器
    // 注意：add 顺序决定层级。先把 spine 加进去(无所谓因为不可见)，再加别的
    this.add(this.knotSpine);
    this.add([this.bridleLeft, this.bridleRight, this.bodySprite, this.knot]);

    // 8. 初始化装饰尾巴
    this.createTails(scene);

    // 9. 应用整体缩放
    this.setScale(this.skinConfig.scale);
  }

  private createTails(scene: Phaser.Scene) {
    if (!this.skinConfig.tails) return;

    this.skinConfig.tails.forEach(tailDef => {
      const tail = new KiteTail(
        scene, 0, 0, 
        tailDef.textureKey,
        tailDef.length || 20
      );
      if (tailDef.scale) tail.setScale(tailDef.scale);
      
      // ✅ 确保尾巴加在最底层 (index 0)，避免盖住身体
      this.addAt(tail, 0); 
      this.tails.push(tail);
    });
  }

  public updateVisuals(inputX: number, windX: number, windY: number) {
    // --- A. 转向动画逻辑 ---
    const deadZone = 0.1;
    const dir: -1 | 0 | 1 = inputX < -deadZone ? -1 : inputX > deadZone ? 1 : 0;
    if (dir !== this._turnDir) {
      this._turnDir = dir;
      this.startTurnTween(dir);
    }
    this.bodySprite.setScale(this.animState.scaleX, 1);
    this.bodySprite.setRotation(this.animState.rotation);
    this.setSpriteSkew(this.bodySprite, this.animState.skewX, this.animState.skewY);

    // --- B. 获取容器世界矩阵 ---
    const worldMat = this.getWorldTransformMatrix(this._tmpMat);

    // --- C. 🧵 更新隐形脊柱 (Knot Spine) ---
    // 1. 脊柱头部钉在 Body 的中心 (Container World Pos)
    // 这样当风筝移动时，脊柱头部跟着移动，剩下的部分会有物理延迟
    const bodyWorldX = worldMat.tx;
    const bodyWorldY = worldMat.ty;
    this.knotSpine.updatePhysics(bodyWorldX, bodyWorldY, windX, windY);

    // 2. 获取脊柱末端 (即绳结应该在的位置)
    // KiteTail 已经自动把 World Points 转换回 Local Points 存放在 this.points 里了
    // 所以我们直接取最后一个 Local Point 即可！
    const spineLocalPoints = this.knotSpine.points; 
    const tipLocal = spineLocalPoints[spineLocalPoints.length - 1];

    // 3. 将绳结 Sprite 移动到这里
    this.knot.setPosition(tipLocal.x, tipLocal.y);

    // --- D. 更新装饰尾巴 (Existing Tails) ---
    this.updateTails(inputX, windX, windY, worldMat);

    // --- E. 更新提线 (Bridle Lines) ---
    // 连接 Body 上的挂载点 和 现在的 动态 Knot 位置
    this.updateBridleLines();

    // --- F. 更新主垂线 (Main String) ---
    // 主垂线需要 World 坐标。我们可以从脊柱的 pointsList (World) 里取
    const spineWorldPoints = (this.knotSpine as any).pointsList as Phaser.Math.Vector2[];
    const tipWorld = spineWorldPoints[spineWorldPoints.length - 1];

    if (!this.mainStringTailAnchored) {
      this.mainString.enableTailAnchorFollowXSpringY(tipWorld.x, tipWorld.y);
      this.mainStringTailAnchored = true;
    }
    this.mainString.updatePhysics(tipWorld.x, tipWorld.y, windX * 0.2, windY * 0.2);
  }

  private updateTails(_inputX: number, windX: number, windY: number, worldMat: Phaser.GameObjects.Components.TransformMatrix) {
    if (!this.skinConfig.tails || this.tails.length === 0) return;

    this.skinConfig.tails.forEach((tailDef, index) => {
      const tailObj = this.tails[index];
      
      // 计算挂载点 (Body Local -> World)
      const bodyMat = this.bodySprite.getLocalTransformMatrix();
      
      // 1. Body Space -> Container Space
      const localInContainerX = bodyMat.tx + (tailDef.offsetX * bodyMat.a + tailDef.offsetY * bodyMat.c);
      const localInContainerY = bodyMat.ty + (tailDef.offsetX * bodyMat.b + tailDef.offsetY * bodyMat.d);

      // 2. Container Space -> World Space
      const worldX = worldMat.tx + (localInContainerX * worldMat.a + localInContainerY * worldMat.c);
      const worldY = worldMat.ty + (localInContainerX * worldMat.b + localInContainerY * worldMat.d);

      tailObj.updatePhysics(worldX, worldY, windX, windY);
    });
  }

  private updateBridleLines() {
    const bodyMat = this.bodySprite.getLocalTransformMatrix();
    const def = this.skinConfig;

    // 左挂载点 (Local)
    const lx = bodyMat.tx + (def.bridleLeftOffset.x * bodyMat.a + def.bridleLeftOffset.y * bodyMat.c);
    const ly = bodyMat.ty + (def.bridleLeftOffset.x * bodyMat.b + def.bridleLeftOffset.y * bodyMat.d);

    // 右挂载点 (Local)
    const rx = bodyMat.tx + (def.bridleRightOffset.x * bodyMat.a + def.bridleRightOffset.y * bodyMat.c);
    const ry = bodyMat.ty + (def.bridleRightOffset.x * bodyMat.b + def.bridleRightOffset.y * bodyMat.d);

    // 绳结位置 (现在的 this.knot.x/y 已经是被脊柱驱动后的位置了)
    const kx = this.knot.x;
    const ky = this.knot.y;

    this.alignSpriteToPoints(this.bridleLeft, lx, ly, kx, ky);
    this.alignSpriteToPoints(this.bridleRight, rx, ry, kx, ky);
  }

  // ... startTurnTween, alignSpriteToPoints, setSpriteSkew, destroy 保持不变 ...
  private startTurnTween(dir: -1 | 0 | 1) {
    let tScaleX = 1; let tSkewY = 0; let tRot = 0;
    if (dir < 0) { tScaleX = 0.9; tSkewY = -0.15; tRot = -0.15; } 
    else if (dir > 0) { tScaleX = 0.9; tSkewY = 0.15; tRot = 0.15; }

    if (this._turnTween) this._turnTween.stop();
    this._turnTween = this.scene.tweens.add({
      targets: this.animState,
      scaleX: tScaleX, skewY: tSkewY, rotation: tRot,
      duration: dir === 0 ? 200 : 150,
      ease: dir === 0 ? 'Sine.easeOut' : 'Quad.easeOut'
    });
  }

  public override destroy(fromScene?: boolean) {
    if (this._turnTween) {
      this._turnTween.stop();
      this._turnTween.remove();
      this._turnTween = undefined;
    }
    this.scene?.tweens?.killTweensOf(this);
    this.mainString?.destroy();
    super.destroy(fromScene);
  }

  private alignSpriteToPoints(sprite: Phaser.GameObjects.Sprite, x1: number, y1: number, x2: number, y2: number) {
    sprite.setPosition(x1, y1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    sprite.setRotation(angle);
    const baseThickness = 4; 
    const scale = this.skinConfig.bridleScale ?? 1.0;
    sprite.setDisplaySize(dist, baseThickness * scale);
  }

  private setSpriteSkew(sprite: Phaser.GameObjects.Sprite, x: number, y: number) {
    const s = sprite as any;
    if (typeof s.setSkew === 'function') s.setSkew(x, y);
    else { s.skewX = x; s.skewY = y; }
  }
}