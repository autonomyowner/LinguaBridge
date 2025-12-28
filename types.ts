
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
