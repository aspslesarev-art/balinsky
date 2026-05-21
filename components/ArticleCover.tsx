// Visual fallback for knowledge articles that don't ship a custom
// cover image. Renders a typography card with the article title on a
// deterministic gradient — picking the gradient from a fixed palette
// by hashing the slug. Same article always gets the same colours
// across views and sessions.

const PALETTE: Array<[string, string]> = [
  ['#E78C3D', '#F4C16D'], // brand orange → warm sand
  ['#1F3B2F', '#3D7D5E'], // deep green → eucalyptus
  ['#22577A', '#56C5C5'], // navy → turquoise
  ['#8A4F7D', '#D5A5C3'], // mulberry → mauve
  ['#9A3B3B', '#E3877C'], // wine → coral
  ['#3D5A80', '#98C1D9'], // ocean → mist
  ['#2D6A4F', '#95D5B2'], // jungle → moss
  ['#7E4A3B', '#D9A07A'], // terracotta → biscuit
]

function hashSlug(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function ArticleCover({ title, slug }: { title: string; slug: string }) {
  const [from, to] = PALETTE[hashSlug(slug) % PALETTE.length]
  // Surface up to ~110 chars; longer titles get clamped by line-clamp.
  return (
    <div
      className="w-full h-full flex items-center justify-center p-4 text-white"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      <div className="text-center text-[15px] md:text-[17px] font-semibold leading-tight tracking-tight line-clamp-4">
        {title}
      </div>
    </div>
  )
}
