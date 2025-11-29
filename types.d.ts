// Basic definition to satisfy TS if missing from lib
interface OffscreenCanvas extends EventTarget {
    width: number;
    height: number;
    getContext(contextId: "2d", options?: any): OffscreenCanvasRenderingContext2D | null;
    convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob>;
}

interface OffscreenCanvasRenderingContext2D extends CanvasState, CanvasTransform, CanvasCompositing, CanvasImageSmoothing, CanvasFillStrokeStyles, CanvasShadowStyles, CanvasRect, CanvasDrawPath, CanvasText, CanvasDrawImage, CanvasImageData, CanvasPathDrawingStyles {
    readonly canvas: OffscreenCanvas;
}

declare var OffscreenCanvas: {
    prototype: OffscreenCanvas;
    new(width: number, height: number): OffscreenCanvas;
};
