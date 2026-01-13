import Phaser from 'phaser';
import Player from '../entities/Player';

export default class PlayerStatusUI {
  private scene: Phaser.Scene;
  private player: Player;
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    // 创建画笔，层级设高
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);
  }

  public update() {
    this.graphics.clear();
    const x = this.player.x;
    const y = this.player.y;
    const state = this.player.playerState;

    // --- 尺寸配置 ---
    // 之前的 radius 是 40
    
    // 1. 外层：寒冷值 (变大)
    // 半径加大到 60
    const coldRadius = 60; 
    const coldPercent = state.coldness / 100;
    
    let coldColor = 0x00ffff; // 青色
    if (state.coldness > 80) coldColor = 0xff00ff; // 紫
    else if (state.coldness > 55) coldColor = 0x0000ff; // 蓝

    this.graphics.lineStyle(12, coldColor, 0.8); // 线条稍微加粗
    this.graphics.beginPath();
    this.graphics.arc(x, y, coldRadius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * coldPercent));
    this.graphics.strokePath();

    // 2. 内层：冲刺值 (黄色)
    // 既然要 "内径再缩小，外径稍微缩小"，意味着它比以前更小、更紧凑，且与外层有明显空隙
    // 设半径为 35 (原来是 40)
    const dashRadius = 35;
    const dashPercent = state.dashEnergy / 100;

    this.graphics.lineStyle(12, 0xffd700, 0.8);
    this.graphics.beginPath();
    this.graphics.arc(x, y, dashRadius, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * dashPercent));
    this.graphics.strokePath();

    // 3. 满能量特效
    if (state.dashEnergy >= 100) {
        this.graphics.fillStyle(0xffd700, 0.3);
        this.graphics.fillCircle(x, y, dashRadius - 5);
    }
  }

  public destroy() {
    this.graphics.destroy();
  }
}