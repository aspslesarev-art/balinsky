// Renders schema.org JSON-LD into a <script type="application/ld+json">.
// Server component — no client JS. The `<` escaping prevents any string in the
// data from breaking out of the script tag (the one XSS vector for JSON-LD).

export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
