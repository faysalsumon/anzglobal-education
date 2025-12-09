import { useMemo } from "react";
import { useRegion } from "@/context/RegionContext";
import enTranslations from "@/locales/en.json";
import bnTranslations from "@/locales/bn.json";

type TranslationKey = string;
type TranslationValue = string | Record<string, unknown>;
type Translations = Record<string, TranslationValue>;

const translationFiles: Record<string, Translations> = {
  en: enTranslations,
  bn: bnTranslations,
};

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }

  return typeof current === "string" ? current : path;
}

export function useTranslation() {
  const { locale, region } = useRegion();

  const translations = useMemo(() => {
    return translationFiles[locale] || translationFiles["en"] || enTranslations;
  }, [locale]);

  const t = useMemo(() => {
    return (key: TranslationKey, replacements?: Record<string, string | number>): string => {
      let value = getNestedValue(translations, key);

      if (replacements) {
        Object.entries(replacements).forEach(([placeholder, replacement]) => {
          value = value.replace(new RegExp(`{{${placeholder}}}`, "g"), String(replacement));
        });
      }

      return value;
    };
  }, [translations]);

  const formatCurrency = useMemo(() => {
    const currencySymbols: Record<string, string> = {
      AUD: "A$",
      BDT: "৳",
      USD: "$",
      GBP: "£",
      EUR: "€",
      INR: "₹",
      PKR: "Rs",
    };

    return (amount: number | string, currency?: string): string => {
      const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
      const currencyCode = currency || region?.defaultCurrency || "AUD";
      const currencySymbol = region?.currencySymbol || currencySymbols[currencyCode] || "$";

      if (isNaN(numAmount)) {
        return `${currencySymbol}0`;
      }

      return `${currencySymbol}${numAmount.toLocaleString(locale === "bn" ? "bn-BD" : "en-AU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    };
  }, [locale, region]);

  const formatDate = useMemo(() => {
    return (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const localeCode = locale === "bn" ? "bn-BD" : "en-AU";

      return dateObj.toLocaleDateString(localeCode, {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options,
      });
    };
  }, [locale]);

  const formatNumber = useMemo(() => {
    return (num: number): string => {
      const localeCode = locale === "bn" ? "bn-BD" : "en-AU";
      return num.toLocaleString(localeCode);
    };
  }, [locale]);

  return {
    t,
    locale,
    region,
    formatCurrency,
    formatDate,
    formatNumber,
    isRTL: false,
  };
}

export function getTranslation(locale: string, key: string): string {
  const translations = translationFiles[locale] || translationFiles["en"] || enTranslations;
  return getNestedValue(translations, key);
}
