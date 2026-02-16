/**
 * AudioPlaybackScheduler — manages output audio for LiveKit publishing.
 *
 * - Creates a 48kHz AudioContext (standard WebRTC rate)
 * - Resamples Cartesia's 24kHz PCM to 48kHz before scheduling
 * - Plays chunks sequentially with no gaps
 * - Generates continuous silence to keep the MediaStream track active
 * - Exposes MediaStream for LiveKit track publishing
 */

import { decode } from '../../audioUtils';

const OUTPUT_SAMPLE_RATE = 48000;
const CARTESIA_SAMPLE_RATE = 24000;
const SILENCE_INTERVAL_MS = 500;     // generate silence every 500ms
const SILENCE_DURATION_MS = 50;      // 50ms of silence each time
const MAX_QUEUE_DEPTH = 10;

export class AudioPlaybackScheduler {
  private audioContext: AudioContext | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private queueDepth = 0;
  private silenceTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  /** Initialize the scheduler. Must be called from a user gesture context. */
  async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: OUTPUT_SAMPLE_RATE,
    });
    await this.audioContext.resume();

    if (this.audioContext.state !== 'running') {
      throw new Error('Audio output failed to start. Check browser permissions.');
    }

    this.destNode = this.audioContext.createMediaStreamDestination();
    this.nextStartTime = 0;
    this.disposed = false;

    console.log('[AudioScheduler] Initialized at', OUTPUT_SAMPLE_RATE, 'Hz. State:', this.audioContext.state);
  }

  /** The MediaStream to publish via LiveKit. */
  get mediaStream(): MediaStream | null {
    return this.destNode?.stream ?? null;
  }

  /** Schedule a PCM audio chunk for playback. Resamples if needed. */
  scheduleChunk(pcmBase64: string, inputSampleRate: number = CARTESIA_SAMPLE_RATE): void {
    if (this.disposed || !this.audioContext || !this.destNode) return;
    if (this.queueDepth >= MAX_QUEUE_DEPTH) return; // prevent memory pressure

    const ctx = this.audioContext;
    const pcmBytes = decode(pcmBase64);
    const dataInt16 = new Int16Array(pcmBytes.buffer);
    const inputFrames = dataInt16.length;

    // Convert Int16 → Float32
    const float32 = new Float32Array(inputFrames);
    for (let i = 0; i < inputFrames; i++) {
      float32[i] = dataInt16[i] / 32768.0;
    }

    // Resample if needed (simple linear interpolation)
    let samples: Float32Array;
    if (inputSampleRate !== OUTPUT_SAMPLE_RATE) {
      const ratio = OUTPUT_SAMPLE_RATE / inputSampleRate;
      const outputFrames = Math.round(inputFrames * ratio);
      samples = new Float32Array(outputFrames);
      for (let i = 0; i < outputFrames; i++) {
        const srcIdx = i / ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(idx0 + 1, inputFrames - 1);
        const frac = srcIdx - idx0;
        samples[i] = float32[idx0] * (1 - frac) + float32[idx1] * frac;
      }
    } else {
      samples = float32;
    }

    // Create AudioBuffer at output rate
    const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    // Schedule playback
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(this.destNode);

    this.nextStartTime = Math.max(this.nextStartTime, ctx.currentTime);
    sourceNode.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.queueDepth += 1;
    this.activeSources.add(sourceNode);
    sourceNode.onended = () => {
      this.activeSources.delete(sourceNode);
      this.queueDepth = Math.max(0, this.queueDepth - 1);
    };
  }

  /**
   * Start generating tiny silence bursts to keep the MediaStream track alive.
   * Without this, some WebRTC implementations mark the track as inactive
   * when no audio has been played for a while.
   */
  startSilenceGenerator(): void {
    this.stopSilenceGenerator();
    this.silenceTimer = setInterval(() => {
      if (this.disposed || !this.audioContext || !this.destNode) return;
      if (this.queueDepth > 0) return; // real audio is playing, no need

      const ctx = this.audioContext;
      const frames = Math.round(OUTPUT_SAMPLE_RATE * SILENCE_DURATION_MS / 1000);
      const buffer = ctx.createBuffer(1, frames, OUTPUT_SAMPLE_RATE);
      // Buffer is already zeroed (silence)

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.destNode);
      src.start();
    }, SILENCE_INTERVAL_MS);
  }

  stopSilenceGenerator(): void {
    if (this.silenceTimer) {
      clearInterval(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /** Flush all scheduled audio (e.g. on stop). */
  flush(): void {
    this.activeSources.forEach(s => { try { s.stop(); } catch (_) {} });
    this.activeSources.clear();
    this.queueDepth = 0;
    this.nextStartTime = 0;
  }

  /** Dispose all resources. */
  dispose(): void {
    this.disposed = true;
    this.stopSilenceGenerator();
    this.flush();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.destNode = null;
  }
}
