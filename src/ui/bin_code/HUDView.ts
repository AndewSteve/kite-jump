// import Phaser from 'phaser';
// import { TextureKeys, UITextureKeys } from '../../config/AssetKeys';
// import UIEffectController from '../UIEffectController';
// import { EntityTextureScale } from '../../config/EntityConfig';

// export default class HUDView extends Phaser.GameObjects.Container {
//   private heightText!: Phaser.GameObjects.Text;
//   private scoreText!: Phaser.GameObjects.Text;
//   private coldText!: Phaser.GameObjects.Text;
//   private pauseBtn!: Phaser.GameObjects.Container;
  
//   // 特效控制器
//   private coinEffect: UIEffectController;
//   private heightEffect: UIEffectController;

//   // 回调函数
//   public onPauseClick?: () => void;

//   constructor(scene: Phaser.Scene, width: number) {
//     super(scene, 0, 0);

//     // --- 1. 顶部背景条 ---
//     // 高度稍微调小一点，显得更精致
//     const topFrame = scene.add.image(width / 2, 0, UITextureKeys.UITopFrame).setOrigin(0.5, 0);
//     topFrame.setDisplaySize(width * 0.8, 90); 
//     this.add(topFrame);

//     // --- 2. 状态信息容器 (居中) ---
//     // Y坐标设为 45，确保在背景条中间
//     const infoContainer = scene.add.container(width / 2, 45);
    
//     // 布局参数：缩小间距以防挤出屏幕
//     // 假设屏幕宽 720，0.28大约是200像素，左右各200，刚好
//     const spacingX = width * 0.28; 
    
//     const textStyle = { 
//         fontSize: '22px', // 字体微调小一点点
//         color: '#ffffff', 
//         fontStyle: 'bold', 
//         fontFamily: 'monospace', 
//         stroke: '#000000', 
//         strokeThickness: 3
//     };
//     const iconScale = 0.18;

//     // --- 左：寒冷值 ---
//     // Icon 锚点设为中心 (0.5, 0.5)，Text 锚点设为左中 (0, 0.5)
//     // 这样只要 Y=0，它们就在一条水平线上
//     const leftX = -spacingX;
//     const hourGlass = scene.add.sprite(leftX, 0, UITextureKeys.UIHourglassIcon)
//         .setScale(iconScale)
//         .setOrigin(0.5, 0.5); // ✅ 垂直居中关键
    
//     this.coldText = scene.add.text(leftX + 20, 0, "0°C", { ...textStyle, color: '#00FFFF' })
//         .setOrigin(0, 0.5);   // ✅ 垂直居中关键

//     // --- 中：高度 ---
//     const midX = 0;
//     const mountain = scene.add.sprite(midX - 35, 0, UITextureKeys.UIMountainIcon)
//         .setScale(iconScale)
//         .setOrigin(0.5, 0.5);

//     this.heightText = scene.add.text(midX - 10, 0, "0m", textStyle)
//         .setOrigin(0, 0.5);
    
//     // --- 右：分数 ---
//     const rightX = spacingX;
//     const bamboo = scene.add.sprite(rightX, 0, TextureKeys.Bamboo) // 确保 TextureKeys.Bamboo 字符串一致
//         .setScale(EntityTextureScale * 0.45) // 竹子图可能比较大，适当调整
//         .setOrigin(0.5, 0.5);
        
//     this.scoreText = scene.add.text(rightX + 25, 0, "0", { ...textStyle, color: '#FFD700' })
//         .setOrigin(0, 0.5);

//     infoContainer.add([hourGlass, this.coldText, mountain, this.heightText, bamboo, this.scoreText]);
//     this.add(infoContainer);

//     // --- 3. 暂停按钮 (绝对定位到右上角) ---
//     // 不放在 infoContainer 里，避免受居中偏移影响
//     this.createPauseButton(scene, width);

//     // --- 4. 初始化特效 ---
//     this.heightEffect = new UIEffectController(scene, [mountain, this.heightText], { glowColor: 0x00ffff });
//     this.coinEffect = new UIEffectController(scene, [bamboo, this.scoreText], { glowColor: 0xffd700 });
    
//     scene.add.existing(this);
//   }

//   private createPauseButton(scene: Phaser.Scene, width: number) {
//     // 放在屏幕最右侧 - 50px 的位置，高度与 infoContainer 一致 (45)
//     this.pauseBtn = scene.add.container(width - 50, 45);
    
//     const bg = scene.add.circle(0, 0, 22, 0x000000, 0.5).setStrokeStyle(2, 0xffffff);
//     // 两条竖线
//     const line1 = scene.add.rectangle(-5, 0, 5, 18, 0xffffff);
//     const line2 = scene.add.rectangle(5, 0, 5, 18, 0xffffff);
    
//     this.pauseBtn.add([bg, line1, line2]);
//     this.pauseBtn.setSize(44, 44); // 扩大一点点击区域
//     this.add(this.pauseBtn);

//     bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
//       // 点击反馈
//       scene.tweens.add({
//           targets: this.pauseBtn,
//           scale: 0.9,
//           duration: 50,
//           yoyo: true
//       });
//       if (this.onPauseClick) this.onPauseClick();
//     });
    
//     this.pauseBtn.setVisible(false); 
//   }

//   // --- 公共 API ---

//   public updateHeight(val: number) {
//     this.heightText.setText(`${Math.floor(val)}m`);
//     this.heightEffect.trigger();
//   }

//   public updateScore(val: number) {
//     this.scoreText.setText(`${Math.floor(val)}`);
//     this.coinEffect.trigger();
//   }

//   public updateColdness(val: number) {
//     this.coldText.setText(`${Math.floor(val)}°C`);
//     this.coldText.setColor(val > 80 ? '#FF0000' : '#00FFFF');
//   }

//   public setPauseButtonVisible(visible: boolean) {
//     this.pauseBtn.setVisible(visible);
//   }

//   public update(dt: number) {
//     this.coinEffect.update(dt);
//     this.heightEffect.update(dt);
//   }
// }