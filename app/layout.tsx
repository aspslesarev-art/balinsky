import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { WishlistProvider } from "@/components/WishlistContext";
import { SiteChrome } from "@/components/SiteChrome";
import { TmaModeMarker } from "@/components/TmaModeMarker";
import { JsonLd } from "@/components/JsonLd";
import { Analytics } from "@/components/Analytics";
import { GTM_ID, YM_ID } from "@/lib/analytics";
import { organizationLd, websiteLd } from "@/lib/json-ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Geist Mono (`font-mono`) is only used on /admin/* editors — never on the
// public catalog / detail pages. Keep the CSS variable available, but
// `preload: false` so its woff2 isn't preloaded at high priority on every
// public page, where it just competes with the LCP hero image for the
// early mobile bandwidth.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// metadataBase makes every relative canonical / og:image across the app
// resolve to an absolute URL — Google formally prefers absolute canonicals.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'),
  title: 'Balinsky — недвижимость на Бали',
  description: 'Каталог вилл, апартаментов и жилых комплексов на Бали с фото, ценами и проверенными застройщиками.',
  // Static icon paths in /public — no Next.js hash, so Google's favicon
  // cache key stays stable across deploys. /favicon.ico must exist for
  // crawlers that ignore <link rel="icon"> and probe the root path.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  // Ownership proof for Яндекс.Вебмастер. Next emits this as
  // <meta name="yandex-verification" content="..."> once in <head>,
  // on every page via the root layout — no duplication.
  verification: {
    yandex: '2fa357eabff80404',
  },
};

// Without this, iOS WebView (Telegram in-app browser, Twitter, etc.)
// falls back to the default 980 px viewport and scales the page
// down — every "контент шире экрана" mobile bug we saw was rooted
// here. width=device-width pegs the layout viewport to the actual
// device width so the existing max-w / px rules actually clamp.
// `viewportFit: 'cover'` lets the safe-area inset paddings (notch /
// home-indicator) work cleanly on notched devices.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // <html lang="ru"> is the canonical default. EN pages override via a
  // small `<DocumentLangSetter lang="en"/>` client script rendered from
  // the /en route group's layout — reading `headers()` here turned
  // every prerendered detail page dynamic and crashed ISR.
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect to the photo bucket — every card's first image fetch
            saves ~150-300 ms on the LCP element. dns-prefetch is a fallback
            for older browsers that ignore preconnect. */}
        <link rel="preconnect" href="https://ifdgiwxothmcalibmydv.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://ifdgiwxothmcalibmydv.supabase.co" />
        {/* Lifts the blur on gated analytics blocks for signed-in visitors.
            Runs before first paint, so there is no flash of blurred content.
            It must stay inline and cookie-driven: doing this on the server
            would make every page vary by visitor and break ISR + indexing.
            The cookie grants nothing — see components/GatedBlock.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(document.cookie.indexOf('bx_auth=1')>-1)document.documentElement.setAttribute('data-auth','1')}catch(e){}",
          }}
        />
        {/* Analytics origins — preconnect so the deferred script isn't
            paying for handshake when it eventually fires. */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* GTM / GA4 / Метрика. Client-side so admin work and our own
            browsing never land in the reports — see components/Analytics.tsx. */}
        <Analytics />
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixel, not a Next image */}
            <img
              src={`https://mc.yandex.ru/watch/${YM_ID}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <TmaModeMarker />
        <CurrencyProvider>
          <WishlistProvider>
            {children}
            <SiteChrome />
          </WishlistProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
