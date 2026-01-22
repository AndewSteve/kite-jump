import Phaser from 'phaser';
import { BaseSummon, type ISummonInitData } from './BaseSummon';
import { VFXTextureKeys } from '../../config/AssetKeys';
import { PipelineID } from '../../managers/RenderManager';

export class SubaruTrail extends BaseSummon {
  private trailPlane?: Phaser.GameObjects.Plane;
  private baseVertices?: { x: number; y: number; z: number }[];

  private readonly gridWidth = 8;
  private readonly gridHeight = 12;
  private readonly trailDisplayWidth = 100;
  private readonly trailDisplayHeight = 400;
  private readonly expandStrength = 0.6;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, VFXTextureKeys.VfxTrail);
  }

  protected onStart(_data: ISummonInitData): void {
    this.setVisible(false);
    this.setAlpha(0);

    if (this.trailPlane) {
      this.trailPlane.destroy();
    }

    this.trailPlane = this.scene.add.plane(
      this.x,
      this.y,
      VFXTextureKeys.VfxTrail,
      undefined,
      this.gridWidth,
      this.gridHeight,
      false
    );

    this.trailPlane.setDisplaySize(this.trailDisplayWidth, this.trailDisplayHeight);
    this.trailPlane.setPipeline(PipelineID.SubaruTrail);
    this.trailPlane.setBlendMode(Phaser.BlendModes.ADD);
    this.trailPlane.setTint(0x004422);
    this.trailPlane.setAlpha(1);
    this.trailPlane.ignoreDirtyCache = true;

    // Plane origin fixed at center; shift so top aligns to this.y
    this.trailPlane.setPosition(this.x, this.y + this.trailDisplayHeight / 2);

    this.captureBaseVertices();
    this.applyCurveShape();
  }

  private captureBaseVertices() {
    if (!this.trailPlane) return;
    this.baseVertices = this.trailPlane.vertices.map((v) => ({ x: v.x, y: v.y, z: v.z }));
  }

  // 中上部分外展
  private applyCurveShape() {
    if (!this.trailPlane || !this.baseVertices) return;

    const verts = this.trailPlane.vertices;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const v of this.baseVertices) {
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }

    const range = Math.max(1, maxY - minY);

    for (let i = 0; i < verts.length; i++) {
      const base = this.baseVertices[i];
      const yNorm = (base.y - minY) / range; // 0 top, 1 bottom

      const rise = Phaser.Math.Clamp((yNorm - 0.12) / 0.22, 0, 1);
      const fall = Phaser.Math.Clamp((0.58 - yNorm) / 0.26, 0, 1);
      const bulge = rise * fall;

      const bottomTaper = Phaser.Math.Clamp((yNorm - 0.7) / 0.3, 0, 1);
      const taper = 1 - bottomTaper * 0.3;

      const expand = 1 + bulge * this.expandStrength;
      const factor = expand * taper;

      verts[i].x = base.x * factor;
      verts[i].y = base.y;
      verts[i].z = base.z;
    }
  }

  protected onUpdate(_dt: number): void {
    if (this.target && this.target.active) {
      const offsetY = this.target.height * 0.5;
      this.setPosition(this.target.x, this.target.y + offsetY);
    }

    if (this.trailPlane) {
      this.trailPlane.setPosition(this.x, this.y + this.trailDisplayHeight / 2);
    }
  }

  protected onDespawn(): void {
    if (this.trailPlane) {
      this.scene.tweens.add({
        targets: this.trailPlane,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.trailPlane?.destroy();
          this.trailPlane = undefined;
          this.baseVertices = undefined;
          this.kill();
        }
      });
    } else {
      this.kill();
    }
  }
}
