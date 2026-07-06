"use client";

/** 客户端图片压缩：最长边 ≤800px，输出 jpeg dataURL（配合 /api/upload 的 2MB 上限） */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > height && width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        else if (height > width && height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        else if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
