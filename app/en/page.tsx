// Mirror of /ru/page.tsx — same data layer (Russian Airtable content,
// no translation columns yet for the home blocks), only chrome
// translated. When updating the layout of the home page, update both
// files in lockstep.

// For now, redirect to /ru — the home page has 474 lines with many
// inline RU strings that need careful translation. Will be replaced
// with a proper EN home in the next iteration. Visitors clicking
// "EN" in the header from any other page still land on a localised
// version (villas / apartments / complexes / etc all have EN now).
import { redirect } from 'next/navigation'
export default function EnHome() { redirect('/en/villas') }
