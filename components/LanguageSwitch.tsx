'use client';

import { useI18n } from '@/lib/i18n';
import { Languages } from 'lucide-react';

/**
 * EN / LG language switcher (plan 1.2: shown before any form).
 * Compact pill toggle — persists via I18nProvider.
 */
export default function LanguageSwitch({ onDark = false }: { onDark?: boolean }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`flex items-center gap-1 rounded-full p-1 text-xs font-black ${
        onDark ? 'bg-white/15 border border-white/25' : 'bg-white border border-slate-200 shadow-sm'
      }`}
      role="group"
      aria-label="Language / Olulimi"
    >
      <Languages size={12} className={`ml-1.5 ${onDark ? 'text-white/80' : 'text-slate-400'}`} />
      {(['en', 'lg'] as const).map(code => (
        <button
          key={code}
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            lang === code
              ? 'bg-blue-600 text-white'
              : onDark
                ? 'text-white/70 hover:text-white'
                : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {code === 'en' ? 'EN' : 'LG'}
        </button>
      ))}
    </div>
  );
}
