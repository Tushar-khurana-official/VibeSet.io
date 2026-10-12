import en from './en.json';
import hi from './hi.json';
import { businessConfig } from '../config';

export type Language = 'en' | 'hi';

const translations: Record<Language, Record<string, string>> = {
  en,
  hi
};

export function t(key: string, lang: Language = 'en', params?: Record<string, string | number>): string {
  const selectedLang = translations[lang] ? lang : 'en';
  let message = translations[selectedLang][key] || translations['en'][key] || key;

  // Global business parameters
  const mergedParams: Record<string, string | number> = {
    businessName: businessConfig.name,
    tagline: businessConfig.tagline,
    currency: businessConfig.currency,
    hours: businessConfig.hours,
    address: businessConfig.address,
    supportPhone: businessConfig.supportPhone,
    website: businessConfig.website,
    ...(params || {})
  };

  for (const [k, v] of Object.entries(mergedParams)) {
    message = message.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }

  return message;
}
