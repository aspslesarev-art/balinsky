import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { WishlistProvider } from "@/components/WishlistContext";
import { SiteChrome } from "@/components/SiteChrome";
import { TmaModeMarker } from "@/components/TmaModeMarker";

const GTM_ID = "GTM-TM6D54Z3";
const YM_ID = 104881153;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadataBase makes every relative canonical / og:image across the app
// resolve to an absolute URL — Google formally prefers absolute canonicals.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'),
  title: 'Balinsky — недвижимость на Бали',
  description: 'Каталог вилл, апартаментов и жилых комплексов на Бали с фото, ценами и проверенными застройщиками.',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side host check so the presentation.estate domain never
  // includes the Balinsky chat widget / footer in the SSR HTML —
  // no client-flash, no hydration mismatch.
  const hdrs = await headers()
  const host = (hdrs.get('host') ?? '').toLowerCase()
  const isClosedPortal = host === 'presentation.estate' || host.endsWith('.presentation.estate')
  return (
    <html
      lang="en"
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
            <img
              src={`https://mc.yandex.ru/watch/${YM_ID}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <TmaModeMarker />
        <CurrencyProvider>
          <WishlistProvider>
            {children}
            <SiteChrome isClosedPortal={isClosedPortal} />
          </WishlistProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
