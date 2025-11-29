

export class ImageProcessor {

    async compressToWebP(imageBuffer: ArrayBuffer, quality: number): Promise<ArrayBuffer> {
        // 创建 Blob
        const blob = new Blob([imageBuffer]);

        // 1. 使用 createImageBitmap (比 new Image() 更快，且支持 Worker)
        // 注意：Obsidian 桌面端 (Chrome) 完全支持此 API
        const bitmap = await createImageBitmap(blob);

        const width = bitmap.width;
        const height = bitmap.height;

        let canvas: OffscreenCanvas | HTMLCanvasElement;
        let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

        // 2. 优先使用 OffscreenCanvas
        if (typeof OffscreenCanvas !== 'undefined') {
            canvas = new OffscreenCanvas(width, height);
            ctx = canvas.getContext('2d');
        } else {
            // 只有在不支持 OffscreenCanvas 的环境（极少数旧环境）才回退
            // 注意：如果在 Web Worker 中运行，这里会报错，因为没有 document
            if (typeof document !== 'undefined') {
                canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                ctx = canvas.getContext('2d');
            } else {
                throw new Error('Canvas not supported in this environment');
            }
        }

        if (!ctx) {
            bitmap.close(); // 释放内存
            throw new Error('Could not get canvas context');
        }

        // 3. 绘制
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close(); // 绘制完成后立即释放 bitmap 内存

        // 4. 导出为 WebP
        if (canvas instanceof OffscreenCanvas) {
            const outBlob = await canvas.convertToBlob({ type: 'image/webp', quality });
            return await outBlob.arrayBuffer();
        } else {
            return new Promise((resolve, reject) => {
                (canvas as HTMLCanvasElement).toBlob((outBlob) => {
                    if (outBlob) {
                        outBlob.arrayBuffer().then(resolve).catch(reject);
                    } else {
                        reject(new Error('Canvas toBlob failed'));
                    }
                }, 'image/webp', quality);
            });
        }
    }
}
