// Bali around 2050 — one island-wide outlook for a buyer whose leasehold runs
// 25–30 years. Range = median of CMIP6 models under the middle (SSP2-4.5) and
// high (SSP5-8.5) emissions scenarios, 2041–2060 vs 1995–2014.
// Data: lib/bali-climate-2050.json (scripts/cmip6-bali-2050.py).
import { Thermometer } from 'lucide-react'
import data from '@/lib/bali-climate-2050.json'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { title: 'Бали к 2050 году', warmer: 'теплее в среднем', ac: 'больше работы кондиционеру', rain: 'Дожди: модели расходятся, уверенного изменения нет', note: 'Прогноз {n} климатических моделей CMIP6 (Copernicus), умеренный и высокий сценарий выбросов. Одна оценка на весь остров.' },
  en: { title: 'Bali by 2050', warmer: 'warmer on average', ac: 'more work for air conditioning', rain: 'Rain: models disagree, no clear change', note: 'Outlook from {n} CMIP6 climate models (Copernicus), middle and high emissions scenarios. One estimate for the whole island.' },
  id: { title: 'Bali pada 2050', warmer: 'lebih hangat rata-rata', ac: 'kerja AC lebih banyak', rain: 'Hujan: model berbeda pendapat, tidak ada perubahan pasti', note: 'Proyeksi {n} model iklim CMIP6 (Copernicus), skenario emisi sedang dan tinggi. Satu perkiraan untuk seluruh pulau.' },
  fr: { title: 'Bali en 2050', warmer: 'plus chaud en moyenne', ac: 'de travail en plus pour la climatisation', rain: 'Pluie : les modèles divergent, pas de changement net', note: 'Projection de {n} modèles climatiques CMIP6 (Copernicus), scénarios d’émissions moyen et élevé. Une estimation pour toute l’île.' },
  de: { title: 'Bali bis 2050', warmer: 'wärmer im Mittel', ac: 'mehr Arbeit für die Klimaanlage', rain: 'Regen: Modelle uneinig, keine klare Änderung', note: 'Prognose von {n} CMIP6-Klimamodellen (Copernicus), mittleres und hohes Emissionsszenario. Ein Wert für die ganze Insel.' },
  zh: { title: '2050年的巴厘岛', warmer: '平均升温', ac: '空调负荷增加', rain: '降雨：模型结论不一，无明确变化', note: '基于 {n} 个 CMIP6 气候模型（Copernicus），中等与高排放情景。全岛统一估算。' },
  nl: { title: 'Bali in 2050', warmer: 'gemiddeld warmer', ac: 'meer werk voor de airco', rain: 'Regen: modellen zijn het oneens, geen duidelijke verandering', note: 'Prognose van {n} CMIP6-klimaatmodellen (Copernicus), gemiddeld en hoog emissiescenario. Eén schatting voor het hele eiland.' },
  ban: { title: 'Bali ring 2050', warmer: 'lebih anget rata-rata', ac: 'AC makarya lebih akeh', rain: 'Ujan: model mabinayan, nenten wenten pauwahan pasti', note: 'Ramalan {n} model iklim CMIP6 (Copernicus). Asiki perkiraan majeng ring sajebag pulo.' },
  pl: { title: 'Bali w 2050 roku', warmer: 'cieplej średnio', ac: 'więcej pracy dla klimatyzacji', rain: 'Deszcz: modele się różnią, brak wyraźnej zmiany', note: 'Prognoza {n} modeli klimatycznych CMIP6 (Copernicus), średni i wysoki scenariusz emisji. Jedna ocena dla całej wyspy.' },
  uk: { title: 'Балі до 2050 року', warmer: 'тепліше в середньому', ac: 'більше роботи кондиціонеру', rain: 'Дощі: моделі розходяться, певної зміни немає', note: 'Прогноз {n} кліматичних моделей CMIP6 (Copernicus), помірний і високий сценарій викидів. Одна оцінка на весь острів.' },
} as const

const LOCALE: Record<Lang, string> = { ru: 'ru', en: 'en', id: 'id', fr: 'fr', de: 'de', zh: 'zh', nl: 'nl', ban: 'id', pl: 'pl', uk: 'uk' }

export function Climate2050({ lang }: { lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const num = (n: number) => n.toLocaleString(LOCALE[lang] ?? 'en', { maximumFractionDigits: 1 })
  const tLo = data.t.ssp2_4_5.median
  const tHi = data.t.ssp5_8_5.median
  const acLo = Math.round(data.cd.ssp2_4_5.median)
  const acHi = Math.round(data.cd.ssp5_8_5.median)
  const models = Math.max(data.t.ssp2_4_5.models, data.t.ssp5_8_5.models)
  // Only claim a rain trend when even the 10–90% model spread agrees on its sign.
  const rainClear = [data.pr.ssp2_4_5, data.pr.ssp5_8_5].some((s) => s.p10 > 0 || s.p90 < 0)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Thermometer size={15} className="shrink-0 text-[var(--color-primary)]" />
        <h4 className="text-[14px] font-semibold text-[var(--color-text)]">{t.title}</h4>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          <span className="text-[18px] font-semibold text-[var(--color-text)]">+{num(tLo)}…{num(tHi)} °C</span> {t.warmer}
        </p>
        <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          <span className="text-[18px] font-semibold text-[var(--color-text)]">+{acLo}…{acHi}%</span> {t.ac}
        </p>
      </div>
      {!rainClear && <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text)]">{t.rain}</p>}
      <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-muted)]">{t.note.replace('{n}', String(models))}</p>
    </div>
  )
}
