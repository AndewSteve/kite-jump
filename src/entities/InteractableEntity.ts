import Phaser from 'phaser';
import type { IEntityAction, InteractionContext } from '../actions/ActionInterfaces';
import Player from '../entities/Player'; // 只需要引入 Player 类型
import { EntityType, type IEntityConfig } from '../types/GameTypes';

export default class InteractableEntity extends Phaser.Physics.Arcade.Sprite {
  private actions: IEntityAction[] = [];
  private isInteracted: boolean = false;
  public entityType: string = EntityType.Neutral; // ✅ 新增属性

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  // ✅ Getter
  public get arcadeBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * 通用初始化方法
   * 无论是云、鸟、金币，都通过这个方法配置
   */
  public configure(config: IEntityConfig) {
    this.entityType = config.type; // ✅ 记录类型
    // 1. 视觉设置
    this.setTexture(config.texture);
    if (config.color !== undefined) this.setTint(config.color);
    // 重置缩放 (防止继承上一个对象的缩放)
    this.setScale(config.scale !== undefined ? config.scale : 1);
    
    this.setAlpha(1);
    this.setVisible(true);
    this.setActive(true);

    // 2. 物理设置 (默认设置为静态物体，如果需要动态物体可以扩展 Config)
    if (this.arcadeBody) {
      this.arcadeBody.enable = true;
      this.arcadeBody.setAllowGravity(false);
      this.arcadeBody.setImmovable(true);
      this.arcadeBody.setVelocity(0, 0); // 确保速度清零

      // ✅✅✅ 核心修复：强制同步物理框大小与贴图一致
      // 这一步非常关键，因为 setTexture 不会自动改 Body
      this.setSize(this.width, this.height);
      
      // ✅ 确保偏移归零 (防止之前的 offset 残留导致框偏到左上角)
      this.setOffset(0, 0);
    }

    // 3. 行为注入
    this.actions = config.actions;
    this.isInteracted = false;
  }

  /**
   * 碰撞回调
   */
  public onHit(player: Player) {
    if (this.isInteracted) return;
    this.isInteracted = true;

    // ✅ 核心修复：立即刹车！
    // 无论之前是被磁场吸过来的，还是原本就在动，这一刻必须停下
    if (this.arcadeBody) {
        this.arcadeBody.setVelocity(0, 0); // 速度归零
        this.arcadeBody.stop();            // 停止物理模拟
        this.arcadeBody.enable = false;    // 禁用物理体，防止二次碰撞
    }

    // 构建上下文
    const context: InteractionContext = {
      target: this,
      player: player,
      scene: this.scene,
      isCancelled: false
    };

    for (const action of this.actions) {
        // ✅ 如果之前的 Action (比如曹魏转化) 已经把物体销毁/禁用了
        // 后面的伤害逻辑就不应该执行了
        if (!this.active) break; 
        if (context.isCancelled) break;
        action.execute(context);
    }
  }

  /**
   * 回收/禁用
   */
  public disable() {
    this.setVisible(false);
    this.setActive(false);
    if (this.arcadeBody) {
        this.arcadeBody.enable = false;
    }
  }
}