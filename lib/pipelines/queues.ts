/**
 * Translation and TTS queues with retry logic.
 *
 * TranslationQueue: Deepgram final → OpenRouter. One at a time, retry on failure.
 * TTSQueue: translated text → Cartesia. Buffers when WS is down, flushes on reconnect.
 */

import type { PipelineError } from './types';

const MAX_RETRIES = 3;
const STALE_THRESHOLD_MS = 10_000; // discard items older than 10s

// --- Translation Queue ---

interface TranslationItem {
  text: string;
  sourceLanguage: string;
  timestamp: number;
  retries: number;
}

type TranslateFn = (text: string) => Promise<string | null>;

export class TranslationQueue {
  private queue: TranslationItem[] = [];
  private processing = false;
  private stopped = false;

  constructor(
    private translateFn: TranslateFn,
    private onResult: (original: string, translated: string, sourceLanguage: string) => void,
    private onError: (error: PipelineError) => void,
  ) {}

  enqueue(text: string, sourceLanguage: string): void {
    if (this.stopped) return;
    this.queue.push({ text, sourceLanguage, timestamp: Date.now(), retries: 0 });
    this.processNext();
  }

  clear(): void {
    this.queue = [];
    this.processing = false;
  }

  stop(): void {
    this.stopped = true;
    this.clear();
  }

  start(): void {
    this.stopped = false;
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.stopped || this.queue.length === 0) return;

    this.processing = true;
    const item = this.queue.shift()!;

    // Discard stale items
    if (Date.now() - item.timestamp > STALE_THRESHOLD_MS) {
      console.warn('[TranslationQueue] Discarding stale item:', item.text.substring(0, 30));
      this.processing = false;
      this.processNext();
      return;
    }

    try {
      const translated = await this.translateFn(item.text);
      if (translated && !this.stopped) {
        this.onResult(item.text, translated, item.sourceLanguage);
      }
    } catch (err: any) {
      if (this.stopped) { this.processing = false; return; }

      item.retries += 1;
      if (item.retries < MAX_RETRIES && Date.now() - item.timestamp < STALE_THRESHOLD_MS) {
        // Re-enqueue for retry (at front of queue)
        this.queue.unshift(item);
        console.warn(`[TranslationQueue] Retry ${item.retries}/${MAX_RETRIES}:`, item.text.substring(0, 30));
      } else {
        console.error('[TranslationQueue] Failed after retries:', item.text.substring(0, 30));
        this.onError({
          code: 'translation_failed',
          message: `Translation failed: ${err?.message || 'unknown error'}`,
          recoverable: true,
        });
      }
    }

    this.processing = false;
    if (!this.stopped) this.processNext();
  }
}

// --- TTS Queue ---

interface TTSItem {
  text: string;
  contextId: number;
  timestamp: number;
}

type SendTTSFn = (text: string, contextId: number) => boolean;

export class TTSQueue {
  private queue: TTSItem[] = [];
  private nextContextId = 1;
  private stopped = false;

  constructor(
    private sendFn: SendTTSFn,
    private onError: (error: PipelineError) => void,
  ) {}

  /** Enqueue text for TTS. Sends immediately if possible, buffers if not. */
  enqueue(text: string): number {
    if (this.stopped) return -1;

    const contextId = this.nextContextId++;
    const sent = this.sendFn(text, contextId);

    if (!sent) {
      // Buffer for when connection recovers
      this.queue.push({ text, contextId, timestamp: Date.now() });
      console.warn('[TTSQueue] Buffered (WS not ready):', text.substring(0, 30));
    }

    return contextId;
  }

  /** Flush buffered items (call when WebSocket reconnects). */
  flush(): void {
    if (this.stopped) return;

    const now = Date.now();
    const toSend = this.queue.filter(item => now - item.timestamp < STALE_THRESHOLD_MS);
    const discarded = this.queue.length - toSend.length;

    if (discarded > 0) {
      console.warn(`[TTSQueue] Discarded ${discarded} stale items`);
    }

    this.queue = [];

    for (const item of toSend) {
      const sent = this.sendFn(item.text, item.contextId);
      if (!sent) {
        // Still can't send — re-buffer
        this.queue.push(item);
      }
    }

    if (this.queue.length > 0) {
      console.warn(`[TTSQueue] ${this.queue.length} items still buffered after flush`);
    }
  }

  clear(): void {
    this.queue = [];
  }

  stop(): void {
    this.stopped = true;
    this.clear();
  }

  start(): void {
    this.stopped = false;
    this.nextContextId = 1;
  }

  get bufferedCount(): number {
    return this.queue.length;
  }
}
