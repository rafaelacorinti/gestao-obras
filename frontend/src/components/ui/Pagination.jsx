import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function usePagination(data = [], pageSize = 20) {
  const [page, setPage] = useState(1)
  const total = data.length
  const totalPages = Math.ceil(total / pageSize)
  const paged = data.slice((page - 1) * pageSize, page * pageSize)
  const reset = () => setPage(1)
  return { paged, page, setPage, totalPages, total, reset }
}

export default function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium">{from}–{to}</span> de <span className="font-medium">{total}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-white disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-white'}`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-white disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
