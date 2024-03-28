const THRESHOLD = 48;

export class ChromaKeyer {
  private _stream: MediaStream | null = null;
  private offscreen: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;

  constructor(stream: MediaStream) {
    if (
      !("MediaStreamTrackProcessor" in window) ||
      !("MediaStreamTrackGenerator" in window)
    ) {
      console.log("Track processing not supported");
      return;
    }

    const inTrack = stream.getVideoTracks()[0];
    // @ts-ignore
    const processor = new MediaStreamTrackProcessor(inTrack);
    // @ts-ignore
    const generator = new MediaStreamTrackGenerator({ kind: "video" });    
    const transformer = new TransformStream({
      transform: this.transform.bind(this),
    });
    processor.readable.pipeThrough(transformer).pipeTo(generator.writable);
    this._stream = new MediaStream([generator, ...stream.getAudioTracks()]);
  }

  get stream(): MediaStream | null {
    return this._stream;
  }

  private async transform(
    inFrame: VideoFrame,
    controller: TransformStreamDefaultController,
  ) {    
    controller.enqueue(await this.process(inFrame));
    inFrame.close();
  }

  private async process(inFrame: VideoFrame) {
    const width = inFrame.displayWidth;
    const height = inFrame.displayHeight;
    if (
      !this.offscreen ||
      this.offscreen.width !== width ||
      this.offscreen.height !== height
    ) {
      this.offscreen = new OffscreenCanvas(width, height);
      this.ctx = this.offscreen.getContext("2d", { willReadFrequently: true });
    }

    // Draw the frame onto the canvas, then read it back.
    const bitmap = await createImageBitmap(inFrame);
    this.ctx!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); // Close the bitmap to release resources
    const imageData = this.ctx!.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (data[0] === 0 && data[1] === 0 && data[2] === 0) {
      // The first pixel is black, so assume the whole frame is black.
      // Return an entirely transparent frame.
      for (let i = 0; i < data.length; i += 4) {
        data[i + 3] = 0; // Set alpha to 0
      }
    } else {
      // Just tweak the green bytes.
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        if (g - (r + b) > THRESHOLD) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }
    }

    // Build the output frame.
    this.ctx!.putImageData(imageData, 0, 0);
    return new VideoFrame(this.offscreen, { timestamp: inFrame.timestamp });
  }
}
