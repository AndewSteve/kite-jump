// src/entities/KiteVisual.ts
import Phaser from 'phaser';
import { KiteTail } from './parts/KiteTail';
import { KiteMainString } from './parts/KiteMainString';
import { KiteSkinIDs, KiteSkins, type IKiteSkin, type KiteSkinID } from '../config/KiteSkinDef';
import VisualManager from '../managers/VisualManager'; // 假设路径正确
import { VFXTextureKeys } from '../config/AssetKeys';

export class KiteVisual extends Phaser.GameObjects.Container {
  // 零件
  private bodySprite: Phaser.GameObjects.Sprite;
  private knot: Phaser.GameObjects.Sprite;
  private bridleLeft: Phaser.GameObjects.Sprite;
  private bridleRight: Phaser.GameObjects.Sprite;
  
  // 主垂线
  private mainString: KiteMainString;
  private tails: KiteTail[] = [];

  // 隐形脊柱
  private knotSpine: KiteTail;

  // ✅ 新增：翼尖拖尾粒子发射器
  // 注意：它们不添加到 Container 内部，而是添加到 Scene，但由 KiteVisual 管理
  private trailEmitterLeft?: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailEmitterRight?: Phaser.GameObjects.Particles.ParticleEmitter;

  private skinConfig: IKiteSkin;
  private mainStringTailAnchored = false;

  // 临时矩阵
  private readonly _tmpMat = new Phaser.GameObjects.Components.TransformMatrix();
  // 临时点
  private readonly _tmpLoc = new Phaser.Math.Vector2();

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

    // 2. 主垂线
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

    // 3. 提线
    this.bridleLeft = scene.add.sprite(0, 0, this.skinConfig.stringTexture).setOrigin(0, 0.5);
    this.bridleRight = scene.add.sprite(0, 0, this.skinConfig.stringTexture).setOrigin(0, 0.5);

    // 4. 绳结
    const kPos = this.skinConfig.knotOffset;
    this.knot = scene.add.sprite(kPos.x, kPos.y, this.skinConfig.knotTexture || this.skinConfig.stringTexture);
    const kScale = this.skinConfig.knotScale ?? 1.0;
    this.knot.setScale(kScale);

    // 5. 主体
    this.bodySprite = scene.add.sprite(0, 0, this.skinConfig.bodyTexture);
    this.bodySprite.setOrigin(0.5, 0.5);

    // 6. 初始化隐形脊柱
    const spineLen = Math.max(50, Math.abs(this.skinConfig.knotOffset.y));
    const segLen = 10;
    const segCount = Math.ceil(spineLen / segLen);

    this.knotSpine = new KiteTail(scene, 0, 0, this.skinConfig.stringTexture, segCount, 10000);
    this.knotSpine.setVisible(false);
    
    const spinePhys = this.knotSpine as any;
    spinePhys.segmentLength = segLen; 
    spinePhys.gravity = 0.8;
    spinePhys.drag = 0.9;
    
    // 7. 添加进容器
    this.add(this.knotSpine);
    this.add([this.bridleLeft, this.bridleRight, this.bodySprite, this.knot]);

    // 8. 初始化装饰尾巴
    this.createTails(scene);

    // 9. ✅ 初始化冲刺拖尾 (如果配置了 Wing Offsets)
    if (this.skinConfig.wingLeftOffset && this.skinConfig.wingRightOffset) {
        this.createTrailEmitters(scene);
    }

