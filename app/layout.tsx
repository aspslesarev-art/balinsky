import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { WishlistProvider } from "@/components/WishlistContext";
import { SiteChrome } from "@/components/SiteChrome";
import { TmaModeMarker } from "@/components/TmaModeMarker";
import { JsonLd } from "@/components/JsonLd";
import { organizationLd, websiteLd } from "@/lib/json-ld";

const GTM_ID = "GTM-TM6D54Z3";
const YM_ID = 104881153;
const GA4_ID = "G-YPJC0S54ME";

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
        {/* Analytics origins — preconnect so the deferred script isn't
            paying for handshake when it eventually fires. */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />

        {/* Both analytics tags pushed to lazyOnload — they don't need to
            run before the page is interactive. Cuts main-thread JS work
            during FCP / LCP, which is what mobile PSI scores hate most. */}
        <Script id="gtm-loader" strategy="lazyOnload">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        {/* Yandex Metrika without webvisor / accurateTrackBounce —
            those alone add ~200 KB of script + per-event recording.
            Kept clickmap + trackLinks (cheap, useful for behaviour
            reports). Re-enable webvisor manually in YM dashboard
            if you need session replay. */}
        {/* GA4 (gtag.js). Deferred to lazyOnload like the other tags so it
            doesn't compete with FCP/LCP. GTM-TM6D54Z3 above can also route to
            GA4, but this is the direct property tag (G-YPJC0S54ME). */}
        <Script
          id="ga4-loader"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
          strategy="lazyOnload"
        />
        <Script id="ga4-init" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
        </Script>
        <Script id="yandex-metrika" strategy="lazyOnload">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}', 'ym');
ym(${YM_ID}, 'init', {ssr:true, clickmap:true, trackLinks:true, ecommerce:"dataLayer"});`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
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
