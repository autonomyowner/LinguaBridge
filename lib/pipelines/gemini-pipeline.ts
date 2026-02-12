import { GoogleGenAI, Modality, Session, type LiveServerMessage } from '@google/genai';
import { TranslationPipeline, PipelineConfig, TranscriptEvent, AudioOutputEvent, PipelineError } from './types';
import { createGeminiAudioBlob } from '../../audioUtils';

const GEMINI_MODEL = 'gemini-2.5-flash-preview-native-audio-dialog';
const OUTPUT_SAMPLE_RATE = 24000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

export class GeminiPipeline implements TranslationPipeline {
  readonly mode = 'gemini' as const;

  private config: PipelineConfig | null = null;
  private ai: GoogleGenAI | null = null;
  private session: Session | null = null;
  private isStopping = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Accumulated transcription buffers (Gemini sends transcription incrementally)
  private inputTranscriptBuffer = '';
  private outputTranscriptBuffer = '';

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

    if (!config.apiKeys.gemini) {
      throw new Error('Gemini API key is required');
    }

    this.ai = new GoogleGenAI({ apiKey: config.apiKeys.gemini });
    await this.connectSession();
  }

  disconnect(): void {
    this.isStopping = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

    if (this.session) {
      try { this.session.close(); } catch (_) {}
      this.session = null;
    }

    this.ai = null;
    this.config = null;
    this.inputTranscriptBuffer = '';
    this.outputTranscriptBuffer = '';
  }

  sendAudio(float32Data: Float32Array): void {
    if (!this.session) return;
    try {
      const blob = createGeminiAudioBlob(float32Data);
      this.session.sendRealtimeInput({
        audio: { data: blob.data, mimeType: blob.mimeType },
      });
    } catch (e) {
      // Silently ignore send errors (connection may be closing)
    }
  }

  // --- Session Management ---

  private async connectSession(): Promise<void> {
    if (this.isStopping || !this.ai || !this.config) return;

    const { sourceLanguage, targetLanguage } = this.config;

    const speechConfig: any = {};
    if (this.config.geminiVoice) {
      speechConfig.voiceConfig = {
        prebuiltVoiceConfig: { voiceName: this.config.geminiVoice },
      };
    }
    // Set output language for TTS
    speechConfig.languageCode = targetLanguage.code;

    try {
      this.session = await this.ai.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig,
          systemInstruction: {
            parts: [{
              text: `You are a real-time speech translator. The user speaks in ${sourceLanguage.name}. You must translate everything they say into ${targetLanguage.name} and speak the translation naturally. Do NOT repeat the original text. Do NOT add commentary. Just speak the translated version.`,
            }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (this.isStopping) return;
            console.log('[GeminiPipeline] Session connected');
            this.reconnectAttempts = 0;
            this.statusChangeCb?.('connected');
          },
          onmessage: (msg: LiveServerMessage) => {
            this.handleServerMessage(msg);
          },
          onerror: (e: ErrorEvent) => {
            console.error('[GeminiPipeline] Session error:', e);
            if (!this.isStopping) {
              this.errorCb?.({
                code: 'gemini_error',
                message: e.message || 'Gemini session error',
                recoverable: true,
              });
            }
          },
          onclose: () => {
            console.warn('[GeminiPipeline] Session closed');
            this.session = null;
            if (!this.isStopping) {
              this.reconnect();
            }
          },
        },
      });
    } catch (err: any) {
      console.error('[GeminiPipeline] Failed to connect session:', err);
      if (!this.isStopping) {
        this.errorCb?.({
          code: 'gemini_connect_failed',
          message: err.message || 'Failed to connect to Gemini',
          recoverable: this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS,
        });
        this.reconnect();
      } else {
        throw err;
      }
    }
  }

  private handleServerMessage(msg: LiveServerMessage): void {
    if (!this.config) return;

    const content = msg.serverContent;
    if (!content) return;

    // Handle input transcription (what the user said)
    if (content.inputTranscription?.text) {
      this.inputTranscriptBuffer += content.inputTranscription.text;

      if (content.inputTranscription.finished) {
        const finalText = this.inputTranscriptBuffer.trim();
        this.inputTranscriptBuffer = '';
        if (finalText) {
          this.transcriptCb?.({
            type: 'input',
            text: finalText,
            language: this.config.sourceLanguage.code,
          });
        }
      }
    }

    // Handle output transcription (the translated speech)
    if (content.outputTranscription?.text) {
      this.outputTranscriptBuffer += content.outputTranscription.text;

      if (content.outputTranscription.finished) {
        const finalText = this.outputTranscriptBuffer.trim();
        this.outputTranscriptBuffer = '';
        if (finalText) {
          this.transcriptCb?.({
            type: 'output',
            text: finalText,
            language: this.config.targetLanguage.code,
          });
        }
      }
    }

    // Handle audio output (model's translated speech audio)
    if (content.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('audio/')) {
          this.audioOutputCb?.({
            pcmBase64: part.inlineData.data,
            sampleRate: OUTPUT_SAMPLE_RATE,
          });
        }
      }
    }
  }

  private reconnect(): void {
    if (this.isStopping) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.errorCb?.({
        code: 'max_reconnect',
        message: 'Connection lost. Please restart the session.',
        recoverable: false,
      });
      this.statusChangeCb?.('disconnected');
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      RECONNECT_MAX_DELAY,
    );

    this.statusChangeCb?.('reconnecting');
    this.errorCb?.({
      code: 'reconnecting',
      message: `Reconnecting Gemini... (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
      recoverable: true,
    });

    this.reconnectTimer = setTimeout(() => {
      if (this.isStopping) return;
      this.connectSession();
    }, delay);
  }
}
