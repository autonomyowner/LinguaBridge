export type { PipelineMode } from './lib/pipelines/types';

export interface TranslationMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  language: string;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

/** Deepgram uses slightly different BCP-47 codes for some languages */
export const DEEPGRAM_LANGUAGE_MAP: Record<string, string> = {
  'en-US': 'en-US', 'es-ES': 'es', 'fr-FR': 'fr', 'de-DE': 'de',
  'it-IT': 'it', 'ja-JP': 'ja', 'ko-KR': 'ko', 'zh-CN': 'zh-CN',
  'ar-SA': 'ar', 'pt-BR': 'pt-BR', 'hi-IN': 'hi', 'ru-RU': 'ru',
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar-SA', name: 'Arabic', flag: '🇸🇦' },
  { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
];
