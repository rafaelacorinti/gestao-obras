import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = true }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${danger ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle size={22} className={danger ? 'text-red-600' : 'text-yellow-600'} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={onConfirm} className={`flex-1 justify-center font-medium px-4 py-2 rounded-lg text-white flex items-center gap-2 transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
