// Shared 1200×630 OG image renderer used by every detail-page
// opengraph-image.tsx. Each page route imports `renderOgImage` and
// passes its title + key facts; Next's ImageResponse turns the JSX
// into a static PNG at build / edge time.
//
// next/og has tight constraints — no client JS, only the subset of
// Tailwind it inlines via the `style` prop, and fonts must be loaded
// explicitly. Keeping the layout simple (left text column + right
// photo block + brand bar) so it renders reliably at the edge.

import { ImageResponse } from 'next/og'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

export const ogSize = { width: 1200, height: 630 }
export const ogContentType = 'image/png'

type Fact = { label: string; value: string }

export async function renderOgImage({
  title,
  subtitle,
  photoUrl,
  facts = [],
  brand = 'Balinsky',
  brandTagline = 'Bali real estate · verified',
}: {
  title: string
  subtitle?: string
  photoUrl?: string | null
  facts?: Fact[]
  brand?: string
  brandTagline?: string
}) {
  // Cap title length so it doesn't overflow the 1200×630 canvas. Two
  // lines × ~22 chars at the chosen font size = comfortable read.
  const safeTitle = title.length > 90 ? title.slice(0, 87) + '…' : title
  const safeSubtitle = subtitle && subtitle.length > 110
    ? subtitle.slice(0, 107) + '…'
    : subtitle

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #F8F5EE 0%, #EFE9DC 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '28px 48px',
            borderBottom: '1px solid rgba(31,90,52,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#1F8B5F',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              B
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{brand}</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>{brandTagline}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>{SITE.replace(/^https?:\/\//, '')}</div>
        </div>

        {/* Main row: text column + photo column */}
        <div style={{ display: 'flex', flex: 1, padding: '32px 48px', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  marginBottom: safeSubtitle ? 16 : 0,
                }}
              >
                {safeTitle}
              </div>
              {safeSubtitle && (
                <div style={{ fontSize: 22, color: '#374151', lineHeight: 1.35 }}>{safeSubtitle}</div>
              )}
            </div>

            {facts.length > 0 && (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 24 }}>
                {facts.slice(0, 4).map(f => (
                  <div
                    key={f.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 18px',
                      background: '#fff',
                      borderRadius: 12,
                      border: '1px solid rgba(31,90,52,0.18)',
                      minWidth: 130,
                    }}
                  >
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>
                      {f.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#111827', marginTop: 4 }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {photoUrl && (
            <div
              style={{
                display: 'flex',
                width: 460,
                height: 420,
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid rgba(31,90,52,0.18)',
                background: '#E5E7EB',
              }}
            >
              {/* next/og's JSX limits us to <img> for raster images;
                  Next.js fetches the URL server-side and inlines it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                width={460}
                height={420}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
        </div>
      </div>
    ),
    { ...ogSize }
  )
}
