'use client'

import { useState } from 'react'
import { Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { ComplexVisualizationViewer } from '@/components/ComplexVisualizationViewer'

type ViewerProps = Parameters<typeof ComplexVisualizationViewer>[0]

export function CollapsibleViewer(props: ViewerProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[12.5px] text-[#111827] border border-transparent hover:border-[#1F8B5F]"
        aria-expanded={open}
      >
        <MapIcon size={12} className="text-[#1F8B5F]" />
        {open ? 'Скрыть интерактивный план' : 'Показать интерактивный план'}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-3">
          <ComplexVisualizationViewer {...props} />
        </div>
      )}
    </div>
  )
}
