import enTranslations from "@/locales/en.json";
import bnTranslations from "@/locales/bn.json";

type TranslationData = Record<string, unknown>;
type Locale = "en" | "bn";

const locales: Record<Locale, TranslationData> = {
  en: enTranslations as TranslationData,
  bn: bnTranslations as TranslationData,
};

function getNestedValue(obj: TranslationData, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function translate(key: string, locale: Locale = "en", vars?: Record<string, string | number>): string {
  const localeData = locales[locale] || locales.en;
  let value = getNestedValue(localeData, key);

  if (value === undefined && locale !== "en") {
    value = getNestedValue(locales.en, key);
  }

  if (value === undefined) {
    return key;
  }

  if (vars) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, varName) =>
      vars[varName] !== undefined ? String(vars[varName]) : `{{${varName}}}`
    );
  }

  return value;
}

export function isValidLocale(locale: string): locale is Locale {
  return locale === "en" || locale === "bn";
}

export type { Locale };
