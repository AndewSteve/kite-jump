import Phaser from 'phaser';
import Player from '../entities/Player';
import type InteractableEntity from '../entities/InteractableEntity'; // 稍后定义

// 交互上下文：包含触发瞬间的所有信息
export interface InteractionContext {
  target: InteractableEntity; // 被撞的物体 (比如云)
  player: Player;             // 撞人的玩家
  scene: Phaser.Scene;        // 场景引用
}

// 行为接口
export interface IAction {
  // 执行逻辑
  execute(context: InteractionContext): void;
}