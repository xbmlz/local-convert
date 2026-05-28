declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: ArrayBuffer | Uint8Array;
    format?: 'JPEG' | 'PNG';
    quality?: number;
  }
  export default function heicConvert(options: HeicConvertOptions): Promise<ArrayBuffer>;
}
