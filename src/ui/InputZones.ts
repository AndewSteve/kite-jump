import Phaser from 'phaser';
import { EVENTS, gameEvents } from '../config/Events';

export default class InputZones {
  private scene: Phaser.Scene;
  private leftDown = false;
  private rightDown = false;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastDir = 0;
  private leftZone: Phaser.GameObjects.Zone;
  private rightZone: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    const halfWidth = width / 2;

    const leftDebug = scene.add.rectangle(halfWidth / 2, height / 2, halfWidth, height, 0x00ff00, 0.0);
    const rightDebug = scene.add.rectangle(halfWidth + halfWidth / 2, height / 2, halfWidth, height, 0xff0000, 0.0);
    leftDebug.setScrollFactor(0).setDepth(-1000);
    rightDebug.setScrollFactor(0).setDepth(-1000);

    this.leftZone = scene.add.zone(halfWidth / 2, height / 2, halfWidth, height);
    this.rightZone = scene.add.zone(halfWidth + halfWidth / 2, height / 2, halfWidth, height);
    this.leftZone.setScrollFactor(0).setDepth(-999);
    this.rightZone.setScrollFactor(0).setDepth(-999);

    this.leftZone.setInteractive();
    this.rightZone.setInteractive();

    this.leftZone.on('pointerdown', () => {
      this.leftDown = true;
      this.emitDirection();
    });
    this.leftZone.on('pointerup', () => {
      this.leftDown = false;
      this.emitDirection();
    });
    this.leftZone.on('pointerout', () => {
      this.leftDown = false;
      this.emitDirection();
    });
    this.leftZone.on('pointerupoutside', () => {
      this.leftDown = false;
      this.emitDirection();
    });

    this.rightZone.on('pointerdown', () => {
      this.rightDown = true;
      this.emitDirection();
    });
    this.rightZone.on('pointerup', () => {
      this.rightDown = false;
      this.emitDirection();
    });
    this.rightZone.on('pointerout', () => {
      this.rightDown = false;
      this.emitDirection();
    });
    this.rightZone.on('pointerupoutside', () => {
      this.rightDown = false;
      this.emitDirection();
    });

    this.cursors = scene.input.keyboard?.createCursorKeys();

    scene.input.on('pointerup', this.handleGlobalPointerUp, this);
  }

  private handleGlobalPointerUp() {
    if (!this.leftDown && !this.rightDown) return;
    this.leftDown = false;
    this.rightDown = false;
    this.emitDirection();
  }

  private emitDirection() {
    const dir = this.getDirection();
    if (dir === this.lastDir) return;
    this.lastDir = dir;
    gameEvents.emit(EVENTS.INPUT_DIR, dir);
  }

  public update() {
    if (!this.cursors) return;
    const dir = this.getDirection();
    if (dir === this.lastDir) return;
    this.lastDir = dir;
    gameEvents.emit(EVENTS.INPUT_DIR, dir);
  }

  private getDirection(): number {
    if (this.leftDown) return -1;
    if (this.rightDown) return 1;
    if (this.cursors?.left?.isDown) return -1;
    if (this.cursors?.right?.isDown) return 1;
    return 0;
  }

  destroy() {
    this.scene.input.off('pointerup', this.handleGlobalPointerUp, this);
    this.leftZone.destroy();
    this.rightZone.destroy();
  }
}
