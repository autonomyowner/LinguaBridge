import { TranslationPipeline, PipelineConfig, TranscriptEvent, AudioOutputEvent, PipelineError } from './types';
import { float32ToInt16Buffer } from '../../audioUtils';
import { DEEPGRAM_LANGUAGE_MAP } from '../../types';

const DEEPGRAM_WS_BASE_URL = 'wss://api.deepgram.com/v1/listen';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openai/gpt-4o-mini';
const CARTESIA_WS_URL = 'wss://api.cartesia.ai/tts/websocket';
const CARTESIA_MODEL_ID = 'sonic-2';
const OUTPUT_SAMPLE_RATE = 24000;
const INPUT_SAMPLE_RATE = 16000;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const DEEPGRAM_KEEPALIVE_INTERVAL = 8000; // 8s keepalive ping

export class StandardPipeline implements TranslationPipeline {
  readonly mode = 'standard' as const;

  private config: PipelineConfig | null = null;
  private deepgramWs: WebSocket | null = null;
  private cartesiaWs: WebSocket | null = null;
  private cartesiaContextId = 0;
  private partialTranscript = '';
  private reconnectAttempts = 0;
  private cartesiaReconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private deepgramKeepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private isStopping = false;
  private lastDeepgramCloseCode = 0;

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
    this.reconnectAttempts = 0;
    this.cartesiaReconnectAttempts = 0;
    this.lastDeepgramCloseCode = 0;

