import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

const TIPOS = {
  passagens: { label: 'Passagens', fields: ['colaborador','empresa','origem','destino','data_viagem','data_compra','valor','parcelas','cartao_utilizado','observacoes'] },
  mobilizacao: { label: 'Mobilização', fields: ['colaborador','nome','data_mobilizacao','cidade_origem','estado_origem','cidade_destino','estado_destino','km','valor_reembolso','tipo'] },
  colaboradores: { label: 'Colaboradores', fields: ['nome','apelido','cpf','rg','funcao','data_admissao','data_nascimento','telefone','cidade_origem','estado_origem','indicacao'] },
  custos: { label: 'Custos', fields: ['data_lancamento','categoria','subcategoria','descricao','valor'] },
}

export default function ImportPage() {
  const [step, setStep] = useState(1)
  const [preview, setPreview] = useState(null)
  const [selectedSheet, setSelectedSheet] = useState('')
  const [tipo, setTipo] = useState('passagens')
  const [obraId, setObraId] = useState('')
  const [mapeamento, setMapeamento] = useState({})
  const [resultado, setResultado] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)
  const currentFile = useRef(null)

  const { data: obras = [] } = useQuery({ queryKey: ['obras-list'], queryFn: () => api.get('/obras').then(r => r.data) })

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    currentFile.current = file
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setPreview(data)
      setSelectedSheet(Object.keys(data.sheets)[0])
      if (data.detectedType) setTipo(data.detectedType)
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao ler planilha')
    } finally {
      setUploading(false)
    }
  }

  const handleImport = async () => {
    if (!currentFile.current) return
    setImporting(true)
    const fd = new FormData()
    fd.append('file', currentFile.current)
    fd.append('tipo', tipo)
    fd.append('sheetName', selectedSheet)
    fd.append('mapeamento', JSON.stringify(mapeamento))
    if (obraId) fd.append('obra_id', obraId)
    try {
      const { data } = await api.post('/import/execute', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResultado(data)
      setStep(3)
      toast.success(`${data.importados} registros importados!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro na importação')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setStep(1); setPreview(null); setMapeamento({}); setResultado(null)
    currentFile.current = null
    if (fileRef.current) fileRef.current.value = ''
  }

  const sheetData = preview?.sheets[selectedSheet]
  const campos = TIPOS[tipo]?.fields || []

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Planilha</h1>
        <p className="text-gray-500 text-sm">Importe dados de planilhas Excel (.xlsx) com mapeamento automático ou manual</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        {['Upload', 'Mapeamento', 'Resultado'].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > i+1 ? 'bg-green-500 text-white' : step === i+1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > i+1 ? '✓' : i+1}
            </div>
            <span className={step === i+1 ? 'font-semibold text-gray-900' : 'text-gray-400'}>{s}</span>
            {i < 2 && <ArrowRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Selecione a planilha</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors" onClick={() => fileRef.current?.click()}>
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="text-gray-500">Lendo planilha...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <FileSpreadsheet size={48} className="text-gray-300" />
                <div>
                  <p className="font-semibold text-gray-700">Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-gray-400 text-sm mt-1">Suporte a .xlsx, .xls e .csv — máx. 10MB</p>
                </div>
                <span className="btn-primary text-sm">Selecionar Arquivo</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-semibold text-blue-800 mb-2">Formatos reconhecidos automaticamente:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Passagens:</strong> empresa, colaborador, data, valor, origem, destino, cartão</li>
              <li>• <strong>Mobilização:</strong> colaborador, data, cidade origem/destino, km, reembolso</li>
              <li>• <strong>Colaboradores:</strong> nome, cpf, rg, função, data admissão</li>
              <li>• <strong>Custos:</strong> data, categoria, descrição, valor</li>
            </ul>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Configurar Mapeamento</h2>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div><label className="label">Tipo de Dados</label>
                <select className="input" value={tipo} onChange={e => setTipo(e.target.value)}>
                  {Object.entries(TIPOS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className="label">Aba da Planilha</label>
                <select className="input" value={selectedSheet} onChange={e => setSelectedSheet(e.target.value)}>
                  {Object.keys(preview.sheets).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="label">Obra (opcional)</label>
                <select className="input" value={obraId} onChange={e => setObraId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
            </div>

            {sheetData && (
              <div className="text-sm text-gray-500 mb-4 p-3 bg-gray-50 rounded-lg flex flex-wrap gap-2 items-center">
                <span><strong>{sheetData.totalRows}</strong> linhas</span>
                <span>|</span>
                <span>Arquivo: <strong>{preview.fileName}</strong></span>
                {preview.detectedType && <span className="badge bg-green-100 text-green-700">Tipo detectado: {TIPOS[preview.detectedType]?.label}</span>}
              </div>
            )}

            <p className="text-sm font-semibold text-gray-700 mb-3">Mapear colunas da planilha → campos do sistema:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {campos.map(campo => (
                <div key={campo} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-36 flex-shrink-0 font-mono">{campo}:</label>
                  <select className="input flex-1" value={mapeamento[campo] || ''} onChange={e => setMapeamento(m => ({ ...m, [campo]: e.target.value }))}>
                    <option value="">-- ignorar --</option>
                    {sheetData?.headers.filter(h => h).map((h, i) => <option key={i} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button onClick={handleImport} disabled={importing} className="btn-primary mt-6">
              {importing ? 'Importando...' : 'Importar Dados'}
            </button>
          </div>

          {sheetData?.preview.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Preview — primeiras 5 linhas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-200">
                    {sheetData.headers.map((h, i) => h ? <th key={i} className="table-header text-left">{h}</th> : null)}
                  </tr></thead>
                  <tbody>
                    {sheetData.preview.map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50">
                        {sheetData.headers.map((h, ci) => h ? <td key={ci} className="table-cell">{row[ci]}</td> : null)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && resultado && (
        <div className="card text-center py-12">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${resultado.erros.length === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
            {resultado.erros.length === 0 ? <CheckCircle size={32} className="text-green-600" /> : <AlertCircle size={32} className="text-yellow-600" />}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Importação Concluída!</h2>
          <div className="flex justify-center gap-8 my-4">
            <div><p className="text-3xl font-bold text-green-600">{resultado.importados}</p><p className="text-sm text-gray-500">Importados</p></div>
            <div><p className="text-3xl font-bold text-gray-400">{resultado.total}</p><p className="text-sm text-gray-500">Total</p></div>
            {resultado.erros.length > 0 && <div><p className="text-3xl font-bold text-red-500">{resultado.erros.length}</p><p className="text-sm text-gray-500">Erros</p></div>}
          </div>
          {resultado.erros.length > 0 && (
            <div className="mt-4 text-left max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-700 mb-2">Linhas com erro:</p>
              {resultado.erros.map((e, i) => <p key={i} className="text-xs text-red-600">Linha {e.linha}: {e.erro}</p>)}
            </div>
          )}
          <button onClick={reset} className="btn-primary mt-6"><Upload size={16} /> Nova Importação</button>
        </div>
      )}
    </div>
  )
}
