import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'v5.airtableusercontent.com' },
      { protocol: 'https', hostname: 'dl.airtable.com' },
    ],
  },
  async redirects() {
    // 301 redirects from old Wix site (balinsky.info) → new Next routes.
    return [
      // Root → /ru as a permanent (301) redirect. Next's automatic root
      // routing returns 307, which doesn't pass full link equity.
      { source: '/',                   destination: '/ru',                  permanent: true },
      { source: '/villas',             destination: '/ru/villy',            permanent: true },
      { source: '/villas-ready',       destination: '/ru/villy',            permanent: true },
      { source: '/villas-mounth-rent', destination: '/ru/villy',            permanent: true },
      { source: '/villa-monthly-rent', destination: '/ru/villy',            permanent: true },
      { source: '/selections',         destination: '/ru/villy',            permanent: true },
      { source: '/apartments',         destination: '/ru/apartamenty',      permanent: true },
      { source: '/projects',           destination: '/ru/zhilye-kompleksy', permanent: true },
      { source: '/developers',         destination: '/ru/zastrojshhiki',    permanent: true },
      { source: '/agencies',           destination: '/ru/zastrojshhiki',    permanent: true },
      { source: '/agents',             destination: '/ru/zastrojshhiki',    permanent: true },
      { source: '/news',               destination: '/ru/novosti',          permanent: true },
      { source: '/events',             destination: '/ru/meropriyatiya',    permanent: true },
      { source: '/events-telegram',    destination: '/ru/meropriyatiya',    permanent: true },
      { source: '/bonus',              destination: '/ru/akcii',            permanent: true },
      { source: '/base',               destination: '/ru/znaniya',          permanent: true },
      { source: '/presentation',       destination: '/ru',                  permanent: true },
      { source: '/bali-property-awards-2025-by-balinsky', destination: '/ru/zastrojshhiki', permanent: true },
      // Pages without direct equivalents — temporary 302 to homepage; will be replaced.
      { source: '/aboutus',            destination: '/ru', permanent: false },
      { source: '/foragents',          destination: '/ru', permanent: false },
      { source: '/advertising',        destination: '/ru', permanent: false },
      { source: '/vacancy',            destination: '/ru', permanent: false },
      { source: '/vacancydev',         destination: '/ru', permanent: false },
      { source: '/statistic',          destination: '/ru', permanent: false },
      { source: '/b2b-outsorce',       destination: '/ru', permanent: false },
      { source: '/speakers',           destination: '/ru', permanent: false },
      { source: '/si',                 destination: '/ru', permanent: false },
      // Auth/account pages — no auth in new site
      { source: '/login',              destination: '/ru', permanent: false },
      { source: '/sign-up',            destination: '/ru', permanent: false },
      { source: '/forgot-password',    destination: '/ru', permanent: false },
      { source: '/accept-invitation',  destination: '/ru', permanent: false },
      { source: '/agent/myfix',        destination: '/ru', permanent: false },
      { source: '/agent/fix',          destination: '/ru', permanent: false },
    ]
  },
};

export default nextConfig;
