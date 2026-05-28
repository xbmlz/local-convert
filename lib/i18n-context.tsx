"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { type Locale, getTranslation } from "@/lib/i18n"

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const LOCALE_COOKIE = "i18n_locale"

function getInitialLocale(): Locale {
  if (typeof document === "undefined") return "en"
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
  if (cookie) {
    const val = cookie.split("=")[1]
    if (val === "zh") return "zh"
  }
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith("zh")) return "zh"
  }
  return "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    const detected = getInitialLocale()
    setLocaleState(detected)
    document.documentElement.lang = detected === "zh" ? "zh-CN" : "en-US"
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=${365 * 24 * 60 * 60}`
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : "en-US"
  }, [])

  const t = useCallback(
    (key: string) => getTranslation(locale, key),
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}