    // 10. 应用整体缩放
    this.setScale(this.skinConfig.scale);
  }

  // ✅ 创建粒子发射器 (Phaser 3.60+ API)
  // ✅ 创建纯代码像素风发射器
  private createTrailEmitters(scene: Phaser.Scene) {
    // 1. 动态生成 10x10 纯白像素块
    const textureKey = VFXTextureKeys.VfxFlare;
    if (!scene.textures.exists(textureKey)) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 10, 10);
      g.generateTexture(textureKey, 10, 10);
      g.destroy(); 
    }

    // 2. ✅ 杯筒状向下喷射配置
    const trailColor = this.skinConfig.trailColor ?? 0xffffff;
    const config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
        // --- 核心：杯筒状(Cone)方向控制 ---
        // 90度是正下方。设定 75 到 105 度，形成一个 30 度的向下开口
        angle: { min: 75, max: 105 }, 
        
        // 给予一定的初始喷射力度，数值越大，“杯筒”拉得越长
        speed: { min: 150, max: 250 }, 

        // 持续受到向下的重力拉扯，强化下落感
        gravityY: 400,                

        // --- 像素风视觉控制 ---
        scale: 0.1,                     // 锁定10px大小，不缩放
        lifespan: 900,                // 存在0.6秒
        alpha: { start: 1, end: 0 },  // 逐渐消失
        blendMode: 'NORMAL',          // 纯色覆盖，不要发光
        color: [trailColor],              // 颜色来自皮肤配置

        // --- 发射频率 ---
        quantity: 1,                  // 每次吐出1个像素块
        frequency: 20,                // 高频吐出 (20ms)，使流体更连贯
        emitting: false,
    };

    // 3. 添加到场景
    this.trailEmitterLeft = scene.add.particles(0, 0, textureKey, config);
    this.trailEmitterLeft.setDepth(this.depth - 1);

    this.trailEmitterRight = scene.add.particles(0, 0, textureKey, config);
    this.trailEmitterRight.setDepth(this.depth - 1);
  }

  private createTails(scene: Phaser.Scene) {
    if (!this.skinConfig.tails) return;
    this.skinConfig.tails.forEach(tailDef => {
      const tail = new KiteTail(scene, 0, 0, tailDef.textureKey, tailDef.length || 20);
      if (tailDef.scale) tail.setScale(tailDef.scale);
      this.addAt(tail, 0); 
      this.tails.push(tail);
    });
  }

  // ✅ 更新逻辑：增加 isSprinting 参数
  public updateVisuals(inputX: number, windX: number, windY: number, isSprinting: boolean = false) {
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
    // 这个矩阵包含了 Container 的位移、旋转、缩放
    const worldMat = this.getWorldTransformMatrix(this._tmpMat);

    // --- C. 更新隐形脊柱 ---
    const bodyWorldX = worldMat.tx;
    const bodyWorldY = worldMat.ty;
    this.knotSpine.updatePhysics(bodyWorldX, bodyWorldY, windX, windY);

    const spineLocalPoints = this.knotSpine.points; 
    const tipLocal = spineLocalPoints[spineLocalPoints.length - 1];
    this.knot.setPosition(tipLocal.x, tipLocal.y);

    // --- D. 更新装饰尾巴 ---
    this.updateTails(inputX, windX, windY, worldMat);

    // --- E. 更新提线 ---
    this.updateBridleLines();

    // --- F. 更新主垂线 ---
    const spineWorldPoints = (this.knotSpine as any).pointsList as Phaser.Math.Vector2[];
    const tipWorld = spineWorldPoints[spineWorldPoints.length - 1];

    if (!this.mainStringTailAnchored) {
      this.mainString.enableTailAnchorFollowXSpringY(tipWorld.x, tipWorld.y);
      this.mainStringTailAnchored = true;
    }
    this.mainString.updatePhysics(tipWorld.x, tipWorld.y, windX * 0.2, windY * 0.2);

    // --- ✅ G. 更新冲刺拖尾 (Wing Tips) ---
    this.updateTrailParticles(worldMat, isSprinting);
  }

  private updateTrailParticles(worldMat: Phaser.GameObjects.Components.TransformMatrix, isSprinting: boolean) {
    if (!this.trailEmitterLeft || !this.trailEmitterRight) return;
    
    // 1. 检查全局开关 和 冲刺状态
    const shouldEmit = isSprinting || VisualManager.instance.isKiteTrailEnabled;

    if (shouldEmit) {
        // 2. 计算 Body 的局部矩阵 (包含 skew 和 rotation)
        const bodyMat = this.bodySprite.getLocalTransformMatrix();
        
        // 3. 计算左翼尖的世界坐标
        // 变换链: WingOffset (Local) -> Body Matrix -> Container Matrix (WorldMat) -> World Point
        if (this.skinConfig.wingLeftOffset) {
            const wx = this.calculateWorldPoint(this.skinConfig.wingLeftOffset, bodyMat, worldMat);
            this.trailEmitterLeft.setPosition(wx.x, wx.y);
            this.trailEmitterLeft.start(); // Phaser 3.60+ 用 start/stop 或 emitting=true
            this.trailEmitterLeft.emitting = true;
        }

        // 4. 计算右翼尖的世界坐标
        if (this.skinConfig.wingRightOffset) {
            const wx = this.calculateWorldPoint(this.skinConfig.wingRightOffset, bodyMat, worldMat);
            this.trailEmitterRight.setPosition(wx.x, wx.y);
            this.trailEmitterRight.start();
            this.trailEmitterRight.emitting = true;
        }
    } else {
        // 停止发射 (已有的粒子会自然播放完 lifespan)
        this.trailEmitterLeft.emitting = false;
        this.trailEmitterRight.emitting = false;
    }
  }

  // 辅助：计算嵌套坐标
  private calculateWorldPoint(
      offset: {x: number, y: number}, 
      bodyMat: Phaser.GameObjects.Components.TransformMatrix, 
      worldMat: Phaser.GameObjects.Components.TransformMatrix
  ): Phaser.Math.Vector2 {
      // Body Space -> Container Space
      const cntX = bodyMat.tx + (offset.x * bodyMat.a + offset.y * bodyMat.c);
      const cntY = bodyMat.ty + (offset.x * bodyMat.b + offset.y * bodyMat.d);

      // Container Space -> World Space
      // 注意：这里我们应用 worldMat 来获取最终的世界坐标
      // this._tmpLoc 是复用的 Vector2 对象，减少 GC
      this._tmpLoc.x = worldMat.tx + (cntX * worldMat.a + cntY * worldMat.c);
      this._tmpLoc.y = worldMat.ty + (cntX * worldMat.b + cntY * worldMat.d);

      return this._tmpLoc;
  }

  private updateTails(_inputX: number, windX: number, windY: number, worldMat: Phaser.GameObjects.Components.TransformMatrix) {
    if (!this.skinConfig.tails || this.tails.length === 0) return;

    this.skinConfig.tails.forEach((tailDef, index) => {
      const tailObj = this.tails[index];
      const bodyMat = this.bodySprite.getLocalTransformMatrix();
      
      const localInContainerX = bodyMat.tx + (tailDef.offsetX * bodyMat.a + tailDef.offsetY * bodyMat.c);
      const localInContainerY = bodyMat.ty + (tailDef.offsetX * bodyMat.b + tailDef.offsetY * bodyMat.d);

      const worldX = worldMat.tx + (localInContainerX * worldMat.a + localInContainerY * worldMat.c);
      const worldY = worldMat.ty + (localInContainerX * worldMat.b + localInContainerY * worldMat.d);

      tailObj.updatePhysics(worldX, worldY, windX, windY);
    });
  }

  // ... updateBridleLines, startTurnTween, alignSpriteToPoints, setSpriteSkew 保持不变 ...
  
  private updateBridleLines() {
     // ... (代码同原文件) ...
     const bodyMat = this.bodySprite.getLocalTransformMatrix();
     const def = this.skinConfig;
     const lx = bodyMat.tx + (def.bridleLeftOffset.x * bodyMat.a + def.bridleLeftOffset.y * bodyMat.c);
     const ly = bodyMat.ty + (def.bridleLeftOffset.x * bodyMat.b + def.bridleLeftOffset.y * bodyMat.d);
     const rx = bodyMat.tx + (def.bridleRightOffset.x * bodyMat.a + def.bridleRightOffset.y * bodyMat.c);
     const ry = bodyMat.ty + (def.bridleRightOffset.x * bodyMat.b + def.bridleRightOffset.y * bodyMat.d);
     const kx = this.knot.x;
     const ky = this.knot.y;
     this.alignSpriteToPoints(this.bridleLeft, lx, ly, kx, ky);
     this.alignSpriteToPoints(this.bridleRight, rx, ry, kx, ky);
  }
  
  private startTurnTween(dir: -1 | 0 | 1) {
    // ... (代码同原文件) ...
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
  
  private alignSpriteToPoints(sprite: Phaser.GameObjects.Sprite, x1: number, y1: number, x2: number, y2: number) {
      // ... (代码同原文件) ...
      sprite.setPosition(x1, y1);
      const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
      const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
      sprite.setRotation(angle);
      const baseThickness = 4; 
      const scale = this.skinConfig.bridleScale ?? 1.0;
      sprite.setDisplaySize(dist, baseThickness * scale);
  }
  
  private setSpriteSkew(sprite: Phaser.GameObjects.Sprite, x: number, y: number) {
      // ... (代码同原文件) ...
      const s = sprite as any;
      if (typeof s.setSkew === 'function') s.setSkew(x, y);
      else { s.skewX = x; s.skewY = y; }
  }

  public override destroy(fromScene?: boolean) {
    // ✅ 销毁粒子发射器 (因为它们不在 Container 的 children 列表里，必须手动销毁)
    this.trailEmitterLeft?.destroy();
    this.trailEmitterRight?.destroy();

    if (this._turnTween) {
      this._turnTween.stop();
      this._turnTween.remove();
      this._turnTween = undefined;
    }
    this.scene?.tweens?.killTweensOf(this);
    this.mainString?.destroy();
    super.destroy(fromScene);
  }
}
