import en from "@/locales/en.json"
import zh from "@/locales/zh.json"

export type Locale = "en" | "zh"

const locales: Record<Locale, typeof en> = { en, zh }

export function getTranslation(locale: Locale, key: string): string {
  const keys = key.split(".")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = locales[locale] || locales.en
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k]
    } else {
      return key
    }
  }
  return typeof value === "string" ? value : key
}

export function getLocaleNames(): Record<Locale, string> {
  return { en: "English", zh: "中文" }
}