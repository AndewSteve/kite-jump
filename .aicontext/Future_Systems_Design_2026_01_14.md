好的，我已经将这三个**待落地**的高级系统方案（特效管理、数据/数值成长、地图生成）整理成了独立的架构设计文档。

你可以将以下内容保存为 `Future_Systems_Design_2026_01_14.md`，等到策划案细节敲定后，直接按图索骥进行开发。

---

# Kite Jump - 进阶系统架构设计方案 (待落地)

**日期**: 2026-01-14
**状态**: 规划中 (Pending Implementation)
**概述**: 本文档详细描述了游戏后期的三个核心扩展模块：视觉特效管理、数值成长与Buff系统、以及基于高度的地图生成系统。

---

## 一、 视觉特效系统 (Visual System)

**核心目标**: 实现粒子、序列帧动画、拖尾特效的统一管理，并与物理逻辑解耦。

### 1.1 核心架构：VisualManager

* **定位**: 全局单例（或 Scene 级 Manager），负责资源的预加载、对象池维护和播放接口。
* **策略**: **"替换法" (Spawn & Replace)**。
* 当物理实体（如云朵）被触发时，立即禁用/回收物理实体。
* 在原位置生成一个纯视觉对象（Sprite/Emitter）播放动画。
* 视觉对象播完即销毁，互不干扰。



### 1.2 代码设计预览

**VisualManager.ts (骨架)**

```typescript
export default class VisualManager {
  private scene: Phaser.Scene;
  private emitters: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initAnims();
    this.initParticles();
  }

  // 1. 注册动画
  private initAnims() {
    this.scene.anims.create({ key: 'poof', frames: ..., hideOnComplete: true });
  }

  // 2. 播放一次性特效 (替换逻辑用)
  public playOneShot(key: string, x: number, y: number) {
    const vfx = this.scene.add.sprite(x, y, 'vfx_atlas');
    vfx.play(key);
    vfx.once('animationcomplete', () => vfx.destroy());
  }

  // 3. 控制拖尾 (Player调用)
  public toggleTrail(target: any, enable: boolean) {
    const emitter = this.emitters['trail'];
    if (enable) {
      emitter.startFollow(target);
      emitter.start();
    } else {
      emitter.stop();
    }
  }
}

```

**VisualEffectAction.ts (原子动作)**

```typescript
export class VisualEffectAction implements IAction {
  constructor(private vfxKey: string) {}

  execute(ctx: InteractionContext) {
    // 调用 VisualManager 在目标位置播放特效
    const vm = (ctx.scene as any).visualManager;
    vm.playOneShot(this.vfxKey, ctx.target.x, ctx.target.y);
  }
}

```

---

## 二、 数据与数值系统 (Data & Stats System)

**核心目标**: 处理“局外成长”（存档）与“局内状态”（Buff/Debuff），采用类似 RPG 的数值计算管线。

### 2.1 局外成长：DataManager (Persistence)

负责存档的读写，并将存档等级转换为基础数值系数。

**SaveData.ts**

```typescript
export interface UserSaveData {
  currency: number;
  upgrades: {
    heatResistLevel: number; // 抗寒等级
    dashCdLevel: number;     // 冲刺冷却等级
  }
}

```

**数值注入 (PlayerState)**

```typescript
// 在计算时注入存档修正
const baseRate = GameConfig.playerState.coldBaseRate;
// getHeatResistance() 根据存档等级返回 0.9, 0.8 等系数
const actualRate = baseRate * DataManager.getHeatResistance(); 

```

### 2.2 局内状态：Modifier System (RPG数值)

不直接修改属性，而是通过 **Base + Buffs = Final** 的方式计算。

**StatusEffect.ts (Buff定义)**

```typescript
export enum EffectType { Shield, Heavy, Boost }

export class StatusEffect {
  constructor(public type: EffectType, public duration: number, public value: number) {}
  update(dt: number): boolean { /* 倒计时逻辑 */ }
}

```

**ApplyBuffAction.ts (动作)**

```typescript
// 替代原本直接改数值的 Action
export class ApplyBuffAction implements IAction {
  execute(ctx: InteractionContext) {
    ctx.player.state.addEffect(new StatusEffect(...));
  }
}

```

**PlayerState.ts (计算容器)**

```typescript
export default class PlayerState {
  private effects: StatusEffect[] = [];

  // 获取最终重力倍率 (钩子方法)
  public getGravityMultiplier(): number {
    let mult = 1.0;
    // 1. 加上寒冷惩罚
    if (this.coldness > 50) mult += 0.3;
    // 2. 加上 Buff 修正
    const heavy = this.effects.find(e => e.type === EffectType.Heavy);
    if (heavy) mult += heavy.value;
    
    return mult;
  }
}

```

---

## 三、 地图生成系统 (Map Generation System)

**核心目标**: 基于高度动态切换“生物群系 (Biome)”，实现背景平滑过渡和怪物/道具分布的改变。

### 3.1 区域配置 (ZoneConfig)

将原本单一的 `SpawnTable` 拆分为多份。

```typescript
export const WorldZones = [
  {
    minHeight: 0,
    bgTexture: 'bg_sky',
    spawnTable: { normal_cloud: { weight: 100, ... } }
  },
  {
    minHeight: 1000, // 平流层
    bgTexture: 'bg_stratosphere',
    spawnTable: { 
        normal_cloud: { weight: 50 }, 
        bird_enemy: { weight: 20 } // 新增敌人
    }
  }
];

```

### 3.2 背景过渡：BackgroundController

使用 **双层缓冲 (Double Buffering)** 技术实现背景图片的淡入淡出，避免硬切。

* **Layer A (Current)**: Alpha 1
* **Layer B (Next)**: Alpha 0
* **Transition**: Crossfade (A -> Alpha 0, B -> Alpha 1), 然后交换引用。

### 3.3 管理器：ZoneManager

```typescript
export default class ZoneManager {
  public update(height: number) {
    // 检查是否达到下一个区域的高度阈值
    if (height > nextZone.minHeight) {
      this.currentZone = nextZone;
      // 1. 通知背景控制器切换图片
      this.bgController.transitionTo(nextZone.bgTexture);
      // 2. 切换当前的生成表引用
    }
  }
  
  // GameScene 生成物体时调用此方法获取配置
  public getCurrentSpawnTable() {
    return this.currentZone.spawnTable;
  }
}

```

---

这三个系统设计已经解耦完毕，随时可以根据策划案的具体数值和美术资源进行填充开发。