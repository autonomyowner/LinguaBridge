/**
 * StandardPipelineV2 — Production-grade translation pipeline.
 *
 * Deepgram STT (WebSocketManager + keepalive + health check)
 *   → TranslationQueue (retry + stale discard)
 *     → OpenRouter GPT-4o-mini (streaming HTTP + timeout)
 *       → TTSQueue (buffer when Cartesia disconnected)
 *         → Cartesia TTS (WebSocketManager + reconnect)
 *           → AudioOutputEvent (PCM base64)
 */

import { TranslationPipeline, PipelineConfig, TranscriptEvent, AudioOutputEvent, PipelineError } from './types';
import { WebSocketManager } from './ws-manager';
import { TranslationQueue, TTSQueue } from './queues';
import { float32ToInt16Buffer } from '../../audioUtils';
import { DEEPGRAM_LANGUAGE_MAP } from '../../types';

const DEEPGRAM_WS_BASE_URL = 'wss://api.deepgram.com/v1/listen';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openai/gpt-4o-mini';
const CARTESIA_WS_URL = 'wss://api.cartesia.ai/tts/websocket';
const CARTESIA_MODEL_ID = 'sonic-2';
const CARTESIA_SAMPLE_RATE = 24000;
const INPUT_SAMPLE_RATE = 16000;

export class StandardPipelineV2 implements TranslationPipeline {
  readonly mode = 'standard' as const;

  private config: PipelineConfig | null = null;
  private deepgramWs: WebSocketManager | null = null;
  private cartesiaWs: WebSocketManager | null = null;
  private translationQueue: TranslationQueue | null = null;
  private ttsQueue: TTSQueue | null = null;
  private partialTranscript = '';
  private isStopping = false;
  private droppedAudioFrames = 0;

  // Callbacks
  private transcriptCb: ((event: TranscriptEvent) => void) | null = null;
  private audioOutputCb: ((event: AudioOutputEvent) => void) | null = null;
  private statusChangeCb: ((status: string) => void) | null = null;
  private errorCb: ((error: PipelineError) => void) | null = null;

  onTranscript(cb: (event: TranscriptEvent) => void): void { this.transcriptCb = cb; }
  onAudioOutput(cb: (event: AudioOutputEvent) => void): void { this.audioOutputCb = cb; }
  onStatusChange(cb: (status: string) => void): void { this.statusChangeCb = cb; }
  onError(cb: (error: PipelineError) => void): void { this.errorCb = cb; }

  removeAllListeners(): void {
    this.transcriptCb = null;
    this.audioOutputCb = null;
    this.statusChangeCb = null;
    this.errorCb = null;
  }

  async connect(config: PipelineConfig): Promise<void> {
    this.config = config;
    this.isStopping = false;
    this.partialTranscript = '';

    if (!config.apiKeys.deepgram || !config.apiKeys.openRouter || !config.apiKeys.cartesia) {
      throw new Error('Missing required API keys (Deepgram, OpenRouter, Cartesia)');
    }
    if (!config.voiceId) {
      throw new Error('No voice ID configured');
    }

    // --- Build queues ---
    this.translationQueue = new TranslationQueue(
      (text) => this.translateText(text),
      (original, translated, sourceLang) => {
        // Emit output transcript
        this.transcriptCb?.({
          type: 'output',
          text: translated,
          language: this.config?.targetLanguage.code || '',
        });
        // Send to TTS
        this.ttsQueue?.enqueue(translated);
      },
      (err) => this.errorCb?.(err),
    );
    this.translationQueue.start();

    this.ttsQueue = new TTSQueue(
      (text, contextId) => this.sendCartesiaTTS(text, contextId),
      (err) => this.errorCb?.(err),
    );
    this.ttsQueue.start();

    // --- Connect both WebSockets and wait for them to be ready ---
    this.connectCartesia();
    this.connectDeepgram();

    // Best-effort wait for WebSockets — warn but don't fail if they timeout
    // (they'll keep reconnecting via their own backoff logic)
    const safeWait = (ws: import('./ws-manager').WebSocketManager, label: string) =>
      ws.waitForConnected(10000).catch((err) => {
        console.warn(`[PipelineV2] ${label} initial connect slow:`, err.message);
        this.errorCb?.({
          code: `${label.toLowerCase()}_slow_connect`,
          message: `${label} connecting slowly — audio may start with a short delay`,
          recoverable: true,
        });
      });

    await Promise.all([
      safeWait(this.cartesiaWs!, 'Cartesia'),
      safeWait(this.deepgramWs!, 'Deepgram'),
    ]);
  }

