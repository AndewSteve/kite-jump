import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buptlab.kitejump',
  appName: 'Kite Jump',
  webDir: 'dist',
  server: {
    // 🔴 确保这里没有 "url": "http://..." 之类的配置
    // 🟢 推荐加上这个，让安卓使用 https 协议加载本地文件
    androidScheme: 'https'
  }
};

export default config;
