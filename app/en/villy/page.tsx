import { redirect } from 'next/navigation'

// EN villa catalog isn't built yet — the pilot only ships the detail
// page. Send the visitor back to the Russian list until we localise
// the catalog UI.
export default function EnVillyIndex() {
  redirect('/ru/villy')
}