  disconnect(): void {
    this.isStopping = true;

    this.translationQueue?.stop();
    this.ttsQueue?.stop();

    if (this.deepgramWs) { this.deepgramWs.disconnect(); this.deepgramWs = null; }
    if (this.cartesiaWs) { this.cartesiaWs.disconnect(); this.cartesiaWs = null; }

    this.translationQueue = null;
    this.ttsQueue = null;
    this.partialTranscript = '';
    this.config = null;
  }

  sendAudio(float32Data: Float32Array): void {
    if (!this.deepgramWs) return;
    const pcmBuffer = float32ToInt16Buffer(float32Data);
    const sent = this.deepgramWs.send(pcmBuffer);
    if (!sent) {
      this.droppedAudioFrames++;
      // Emit a warning every ~50 dropped frames (~3.2s of audio at 64ms/frame)
      if (this.droppedAudioFrames % 50 === 1) {
        this.errorCb?.({
          code: 'audio_dropped',
          message: `Speech input dropped (${this.droppedAudioFrames} frames) — reconnecting to speech recognition`,
          recoverable: true,
        });
      }
    } else if (this.droppedAudioFrames > 0) {
      console.log(`[PipelineV2] Audio send recovered after ${this.droppedAudioFrames} dropped frames`);
      this.droppedAudioFrames = 0;
    }
  }

  // ==========================================================================
  // Deepgram STT
  // ==========================================================================

  private connectDeepgram(): void {
    if (!this.config?.apiKeys.deepgram) return;
    const { sourceLanguage, apiKeys } = this.config;
    const dgLang = DEEPGRAM_LANGUAGE_MAP[sourceLanguage.code] || sourceLanguage.code.split('-')[0];

    this.deepgramWs = new WebSocketManager({
      createUrl: () =>
        `${DEEPGRAM_WS_BASE_URL}?model=nova-2&language=${dgLang}&encoding=linear16&sample_rate=${INPUT_SAMPLE_RATE}&channels=1&interim_results=true&punctuate=true&endpointing=300&utterance_end_ms=1000`,
      protocols: ['token', apiKeys.deepgram!],
      keepalive: {
        intervalMs: 8000,
        createMessage: () => JSON.stringify({ type: 'KeepAlive' }),
      },
      healthCheck: {
        staleTimeoutMs: 15000,
      },
      maxReconnectAttempts: 10,
      reconnectBaseDelay: 1000,
      reconnectMaxDelay: 30000,
      onMessage: (event) => this.handleDeepgramMessage(event),
      onStateChange: (state) => {
        console.log('[PipelineV2] Deepgram state:', state);
        if (state === 'connected') {
          this.statusChangeCb?.('connected');
        } else if (state === 'reconnecting') {
          this.statusChangeCb?.('reconnecting');
        } else if (state === 'disconnected' && !this.isStopping) {
          this.statusChangeCb?.('disconnected');
        }
      },
      onError: (code, message, recoverable) => {
        this.errorCb?.({ code, message, recoverable });
      },
    });

    this.deepgramWs.connect();
  }

  private handleDeepgramMessage(event: MessageEvent): void {
    if (!this.config) return;
    try {
      const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
      const data = JSON.parse(raw);

      if (data.type === 'Error' || data.error) {
        console.error('[PipelineV2] Deepgram API error:', data);
        this.errorCb?.({
          code: 'deepgram_error',
          message: `Speech recognition error: ${data.message || data.error || 'Unknown'}`,
          recoverable: true,
        });
        return;
      }

      if (data.type !== 'Results') return;

      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      if (!transcript) return;

      if (!data.is_final) {
        this.partialTranscript = transcript;
        // Emit partial transcript so the UI shows real-time speech feedback
        this.transcriptCb?.({
          type: 'partial',
          text: transcript,
          language: this.config.sourceLanguage.code,
        });
        return;
      }

      this.partialTranscript = '';
      const finalText = transcript.trim();
      if (!finalText) return;

      // Emit input transcript
      this.transcriptCb?.({
        type: 'input',
        text: finalText,
        language: this.config.sourceLanguage.code,
      });

      // Enqueue for translation
      this.translationQueue?.enqueue(finalText, this.config.sourceLanguage.code);
    } catch (err) {
      // Binary keepalive responses can't be parsed — ignore those
      if (typeof event.data === 'string') {
        console.error('[PipelineV2] Deepgram message parse error:', err);
        this.errorCb?.({
          code: 'deepgram_parse_error',
          message: 'Failed to parse speech recognition response',
          recoverable: true,
        });
      }
    }
  }

