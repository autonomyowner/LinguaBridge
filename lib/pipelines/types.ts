export type PipelineMode = 'standard' | 'gemini';

export interface PipelineConfig {
  sourceLanguage: { code: string; name: string };
  targetLanguage: { code: string; name: string };
  apiKeys: {
    deepgram?: string;
    openRouter?: string;
    cartesia?: string;
    gemini?: string;
  };
  voiceId?: string;       // Cartesia voice ID (standard only)
  geminiVoice?: string;   // Built-in Gemini voice name (gemini only)
}

export interface TranscriptEvent {
  type: 'input' | 'output';
  text: string;
  language: string;
}

export interface AudioOutputEvent {
  pcmBase64: string;
  sampleRate: number;
}

export interface PipelineError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface TranslationPipeline {
  readonly mode: PipelineMode;
  connect(config: PipelineConfig): Promise<void>;
  disconnect(): void;
  sendAudio(float32Data: Float32Array): void;
  onTranscript(cb: (event: TranscriptEvent) => void): void;
  onAudioOutput(cb: (event: AudioOutputEvent) => void): void;
  onStatusChange(cb: (status: string) => void): void;
  onError(cb: (error: PipelineError) => void): void;
  removeAllListeners(): void;
}
