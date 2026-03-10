import { useTranslation } from "@/hooks/useTranslation";
import { useRegion } from "@/context/RegionContext";

export function LanguageToggle() {
  const { regionCode, setLocale } = useRegion();
  const { locale } = useTranslation();

  if (regionCode !== "BD") return null;

  return (
    <div
      className="inline-flex items-center rounded-md border border-border overflow-hidden text-xs font-medium"
      data-testid="language-toggle"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:text-foreground"
        }`}
        data-testid="button-lang-en"
        aria-label="Switch to English"
      >
        EN
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        type="button"
        onClick={() => setLocale("bn")}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === "bn"
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:text-foreground"
        }`}
        data-testid="button-lang-bn"
        aria-label="বাংলায় পরিবর্তন করুন"
      >
        বাং
      </button>
    </div>
  );
}
