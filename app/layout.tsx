import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/lib/i18n-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import "./globals.css"

const siteUrl = "https://localconvert.cn"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LocalConvert — Free Image & Document Converter, 100% Private",
    template: "%s | LocalConvert",
  },
  description:
    "Free browser-based image and document converter. Convert JPEG, PNG, WebP, AVIF, HEIC, PDF, DOCX, Markdown, JSON, CSV and more. 100% private — no uploads, no servers.",
  keywords: [
    "image converter",
    "document converter",
    "online converter",
    "JPEG to PNG",
    "WebP converter",
    "AVIF converter",
    "HEIC converter",
    "PDF converter",
    "Markdown to HTML",
    "JSON to CSV",
    "free converter",
    "private converter",
    "browser converter",
    "no upload converter",
  ],
  authors: [{ name: "LocalConvert", url: siteUrl }],
  creator: "LocalConvert",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "LocalConvert",
    title: "LocalConvert — Free Image & Document Converter, 100% Private",
    description:
      "Convert images and documents directly in your browser. No uploads, no servers, completely private.",
    images: [
      {
        url: `${siteUrl}/og.png`,
        width: 1200,
        height: 630,
        alt: "LocalConvert — Free Image & Document Converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalConvert — Free Image & Document Converter",
    description:
      "Convert images and documents directly in your browser. 100% private.",
    images: [`${siteUrl}/og.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "LocalConvert",
              url: siteUrl,
              description:
                "Free browser-based image and document converter. 100% private — no uploads, no servers.",
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Convert between JPEG, PNG, WebP, AVIF, HEIC",
                "Convert between Markdown, HTML, JSON, CSV, XML, YAML",
                "Export to PDF and DOCX",
                "100% browser-based, no file uploads",
                "Free forever, no account required",
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <I18nProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </I18nProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
