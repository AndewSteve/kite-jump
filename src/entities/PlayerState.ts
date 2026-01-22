import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import Player from './Player';
import StatSystem from '../mechanics/StatSystem';
import BuffManager from '../managers/BuffManager';
import { ModifierType, StatType } from '../mechanics/StatDefinitions';
import DataManager from '../managers/DataManager';
import { DashConfig, DashLv1Buff, DashLv2Buff, DashLv3Buff, TacticsConfig, TransitionDashConfig } from '../config/BuffConfig';
import { KiteConfigs } from '../config/KiteBuffConfig';
import { EVENTS, gameEvents } from '../config/Events';
import { SummonId } from '../config/SummonConfig';
import type { BaseSummon } from './summons/BaseSummon';

export default class PlayerState {
  private player: Player;
  private initialY: number; // ✅ 记录出生高度

  // ✅ 核心系统 (移到这里)
  public stats: StatSystem;
  public buffs: BuffManager;
  
  // 核心数值
  public health: number = 3;
  public maxHealth: number = 3;
  public coldness: number = 0;      // 0 - 100
  public dashEnergy: number = 0;    // 0 - 100

  private shieldEffect: BaseSummon | null = null;
  private wasDashing: boolean = false;

  public get isInvincible(): boolean {
    return this.buffs.hasTag('State.Invincible');
  }

  // ✅ 快捷 getter
  public get isTransitioning(): boolean {
    return this.buffs.hasTag('State.Transition');
  }
  
  // 状态标记
  public get isDashing(): boolean {
    return this.buffs.hasTag('State.Dash');
  }

  constructor(player: Player) {
    this.player = player;
    this.initialY = player.y;

    // 1. 初始化数值系统
    this.stats = new StatSystem();
    this.buffs = new BuffManager(player, this.stats);

    // 2. 注入基础属性 (Base Stats)
    this.initBaseStats();

    gameEvents.on(EVENTS.ADD_SHIELD, this.handleAddShield, this);
    gameEvents.on(EVENTS.REMOVE_SHIELD, this.handleRemoveShield, this);
  }

  private initBaseStats() {
    this.stats.initStat(StatType.MaxHealth, GameConfig.player.maxHealth);

    this.stats.initStat(StatType.MoveSpeed, GameConfig.player.moveSpeed);
    this.stats.initStat(StatType.Acceleration, GameConfig.player.acceleration);
    this.stats.initStat(StatType.GravityScale, 1.0); 
    this.stats.initStat(StatType.Drag, GameConfig.player.dragX);
    this.stats.initStat(StatType.MagnetRange, GameConfig.player.baseRadius);
    this.stats.initStat(StatType.GoldMagnetRange, GameConfig.player.baseRadius);

    this.stats.initStat(StatType.ColdGrowthRate, 1.0);
    this.stats.initStat(StatType.DashDurationIncrease, 0.0);
    this.stats.initStat(StatType.CoinMultiplier, 1.0);
    // ✅ 新增：初始化风力为 0
    this.stats.initStat(StatType.EnvironmentWindX, 0);
    this.stats.initStat(StatType.EnvironmentWindY, 0);
    // ✅ 注入局外成长 (Meta Progression)
    // 也可以做成 Modifier，这里直接改 Base 比较方便
    // 比如：StatType.MagnetRange 的 Base += 局外加成
    const currentMag = this.stats.get(StatType.MagnetRange);
    this.stats.setBaseValue(StatType.MagnetRange, currentMag + DataManager.getHitboxRadiusBonus());
    const currentGoldMag = this.stats.get(StatType.GoldMagnetRange);
    this.stats.setBaseValue(StatType.GoldMagnetRange, currentGoldMag + DataManager.getHitboxRadiusBonus());
    const currentMaxHealth = this.stats.get(StatType.MaxHealth);
    this.maxHealth = currentMaxHealth;
    this.health = currentMaxHealth;
  }

  public initBuffs() {
    // ✅ 应用风筝被动 (三国改装)
    const kiteSelection = DataManager.data.selectedKite; // 默认无风筝
    const kiteConfig = KiteConfigs[kiteSelection.kiteId];
    if (kiteConfig && kiteConfig.buffFactory) {
      const buffConfig = kiteConfig.buffFactory();
      this.buffs.addBuff(buffConfig);
    }
  }

  update(dt: number) {
    this.refreshShieldRef();
    // 1. 更新 Buff 系统 (转为秒)
    this.buffs.update(dt / 1000);
    this.syncDashShieldState();
    // 2. 更新寒冷值
    this.updateColdness(dt);
    // 4. ✅ 核心：将寒冷值同步到 StatSystem
    // 这样 StatSystem 就聚合了 [基础 + 局外 + Buff + 寒冷] 所有修正
    this.syncColdnessToStats();
  }