    // Connect both WebSockets
    this.connectCartesiaWs();
    this.connectDeepgramWs();
  }

  disconnect(): void {
    this.isStopping = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopDeepgramKeepalive();
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

    if (this.deepgramWs) {
      try { this.deepgramWs.close(); } catch (_) {}
      this.deepgramWs = null;
    }

    if (this.cartesiaWs) {
      try { this.cartesiaWs.close(); } catch (_) {}
      this.cartesiaWs = null;
    }

    this.partialTranscript = '';
    this.config = null;
  }

  sendAudio(float32Data: Float32Array): void {
    if (!this.deepgramWs || this.deepgramWs.readyState !== WebSocket.OPEN) return;
    const pcmBuffer = float32ToInt16Buffer(float32Data);
    this.deepgramWs.send(pcmBuffer);
  }

  // --- Deepgram STT ---

  private startDeepgramKeepalive(): void {
    this.stopDeepgramKeepalive();
    this.deepgramKeepaliveTimer = setInterval(() => {
      if (this.deepgramWs?.readyState === WebSocket.OPEN) {
        try {
          this.deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
        } catch (_) {}
      }
    }, DEEPGRAM_KEEPALIVE_INTERVAL);
  }

  private stopDeepgramKeepalive(): void {
    if (this.deepgramKeepaliveTimer) {
      clearInterval(this.deepgramKeepaliveTimer);
      this.deepgramKeepaliveTimer = null;
    }
  }

  private connectDeepgramWs(): void {
    if (this.isStopping || !this.config) return;
    const { sourceLanguage, apiKeys } = this.config;
    if (!apiKeys.deepgram) return;

    const dgLang = DEEPGRAM_LANGUAGE_MAP[sourceLanguage.code] || sourceLanguage.code.split('-')[0];
    const dgUrl = `${DEEPGRAM_WS_BASE_URL}?model=nova-2&language=${dgLang}&encoding=linear16&sample_rate=${INPUT_SAMPLE_RATE}&channels=1&interim_results=true&punctuate=true&endpointing=300&utterance_end_ms=1000`;

    console.log('[StandardPipeline] Connecting to Deepgram, language:', dgLang);
    const ws = new WebSocket(dgUrl, ['token', apiKeys.deepgram]);
    this.deepgramWs = ws;

    ws.onopen = () => {
      if (this.isStopping) { ws.close(); return; }
      console.log('[StandardPipeline] Deepgram WebSocket connected');
      this.reconnectAttempts = 0;
      this.startDeepgramKeepalive();
      this.statusChangeCb?.('connected');
    };

    ws.onmessage = (event) => {
      this.handleDeepgramMessage(event);
    };

    ws.onerror = () => {
      console.error('[StandardPipeline] Deepgram WebSocket error');
      // Don't reconnect here — onclose always fires after onerror,
      // and reconnecting from both wastes attempts
    };

    ws.onclose = (e) => {
      console.warn('[StandardPipeline] Deepgram closed. Code:', e.code, 'Reason:', e.reason);
      this.deepgramWs = null;
      this.lastDeepgramCloseCode = e.code;
      this.stopDeepgramKeepalive();

      if (!this.isStopping) {
        this.reconnectDeepgram();
      }
    };
  }

  private handleDeepgramMessage(event: MessageEvent): void {
    if (!this.config) return;
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'Error' || data.error) {
        console.error('[StandardPipeline] Deepgram API error:', data);
        this.errorCb?.({
          code: 'deepgram_error',
          message: `Speech recognition error: ${data.message || data.error || 'Connection failed'}`,
          recoverable: true,
        });
        return;
      }

      if (data.type !== 'Results') return;

      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      if (!transcript) return;

      if (!data.is_final) {
        this.partialTranscript = transcript;
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

      // Translate + speak
      this.translateAndSpeak(finalText);
    } catch (_) {
      // Ignore parse errors
    }
  }

  private reconnectDeepgram(): void {
    if (this.isStopping) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      const codeHint = this.lastDeepgramCloseCode === 1008 ? ' (policy violation — check API key)'
        : this.lastDeepgramCloseCode === 1006 ? ' (network issue)'
        : this.lastDeepgramCloseCode ? ` (code ${this.lastDeepgramCloseCode})`
        : '';
      this.errorCb?.({
        code: 'max_reconnect',
        message: `Speech recognition lost${codeHint}. Please restart the session.`,
        recoverable: false,
      });
      this.statusChangeCb?.('disconnected');
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY
    );

    this.statusChangeCb?.('reconnecting');
    this.errorCb?.({
      code: 'reconnecting',
      message: `Reconnecting STT... (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
      recoverable: true,
    });

    this.reconnectTimer = setTimeout(() => {
      if (this.isStopping) return;
      this.connectDeepgramWs();
    }, delay);
  }

  // --- OpenRouter Translation ---

  private async translateAndSpeak(text: string): Promise<void> {
    if (!this.config || !this.config.apiKeys.openRouter) return;
    const { sourceLanguage, targetLanguage, apiKeys } = this.config;

    const abortController = new AbortController();
    const fetchTimeout = setTimeout(() => abortController.abort(), 15000);

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
        const errorBody = await response.text().catch(() => '');
        const statusMsg = response.status === 401 ? 'Invalid API key'
          : response.status === 429 ? 'Rate limited — too many requests'
          : `HTTP ${response.status}`;
        console.error('[StandardPipeline] OpenRouter error:', response.status, errorBody);
        this.errorCb?.({
          code: 'openrouter_error',
          message: `Translation failed: ${statusMsg}`,
          recoverable: response.status === 429,
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let translatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) translatedText += delta;
          } catch (_) {}
        }
      }

      clearTimeout(fetchTimeout);

      const finalTranslation = translatedText.trim();
      if (!finalTranslation) return;

      // Send to Cartesia TTS
      this.sendToCartesia(finalTranslation);

      // Emit output transcript
      this.transcriptCb?.({
        type: 'output',
        text: finalTranslation,
        language: targetLanguage.code,
      });
    } catch (err: any) {
      clearTimeout(fetchTimeout);
      if (err?.name === 'AbortError') {
        console.warn('[StandardPipeline] OpenRouter request timed out (15s)');
        this.errorCb?.({
          code: 'openrouter_timeout',
          message: 'Translation timed out — retrying on next utterance',
          recoverable: true,
        });
      } else {
        console.error('[StandardPipeline] Translation failed:', err);
      }
    }
  }

  // --- Cartesia TTS ---

  private sendToCartesia(text: string): void {
    if (!this.cartesiaWs || this.cartesiaWs.readyState !== WebSocket.OPEN) {
      console.warn('[StandardPipeline] Cartesia WS not ready, skipping TTS for:', text.substring(0, 50));
      return;
    }
    if (!this.config?.voiceId) return;

    this.cartesiaContextId += 1;
    const contextId = `turn-${this.cartesiaContextId}`;
    const cartesiaLang = this.config.targetLanguage.code.split('-')[0];

    const ttsPayload = {
      model_id: CARTESIA_MODEL_ID,
      transcript: text,
      voice: { mode: 'id', id: this.config.voiceId },
      language: cartesiaLang,
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: OUTPUT_SAMPLE_RATE,
      },
      context_id: contextId,
    };

    console.log('[StandardPipeline] sendToCartesia voice:', this.config.voiceId, 'text:', text.substring(0, 50));
    this.cartesiaWs.send(JSON.stringify(ttsPayload));
  }

  private connectCartesiaWs(): void {
    if (this.isStopping || !this.config?.apiKeys.cartesia) return;

    const ws = new WebSocket(
      `${CARTESIA_WS_URL}?api_key=${this.config.apiKeys.cartesia}&cartesia_version=2025-04-16`
    );

    ws.onopen = () => {
      console.log('[StandardPipeline] Cartesia WebSocket connected');
      this.cartesiaReconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chunk' && data.data) {
          this.audioOutputCb?.({ pcmBase64: data.data, sampleRate: OUTPUT_SAMPLE_RATE });
        } else if (data.type === 'error') {
          console.error('[StandardPipeline] Cartesia TTS error:', data.message || data);
          this.errorCb?.({
            code: 'cartesia_error',
            message: `TTS error: ${data.message || 'Voice synthesis failed'}`,
            recoverable: true,
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      console.error('[StandardPipeline] Cartesia WebSocket error');
      // Don't reconnect here — onclose fires after onerror
    };

    ws.onclose = () => {
      if (this.isStopping) return;

      this.cartesiaReconnectAttempts += 1;
      if (this.cartesiaReconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.error('[StandardPipeline] Cartesia max reconnect attempts reached');
        this.errorCb?.({
          code: 'cartesia_max_reconnect',
          message: 'Voice synthesis disconnected. Please restart the session.',
          recoverable: false,
        });
        return;
      }

      const delay = Math.min(2000 * Math.pow(1.5, this.cartesiaReconnectAttempts - 1), 15000);
      console.warn(`[StandardPipeline] Cartesia WebSocket closed, reconnecting in ${Math.round(delay)}ms (attempt ${this.cartesiaReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        if (!this.isStopping) this.connectCartesiaWs();
      }, delay);
    };

    this.cartesiaWs = ws;
  }
}
