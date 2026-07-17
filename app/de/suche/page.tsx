import type { Metadata } from 'next'
import { SemanticSearchClient } from '../../ru/poisk/_client'

export const metadata: Metadata = {
  title: 'KI-Immobiliensuche · Balinsky',
  description: 'Beschreiben Sie Ihre Wunschimmobilie in einfachen Worten — das System findet Villen, Apartments und Komplexe nach Bedeutung.',
}

export default function Page() {
  return <SemanticSearchClient lang="de" />
}
