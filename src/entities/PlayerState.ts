import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import Player from './Player';

export default class PlayerState {
  private player: Player;
  private initialY: number; // ✅ 记录出生高度
  
  // 核心数值
  public coldness: number = 0;      // 0 - 100
  public dashEnergy: number = 0;    // 0 - 100
  
  // 状态标记
  public isDashing: boolean = false;
  private dashTimer: number = 0;

  constructor(player: Player) {
    this.player = player;
    this.initialY = player.y;
  }

  update(dt: number) {
    // 1. 处理冲刺状态
    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.endDash();
      }
      // 冲刺期间不增加寒冷，甚至可以回暖
      return; 
    }

    // 2. ✅ 核心修改：基于高度的寒冷增长
    
    // A. 计算当前高度 (米)
    // Phaser 坐标 Y 向上变小，所以是 (初始Y - 当前Y)
    const currentHeightPixels = Math.max(0, this.initialY - this.player.y);
    const heightMeters = currentHeightPixels / GameConfig.level.pixelsPerMeter;

    // B. 应用公式: (Base + Factor * (Height / 1000))
    // 注意：Factor 是 "每1000米"，所以要 heightMeters / 1000
    const growthRate = GameConfig.playerState.coldBaseRate + 
                       (GameConfig.playerState.coldHeightFactor * (heightMeters / 1000));

    // C. 计算本帧增量 (dt 是毫秒，要转秒)
    const deltaCold = growthRate * (dt / 1000);

    this.coldness += deltaCold;
    
    // 限制范围
    this.coldness = Phaser.Math.Clamp(this.coldness, 0, 100);

    // 3. 检查即死判定 (冰封)
    if (this.coldness >= GameConfig.playerState.thresholds.icebound) {
        this.player.die("frozen");
    }
  }

  // --- 公共方法 ---
  public addColdness(amount: number) {
    this.coldness += amount;
    this.coldness = Phaser.Math.Clamp(this.coldness, 0, 100);
  }

  public addDashEnergy(amount: number) {
    this.dashEnergy += amount;
    this.dashEnergy = Phaser.Math.Clamp(this.dashEnergy, 0, 100);
    
    // 可以在这里判断：如果满了是否自动释放？或者播放充能特效
    if (this.dashEnergy >= 100) {
        this.activateDash();
    }
  }

  public activateDash() {
    if (this.dashEnergy < 100) return; // 需要满能量才能释放
    if (this.isDashing) return;

    this.isDashing = true;
    this.dashEnergy = 0; // 消耗全部
    this.dashTimer = GameConfig.playerState.dashDuration;
    
    // ⚡️ 冲刺效果：清除所有寒冷
    this.coldness = 0;

    // ⚡️ 冲刺效果：无敌 & 向上猛冲 (逻辑在 Player.update 里配合)
    this.player.setVelocityY(GameConfig.playerState.dashSpeed);
    
    console.log("Dash Activated! Coldness Cleared!");
  }

  private endDash() {
    this.isDashing = false;
    // 可以在这里加一个无敌结束的缓冲
  }

  // --- Getters: 提供给 Player 用于物理计算 ---

  /**
   * 获取当前的重力倍率
   */
  public getGravityMultiplier(): number {
    if (this.isDashing) return 0; // 冲刺时无重力

    let multiplier = 1.0;
    const th = GameConfig.playerState.thresholds;
    const pen = GameConfig.playerState.penalties;

    // 阶梯式叠加
    if (this.coldness >= th.chilly) multiplier += pen.chillyGravity;
    if (this.coldness >= th.frozen) multiplier += pen.frozenGravity;
    if (this.coldness >= th.extreme) multiplier += pen.extremeGravity;

    return multiplier;
  }

  /**
   * 获取操控灵敏度倍率 (1.0 = 正常, 0.5 = 迟钝)
   */
  public getControlModifier(): number {
    if (this.isDashing) return 2.0; // 冲刺时操控极度灵敏！

    if (this.coldness >= GameConfig.playerState.thresholds.frozen) {
        return 1.0 - GameConfig.playerState.penalties.frozenDrag;
    }
    return 1.0;
  }
}