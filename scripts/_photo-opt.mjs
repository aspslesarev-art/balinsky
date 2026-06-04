// Server-side image optimisation for the photo-sync scripts.
//
// Two jobs the site depends on:
//  1. The catalog must not break when the Airtable "Opt photos" optimiser
//     automation is off — see `photosOf()` below, which falls back to the raw
//     `Фотографии` field the editor always fills.
//  2. Whatever lands in Airtable (esp. raw camera photos, 4000px+/several MB)
//     must be downscaled to web resolution before it hits Storage/CDN.
//
// `optimizeImage` NEVER throws — if sharp can't read a buffer it returns it
// unchanged, so one odd attachment can't fail the whole sync run.

import sharp from 'sharp'

const MAX_WIDTH = Number(process.env.PHOTO_MAX_WIDTH || 1600)
const QUALITY = Number(process.env.PHOTO_QUALITY || 82)

export async function optimizeImage(buf, maxWidth = MAX_WIDTH) {
  try {
    return await sharp(buf, { failOn: 'none' })
      .rotate()                                   // bake in EXIF orientation
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer()
  } catch {
    return buf // never block an upload on an un-optimisable image
  }
}

// Source-of-truth photo list for a record: the curated/optimised "Opt photos"
// when the Airtable automation has populated it, otherwise the raw "Фотографии"
// the editor uploads. Keeps current behaviour intact while guaranteeing the
// site still gets photos when the optimiser automation drops out.
export function photosOf(rec) {
  const opt = rec?.fields?.['Opt photos']
  if (Array.isArray(opt) && opt.length > 0) return opt
  const raw = rec?.fields?.['Фотографии']
  return Array.isArray(raw) ? raw : []
}
