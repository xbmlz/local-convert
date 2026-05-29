"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Moon, Sun, Github } from "lucide-react"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n-context"

const NAV_ITEMS = [
  { href: "/img", labelKey: "nav.image" },
  { href: "/doc", labelKey: "nav.document" },
  { href: "/video", labelKey: "nav.video" },
] as const

export function Header() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/img" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-xs font-bold">LC</span>
          <span className="hidden sm:inline">LocalConvert</span>
        </Link>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLocale(locale === "en" ? "zh" : "en")}
            className="inline-flex items-center justify-center size-8 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title={locale === "en" ? "Switch to Chinese" : "切换到英文"}
          >
            {locale === "en" ? "中" : "EN"}
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t("nav.toggleTheme")}</span>
          </button>
          <a
            href="https://github.com/xbmlz/local-convert"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Github className="size-4" />
            <span className="sr-only">{t("nav.viewOnGitHub")}</span>
          </a>
        </div>
      </div>
    </header>
  )
}