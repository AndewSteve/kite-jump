import Phaser from 'phaser';
import type { IAction, InteractionContext } from '../actions/ActionInterfaces';
import Player from '../entities/Player'; // 只需要引入 Player 类型

// 配置接口：用于初始化实体
export interface EntityConfig {
  texture: string;    // 图片 key
  color?: number;     // 染色 (可选)
  scale?: number;     // 缩放 (可选)
  actions: IAction[]; // ✅ 核心：挂载的行为列表
}

export default class InteractableEntity extends Phaser.Physics.Arcade.Sprite {
  private actions: IAction[] = [];
  private isInteracted: boolean = false;

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
  public configure(config: EntityConfig) {
    // 1. 视觉设置
    this.setTexture(config.texture);
    if (config.color !== undefined) this.setTint(config.color);
    if (config.scale !== undefined) this.setScale(config.scale);
    
    this.setAlpha(1);
    this.setVisible(true);
    this.setActive(true);

    // 2. 物理设置 (默认设置为静态物体，如果需要动态物体可以扩展 Config)
    if (this.arcadeBody) {
        this.arcadeBody.enable = true;
        this.arcadeBody.setAllowGravity(false);
        this.arcadeBody.setImmovable(true);
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

    // 构建上下文
    const context: InteractionContext = {
      target: this,
      player: player,
      scene: this.scene
    };

    // ⚡️ 执行所有挂载的行为
    this.actions.forEach(action => action.execute(context));
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