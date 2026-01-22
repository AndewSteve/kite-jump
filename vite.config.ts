import { defineConfig } from 'vite';

export default defineConfig({
  // 🔴 重点：必须改为相对路径 './' 或 空字符串 ''
  // 否则在 Android Webview 中会尝试从根目录寻找 /assets，导致 404
  base: './', 
  
  build: {
    outDir: 'dist',
    // ... 其他配置
  },
  // ...
});
