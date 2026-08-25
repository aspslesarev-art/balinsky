"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { GA4_ID, GTM_ID, YM_ID, trackEvent } from "@/lib/analytics";

// localStorage flag that keeps this browser out of the analytics numbers.
// Set automatically the first time the browser opens /admin/*, and manually
// via ?no-track=1 — cleared again with ?no-track=0.
const OPT_OUT_KEY = "bx_no_track";

/** Query param that toggles OPT_OUT_KEY by hand. */
const OPT_OUT_PARAM = "no-track";

const isAdminPath = (pathname: string) => pathname.startsWith("/admin");

// Decided on the client only: the root layout must stay static (reading
// headers()/useSearchParams there turns every prerendered page dynamic and
// breaks ISR), so the pathname is read straight off window.location.
function shouldTrack(): boolean {
  const pathname = window.location.pathname;
  try {
    const param = new URLSearchParams(window.location.search).get(OPT_OUT_PARAM);
    if (param === "1") localStorage.setItem(OPT_OUT_KEY, "1");
    if (param === "0") localStorage.removeItem(OPT_OUT_KEY);

    // Opening the admin marks the browser as ours — every later public page
    // view from it stays out of the numbers too. Without this, our own
    // sessions read as "Direct" traffic with 20-minute engagement times.
    if (isAdminPath(pathname)) {
      localStorage.setItem(OPT_OUT_KEY, "1");
      return false;
    }
    return localStorage.getItem(OPT_OUT_KEY) !== "1";
  } catch {
    // Private mode / storage blocked: still never track the admin, but treat
    // everything else as a normal visitor rather than silently losing data.
    return !isAdminPath(pathname);
  }
}

/**
 * GTM + GA4 + Яндекс.Метрика, mounted from the root layout.
 *
 * Renders nothing until the client has decided whether this visit counts, so
 * admin work and our own browsing never reach the reports. The decision is
 * taken once per full page load — /admin is not linked from the public site,
 * so there is no client-side route into it that could slip past the check.
 */
export function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldTrack());
  }, []);

  // Уход в Telegram — второй канал заявок мимо формы, и он размазан по
  // пяти компонентам (карточка застройщика, отзывы, мероприятия, тур,
  // «о нас»). Один делегированный слушатель ловит их все разом и не
  // требует трогать каждую кнопку — включая те, что появятся позже.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (!/^https?:\/\/(t\.me|telegram\.me)\//i.test(href)) return;
      trackEvent("telegram_contact", {
        link_url: href,
        page_path: window.location.pathname,
      });
    };
    // capture: попадаем раньше, чем обработчик ссылки уведёт страницу.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
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
    </>
  );
}
