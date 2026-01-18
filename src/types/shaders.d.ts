// src/shaders.d.ts

// 告诉 TS，所有以 .frag 结尾的文件，导入后都是一个字符串
declare module '*.frag' {
    const value: string;
    export default value;
}

declare module '*.vert' {
    const value: string;
    export default value;
}

declare module '*.glsl' {
    const value: string;
    export default value;
}