  // ==========================================================================
  // OpenRouter Translation
  // ==========================================================================

  private async translateText(text: string): Promise<string | null> {
    if (!this.config?.apiKeys.openRouter || this.isStopping) return null;
    const { sourceLanguage, targetLanguage, apiKeys } = this.config;

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 15000);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.openRouter}`,
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          stream: true,
          messages: [
            {
              role: 'system',
              content: `You are a real-time translator. Translate from ${sourceLanguage.name} to ${targetLanguage.name}. Output ONLY the translated text — no explanations, no quotes, no annotations.`,
            },
            { role: 'user', content: text },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const msg = response.status === 401 ? 'Invalid API key'
          : response.status === 429 ? 'Rate limited'
          : `HTTP ${response.status}`;
        console.error('[PipelineV2] OpenRouter error:', response.status, body);
        this.errorCb?.({
          code: 'openrouter_error',
          message: `Translation failed: ${msg}`,
          recoverable: response.status === 429,
        });
        throw new Error(msg);
      }

      const reader = response.body?.getReader();
      if (!reader) return null;

      const decoder = new TextDecoder();
      let translated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) translated += delta;
          } catch (_) {}
        }
      }

      clearTimeout(timeout);
      const result = translated.trim();
      if (!result) {
        console.warn('[PipelineV2] Empty translation for:', text.substring(0, 50));
        this.errorCb?.({
          code: 'empty_translation',
          message: 'Translation returned empty — your speech may not have been understood',
          recoverable: true,
        });
        return null;
      }
      return result;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === 'AbortError') {
        console.warn('[PipelineV2] OpenRouter timed out (15s)');
        this.errorCb?.({
          code: 'openrouter_timeout',
          message: 'Translation timed out — retrying',
          recoverable: true,
        });
      }
      throw err;
    }
  }

  // ==========================================================================
  // Cartesia TTS
  // ==========================================================================

  private connectCartesia(): void {
    if (!this.config?.apiKeys.cartesia) return;
    const apiKey = this.config.apiKeys.cartesia;

    this.cartesiaWs = new WebSocketManager({
      createUrl: () =>
        `${CARTESIA_WS_URL}?api_key=${apiKey}&cartesia_version=2025-04-16`,
      maxReconnectAttempts: 10,
      reconnectBaseDelay: 2000,
      reconnectMaxDelay: 15000,
      onMessage: (event) => this.handleCartesiaMessage(event),
      onStateChange: (state) => {
        console.log('[PipelineV2] Cartesia state:', state);
        if (state === 'connected') {
          // Flush any buffered TTS items
          this.ttsQueue?.flush();
        }
      },
      onError: (code, message, recoverable) => {
        this.errorCb?.({ code: `cartesia_${code}`, message, recoverable });
      },
    });

    this.cartesiaWs.connect();
  }

  private sendCartesiaTTS(text: string, contextId: number): boolean {
    if (!this.cartesiaWs?.isConnected || !this.config?.voiceId) return false;

    const cartesiaLang = this.config.targetLanguage.code.split('-')[0];
    const payload = JSON.stringify({
      model_id: CARTESIA_MODEL_ID,
      transcript: text,
      voice: { mode: 'id', id: this.config.voiceId },
      language: cartesiaLang,
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: CARTESIA_SAMPLE_RATE,
      },
      context_id: `ctx-${contextId}`,
    });

    console.log('[PipelineV2] TTS send:', text.substring(0, 50));
    return this.cartesiaWs.send(payload);
  }

  private handleCartesiaMessage(event: MessageEvent): void {
    try {
      const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
      const data = JSON.parse(raw);

      if (data.type === 'chunk' && data.data) {
        this.audioOutputCb?.({ pcmBase64: data.data, sampleRate: CARTESIA_SAMPLE_RATE });
      } else if (data.type === 'error') {
        console.error('[PipelineV2] Cartesia TTS error:', data.message || data);
        this.errorCb?.({
          code: 'cartesia_tts_error',
          message: `Voice synthesis error: ${data.message || 'Unknown'}`,
          recoverable: true,
        });
      }
    } catch (err) {
      console.error('[PipelineV2] Cartesia message parse error:', err);
      this.errorCb?.({
        code: 'cartesia_parse_error',
        message: 'Failed to parse voice synthesis response',
        recoverable: true,
      });
    }
  }
}
