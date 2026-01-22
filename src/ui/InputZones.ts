import Phaser from 'phaser';
import { EVENTS, gameEvents } from '../config/Events';

// 定义一个简单的接口，只需要对象有 x 坐标即可
// 这样不需要导入具体的 Player 类，避免循环依赖
export interface IControlTarget {
  x: number;
}

export default class InputZones {
  private scene: Phaser.Scene;
  private target: IControlTarget; // 存储风筝/玩家的引用
  
  private isDown: boolean = false; // 是否正在按压
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastDir = 0;
  private inputZone: Phaser.GameObjects.Zone;

  // 灵敏度死区：防止手指正好按在风筝上时左右鬼畜抖动
  private readonly DEAD_ZONE = 10; 

  /**
   * @param scene 场景
   * @param target 被控制的对象（必须包含 x 属性），通常传入 this.player
   */
  constructor(scene: Phaser.Scene, target: IControlTarget) {
    this.scene = scene;
    this.target = target;
    const { width, height } = scene.scale;

    // 1. 创建全屏触控区
    // 深度设为极低，确保作为背景层接收输入，不阻挡 UI 按钮
    this.inputZone = scene.add.zone(width / 2, height / 2, width, height);
    this.inputZone.setScrollFactor(0).setDepth(-999);
    this.inputZone.setInteractive();

    // 2. 绑定事件
    // 按下时标记状态，并立即触发一次方向检测
    this.inputZone.on('pointerdown', () => {
      this.isDown = true;
      this.emitDirection();
    });

    // 各种松开的情况
    this.inputZone.on('pointerup', this.handleUp, this);
    this.inputZone.on('pointerupoutside', this.handleUp, this);
    
    // 全局松开作为保险
    scene.input.on('pointerup', this.handleUp, this);

    // 3. 键盘备用 (保持原有键盘逻辑)
    this.cursors = scene.input.keyboard?.createCursorKeys();
  }

  private handleUp() {
    if (!this.isDown) return;
    this.isDown = false;
    this.emitDirection();
  }

  private emitDirection() {
    const dir = this.getDirection();
    // 只有方向改变时才发送事件，优化性能
    if (dir === this.lastDir) return;
    this.lastDir = dir;
    gameEvents.emit(EVENTS.INPUT_DIR, dir);
  }

  public update() {
    // 每一帧都检测，确保如果风筝飞过了手指位置，方向会实时反转
    const dir = this.getDirection();
    if (dir === this.lastDir) return;
    this.lastDir = dir;
    gameEvents.emit(EVENTS.INPUT_DIR, dir);
  }

  private getDirection(): number {
    // A. 优先检测触摸/鼠标
    if (this.isDown) {
      const pointer = this.scene.input.activePointer;
      // 使用 worldX 以兼容摄像机移动
      const targetX = pointer.worldX;
      const currentX = this.target.x;
      
      const diff = targetX - currentX;

      // 如果距离非常近（死区内），则不移动，防止抖动
      if (Math.abs(diff) < this.DEAD_ZONE) {
        return 0;
      }

      // 返回 1 (向右) 或 -1 (向左)
      return Math.sign(diff);
    }

    // B. 如果没有触摸，检测键盘 (作为备用/PC端控制)
    if (this.cursors?.left?.isDown) return -1;
    if (this.cursors?.right?.isDown) return 1;

    return 0;
  }

  destroy() {
    this.scene.input.off('pointerup', this.handleUp, this);
    this.inputZone.destroy();
  }
}