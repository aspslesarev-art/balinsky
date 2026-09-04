// Объект, добавленный агентом через личный кабинет.
//
// Живёт рядом с каталогом (raw_villas / raw_apartments), но отдельно от него:
// см. пояснение в migrations/079_agent_listings.sql.

export type ListingKind = 'villa' | 'apartment'

export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'archived'

export type AgentListing = {
  id: string
  slug: string
  authorId: number
  kind: ListingKind
  /** ЖК из каталога (raw_complexes.airtable_id) или null — объект вне ЖК. */
  complexId: string | null
  /** Юнит каталога, с которого списаны факты. Заполнен → страница даёт canonical на него. */
  baseUnitId: string | null
  title: string
  priceUsd: number
  comment: string | null
  /** Факты юнита под именами полей каталога: «Комнаты», «Площадь», «Leasehold», … */
  data: Record<string, unknown>
  photos: string[]
  status: ListingStatus
  rejectReason: string | null
  createdAt: string
  updatedAt: string
  approvedAt: string | null
}

/** Контакты автора — то, что видит клиент на карточке вместо контактов Balinsky. */
export type AgentContact = {
  telegramId: number
  name: string
  username: string | null
  phone: string | null
  agency: string | null
  note: string | null
}

/** Черновик из формы кабинета. */
export type ListingDraft = {
  kind: ListingKind
  complexId: string | null
  baseUnitId: string | null
  title: string
  priceUsd: number
  comment: string | null
  data: Record<string, unknown>
  photos: string[]
}
