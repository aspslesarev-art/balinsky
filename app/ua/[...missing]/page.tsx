import { notFound } from 'next/navigation'

// Unknown URL inside this language section: show the section's own 404
// (in its language) instead of the site-wide app/global-not-found.tsx.
export default function Missing() {
  notFound()
}
