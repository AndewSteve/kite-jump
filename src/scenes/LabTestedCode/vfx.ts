// // ✅ 创建特效
    // this.createAlphaTest();

    // // ✅ 1. 注册 Pipeline（仅 WebGL 支持）
    // // 检查是否已经存在，防止热重载或切场景报错
    // this.magicPipeline = this.renderManager.getPipeline<MagicFieldPipeline>(PipelineID.MagicField) || undefined;
    // if (this.magicPipeline) {
    //   this.createVFXTest();
    // } else {
    //   console.warn("⚠️ MagicFieldPipeline not found!");
    // }


  // createAlphaTest() {
  //   const frameCount = 59;
  //   const frameKeys: string[] = [];

  //   for (let i = 1; i <= frameCount; i++) {
  //     const frame = String(i).padStart(3, '0');
  //     frameKeys.push(`video_alpha_${frame}`);
  //   }

  //   if (!this.textures.exists(frameKeys[0])) {
  //     console.warn('Alpha test frames not loaded.');
  //     return;
  //   }

  //   const animKey = 'alpha_webp_test';
  //   if (!this.anims.exists(animKey)) {
  //     this.anims.create({
  //       key: animKey,
  //       frames: frameKeys.map((key) => ({ key })),
  //       frameRate: 30,
  //       repeat: -1
  //     });
  //   }

  //   // ✅ 修改特效属性
  //   // 不需要 setScrollFactor(0)，因为我们要它在世界坐标中跟随玩家
  //   this.alphaTestSprite = this.add.sprite(0, 0, frameKeys[0]);
  //   this.alphaTestSprite.setDepth(9000);
  //   this.alphaTestSprite.play(animKey);

  //   // ✅ 缩放 0.2 倍
  //   this.alphaTestSprite.setScale(0.2);
  //   this.alphaTestSprite.setAlpha(0.8); // 半透明效果

  //   // ✅ 倒转 180 度
  //   this.alphaTestSprite.setAngle(180); 
  // }

  // private createVFXTest() {
  //   console.log("🧪 Starting VFX Test: Polar Shield");

  //   // ----------------------------------------------------
  //   // 核心：极坐标护盾
  //   // ----------------------------------------------------
  //   // 注意：TextureKeys.VfxNoiseBar 对应那张“长条形”的噪点图
  //   this.shieldSprite = this.add.sprite(this.player.x, this.player.y, VFXTextureKeys.VfxNoiseBar);
    
  //   // 应用 Pipeline
  //   this.shieldSprite.setPipeline(PipelineID.MagicField);
    
  //   // 设置属性
  //   this.shieldSprite.setScale(1.5); // 大小
  //   this.shieldSprite.setAlpha(1.0);
  //   this.shieldSprite.setDepth(9000);

  //   const randomOffset = Math.floor(Math.random() * 255); // 0 ~ 255 之间的随机整数
  //   // 参数: (R, G, B)
  //   // R: 随机数 (shader 里会被还原成 0.0~1.0 并乘以 100 做偏移)
  //   // G, B: 设为 255 (白色) 即可，反正我们在 Shader 里忽略了它们
  //   const tintColor = Phaser.Display.Color.GetColor(randomOffset, 255, 255);
  //   this.shieldSprite.setTint(tintColor);

  //   // ✅ 混合模式现在可以用了！
  //   // ADD 模式会让青色发光更强
  //   this.shieldSprite.setBlendMode(Phaser.BlendModes.ADD);

  //   // ----------------------------------------------------
  //   // 辅助：中心发光 (可选)
  //   // ----------------------------------------------------
  //   // 可以在中心加一个简单的光点，增强层次感
  //   // const core = this.add.sprite(this.player.x, this.player.y, TextureKeys.Cloud);
  //   // core.setScale(0.5).setTint(0x00ffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(9001);
  // }