import { redirect } from 'next/navigation'

// EN root — there's no English landing page yet, but the i18n pilot
// runs at /en/villy/o/<slug>. Bounce the visitor to the Russian home
// for now so they don't hit a 404 while we build out the EN catalog.
export default function EnRoot() {
  redirect('/ru')
}