  public updateColdness(dt: number) {
    if (this.isDashing) {
      return; // 冲刺期间不增加寒冷
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
    const deltaCold = growthRate * (dt / 1000) * this.stats.get(StatType.ColdGrowthRate);

    this.coldness += deltaCold;
    
    // 限制范围
    this.coldness = Phaser.Math.Clamp(this.coldness, 0, 100);

    // 3. 检查即死判定 (冰封)
    if (this.coldness >= GameConfig.playerState.thresholds.icebound) {
        this.player.die("冰封");
    }

    gameEvents.emit(EVENTS.UPDATE_COLDNESS, this.coldness);
  }

  private syncColdnessToStats() {
    if (this.isDashing) return; // 冲刺期间不应用惩罚
    // 先移除旧的 (每一帧重新计算)
    this.stats.removeModifier(StatType.GravityScale, 'cold_debuff');
    this.stats.removeModifier(StatType.Drag, 'cold_debuff');
    this.stats.removeModifier(StatType.Acceleration, 'cold_debuff');

    // 计算惩罚
    // A. 重力惩罚
    const th = GameConfig.playerState.thresholds;
    const pen = GameConfig.playerState.penalties;
    let gravBonus = 0;
    
    if (this.coldness >= th.chilly) gravBonus += pen.chillyGravity;
    if (this.coldness >= th.frozen) gravBonus += pen.frozenGravity;
    if (this.coldness >= th.extreme) gravBonus += pen.extremeGravity;

    if (this.buffs.hasTag(KiteConfigs.wu.tag)) {
      gravBonus *= KiteConfigs.wu.coldnessMultiplier;
    }

    if (gravBonus > 0) {
      this.stats.addModifier(StatType.GravityScale, {
        sourceId: 'cold_debuff',
        type: ModifierType.PercentAdd,
        value: gravBonus
      });
    }

    // B. 操控惩罚 (冻僵)
    if (this.coldness >= th.frozen) {
      let dragLoss = pen.frozenDrag; // e.g. 0.5
      if (this.buffs.hasTag(KiteConfigs.wu.tag)) {
        dragLoss *= KiteConfigs.wu.coldnessMultiplier;
      }
      // 阻力减少 50%
      this.stats.addModifier(StatType.Drag, {
        sourceId: 'cold_debuff', 
        type: ModifierType.PercentAdd, 
        value: -dragLoss 
      });
      // 加速度减少 50%
      this.stats.addModifier(StatType.Acceleration, {
        sourceId: 'cold_debuff',
        type: ModifierType.PercentAdd,
        value: -dragLoss
      });
    }
  }

  // --- 公共方法 ---
  public addColdness(amount: number) {
    this.coldness += amount;
    this.coldness = Phaser.Math.Clamp(this.coldness, 0, 100);
    gameEvents.emit(EVENTS.UPDATE_COLDNESS, this.coldness);
  }

  public addDashEnergy(amount: number) {
    this.dashEnergy += amount;
    this.dashEnergy = Phaser.Math.Clamp(this.dashEnergy, 0, 100);
    
    // 可以在这里判断：如果满了是否自动释放？或者播放充能特效
    if (this.dashEnergy >= 100) {
        this.activateDash();
    }

    gameEvents.emit(EVENTS.UPDATE_DASH, this.dashEnergy);
  }

  public applyDamage(amount: number) {
    if (this.isDashing || this.isInvincible) {
      console.log("Player is invincible, no damage taken.");
      return;
    }
    this.health -= amount;
    this.health = Phaser.Math.Clamp(this.health, 0, this.maxHealth);
    console.log(`Player took ${amount} damage. Health is now ${this.health}.`);
    gameEvents.emit(EVENTS.UPDATE_LIFE, this.health);
    if (this.health <= 0) {
        this.player.die("损毁");
    }
  }

  public heal(amount: number) {
    this.health += amount;
    this.health = Phaser.Math.Clamp(this.health, 0, this.maxHealth);
    gameEvents.emit(EVENTS.UPDATE_LIFE, this.health);
    console.log(`Player healed ${amount}. Health is now ${this.health}.`);
  }

  public activateDash() {
    if (this.dashEnergy < 100) return; // 需要满能量才能释放

    // this.isDashing = true;
    this.dashEnergy = 0; // 消耗全部能量

    if (this.buffs.hasTag(DashConfig.Lv2.tag)) {
      // Lv2 -> Lv3
      console.log("Upgrade to Lv3: 风神降临!");
      this.buffs.removeByTag(DashConfig.Lv2.tag);
      this.buffs.addBuff(DashLv3Buff);
      // 特效：播放风神特效
    } 
    else if (this.buffs.hasTag(DashConfig.Lv1.tag)) {
      // Lv1 -> Lv2
      console.log("Upgrade to Lv2: 凌空飞燕!");
      this.buffs.removeByTag(DashConfig.Lv1.tag);
      this.buffs.addBuff(DashLv2Buff);
    } 
    else if (!this.isDashing) {
      // 无 -> Lv1
      console.log("Activate Lv1: 雏鹰起飞!");
      this.buffs.addBuff(DashLv1Buff);
    }
    
    // ⚡️ 冲刺效果：清除所有寒冷
    this.addColdness(-this.coldness);

    // ⚡️ 冲刺效果：无敌 & 向上猛冲 (逻辑在 Player.update 里配合)
    // this.player.setVelocityY(GameConfig.playerState.dashSpeed);
    
    console.log("Dash Activated! Coldness Cleared!");
  }

  // --- Getters: 提供给 Player 用于物理计算 ---

  /**
   * ✅ 获取当前环境施加的横向重力
   */
  public getFinalGravityX(): number {
    return this.stats.get(StatType.EnvironmentWindX);
  }

  /**
   * 获取当前的重力
   */
  public getFinalGravityY(): number {
    if (this.isDashing) return 0; // 冲刺时无重力
    const lightnessMult = DataManager.getGravityScale(); // 局外轻盈度
    // buff主要见于syncColdnessToStats
    const buffScale = this.stats.get(StatType.GravityScale);
    const totalScale = lightnessMult * buffScale;
    // ✅ 叠加环境力 Y (比如漩涡向上的吸力)
    const envForceY = this.stats.get(StatType.EnvironmentWindY);
    return GameConfig.physics.gravity.y * (totalScale - 1) + envForceY;
  }

  /**
   * 获取操控灵敏度倍率 (1.0 = 正常, 0.5 = 迟钝)
   */
  public getControlModifier(): number {
    if (this.coldness >= GameConfig.playerState.thresholds.frozen) {
      return 1.0 - GameConfig.playerState.penalties.frozenDrag;
    }
    return 1.0;
  }
  
  public getFinalDragX(): number {
    // if (this.isDashing) return 2.0; // 冲刺时操控极度灵敏！
    return this.stats.get(StatType.Drag);
  }

  public getDashSpeed(): number {
    if (this.buffs.hasTag(DashConfig.Lv1.tag)) return DashConfig.Lv1.speed;
    else if (this.buffs.hasTag(DashConfig.Lv3.tag)) return DashConfig.Lv3.speed;
    else if (this.buffs.hasTag(DashConfig.Lv2.tag)) return DashConfig.Lv2.speed;
    else if (this.isTransitioning) return TransitionDashConfig.speed;
    console.warn("getDashSpeed called but no Dash buff active.");
    return 0;
  }

  public getFinalAcceleration(): number {
    const baseAccel = this.stats.get(StatType.Acceleration);
    return baseAccel * this.getVelocityMultiplier() * GameConfig.player.verticalToHorizontalRatio;
  }

  private getVelocityMultiplier(): number {
    if (this.player.body == null) return 1.0;
    // 获取当前垂直速度绝对值 (无论上升还是下落)
    const currentVy = Math.abs(this.player.body.velocity.y);
    const refSpeed = GameConfig.playerState.velocityScalingRef;
    return 1 + (currentVy / refSpeed);
  }

  public getXMaxSpeed(): number {
    const baseSpeed = this.stats.get(StatType.MoveSpeed);
    return baseSpeed * this.getVelocityMultiplier();
  }

  public getMagnetRadius(): number {
    return this.stats.get(StatType.MagnetRange);
  }

  public getGoldMagnetRadius(): number {
    return this.stats.get(StatType.GoldMagnetRange);
  }

  public getStartBoostForce(): number {
    return GameConfig.player.startForce;
  }

  public destroy() {
    gameEvents.off(EVENTS.ADD_SHIELD, this.handleAddShield, this);
    gameEvents.off(EVENTS.REMOVE_SHIELD, this.handleRemoveShield, this);
  }

  private syncDashShieldState() {
    const isDashingNow = this.isDashing;
    if (!this.wasDashing && isDashingNow) {
      this.ensureShieldSummoned();
    } else if (this.wasDashing && !isDashingNow) {
      if (!this.buffs.hasTag(TacticsConfig.tag)) {
        this.removeShield();
      }
    }
    this.wasDashing = isDashingNow;
  }

  private handleAddShield() {
    this.ensureShieldSummoned();
  }

  private handleRemoveShield() {
    if (!this.isDashing) {
      this.removeShield();
    }
  }

  private ensureShieldSummoned() {
    if (this.shieldEffect && this.shieldEffect.active) return;
    const summonManager = (this.player.scene as any).summonManager;
    if (!summonManager) return;
    const summoned = summonManager.summon(
      SummonId.Shield,
      this.player.x,
      this.player.y,
      { lifeTime: -1 }
    );
    if (summoned) {
      this.shieldEffect = summoned;
    }
  }

  private removeShield() {
    if (this.shieldEffect && this.shieldEffect.active) {
      this.shieldEffect.despawn();
    } else {
      this.shieldEffect = null;
    }
  }

  private refreshShieldRef() {
    if (this.shieldEffect && !this.shieldEffect.active) {
      this.shieldEffect = null;
    }
  }
}
