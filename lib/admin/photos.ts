// Per-record photo manifest management for the admin data engine.
//
// Photos live in a Storage bucket's `_manifest.json` keyed by record id
// (`Record<id, string[]>`), exactly like the public catalog reads
// (app/ru/villy/_lib.ts:640). We read-modify-write that manifest so admin
// edits don't disturb other records' photos.

import { adminSb, supabaseUrl } from './sb'
import { cdnRewrite, cdnBucketBase } from '@/lib/photo-cdn'
import type { CollectionConfig } from './adapters/types'

function manifestPath(cfg: CollectionConfig): { bucket: string; key: string } {
  if (!cfg.photo) throw new Error('collection has no photo bucket')
  return { bucket: cfg.photo.bucket, key: cfg.photo.manifestKey ?? '_manifest.json' }
}

type Manifest = Record<string, string[]>

async function loadManifest(cfg: CollectionConfig): Promise<Manifest> {
  const { bucket, key } = manifestPath(cfg)
  const url = `${supabaseUrl()}/storage/v1/object/public/${bucket}/${key}?t=${Date.now()}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return {}
    const json = await res.json()
    return (json && typeof json === 'object') ? json as Manifest : {}
  } catch {
    return {}
  }
}

async function saveManifest(cfg: CollectionConfig, manifest: Manifest): Promise<void> {
  const { bucket, key } = manifestPath(cfg)
  const body = Buffer.from(JSON.stringify(manifest))
  const { error } = await adminSb().storage.from(bucket).upload(key, body, {
    contentType: 'application/json',
    upsert: true,
    cacheControl: '60',
  })
  if (error) throw new Error(`storage(${bucket}/${key}): ${error.message}`)
}

// Photos for one record, with Supabase URLs rewritten to the CDN host.
export async function getPhotos(cfg: CollectionConfig, id: string): Promise<string[]> {
  const manifest = await loadManifest(cfg)
  const urls = manifest[id] ?? []
  return urls.map(u => cdnRewrite(u) ?? u)
}

// Replace the full photo list for one record (used for add / remove / reorder).
export async function setPhotos(cfg: CollectionConfig, id: string, urls: string[]): Promise<void> {
  const manifest = await loadManifest(cfg)
  manifest[id] = urls
  await saveManifest(cfg, manifest)
}

// Upload one image to the photo bucket, return its public/CDN URL. The caller
// then appends it to the record's manifest via setPhotos.
export async function uploadPhoto(cfg: CollectionConfig, opts: {
  filename: string
  buf: Buffer
  contentType: string
}): Promise<string> {
  return uploadToBucket(manifestPath(cfg).bucket, opts)
}

// Upload one file to an arbitrary Storage bucket, return its public/CDN URL.
export async function uploadToBucket(bucket: string, opts: {
  filename: string
  buf: Buffer
  contentType: string
}): Promise<string> {
  const safe = opts.filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'file'
  const key = `admin/${Date.now()}-${safe}`
  const { error } = await adminSb().storage.from(bucket).upload(key, opts.buf, {
    contentType: opts.contentType,
    upsert: false,
    cacheControl: '604800',
  })
  if (error) throw new Error(`storage(${bucket}): ${error.message}`)
  return `${cdnBucketBase(bucket)}/${key}`
}
