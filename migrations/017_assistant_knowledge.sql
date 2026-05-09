-- Editable knowledge base for the Балина AI consultant.
--
-- Until now SYSTEM_PROMPT was hardcoded in lib/consultant.ts and any
-- tweak required a deploy. This table stores the prompt as a list of
-- ordered named sections — admin/balina renders them as textareas
-- and writes back. lib/assistant-knowledge.ts loads + caches them
-- and assembles the final system prompt at request time.
--
-- Design choices:
--   - Sectioned (not one blob) so the editor can find / rearrange
--     specific rules without scrolling a 400-line monster.
--   - sort_order is a plain integer with gaps (10, 20, 30 …) so we
--     can insert between two existing sections without renumbering.
--   - is_default flag tracks whether the body still equals the
--     code-defined seed; lets the admin UI show "default / edited"
--     and offer a per-section reset to default.
--   - No row-level deletes via UI — sections are conceptually fixed;
--     editor can only modify body. Adding a brand-new section is a
--     code change (extends DEFAULT_SECTIONS in the loader).

create table if not exists public.assistant_knowledge (
  key         text primary key,
  title       text not null,
  body        text not null,
  sort_order  integer not null,
  is_default  boolean not null default true,
  updated_at  timestamptz not null default now()
);

create index if not exists assistant_knowledge_sort_idx
  on public.assistant_knowledge (sort_order);

grant select, insert, update, delete on table public.assistant_knowledge to service_role;
