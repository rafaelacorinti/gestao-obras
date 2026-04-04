export const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
export const formatDate = (d) => {
  if (!d) return '-'
  try {
    const date = new Date(String(d).includes('T') ? d : d + 'T00:00:00')
    if (isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('pt-BR').format(date)
  } catch { return '-' }
}
export const formatDateInput = (d) => {
  if (!d) return ''
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return ''
    return date.toISOString().split('T')[0]
  } catch { return '' }
}

export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export const CATEGORIAS_CUSTO = {
  mobilizacao_passagens:'Mobilização / Passagens', desmobilizacao:'Desmobilização', folga_campo:'Folga de Campo',
  alimentacao_vr_va:'Alimentação VR/VA', exames:'Exames', compra_folga:'Compra de Folga', outros:'Outros'
}

export const TIPOS_ALOJAMENTO = {
  aluguel:'Aluguel', agua_energia_internet:'Água / Energia / Internet',
  mao_de_obra:'Mão de Obra (Faxineira)', material_limpeza:'Material de Limpeza', outros:'Outros'
}

export const STATUS_BADGE = {
  ativo:'bg-green-100 text-green-700', inativo:'bg-gray-100 text-gray-700',
  ativa:'bg-green-100 text-green-700', concluida:'bg-blue-100 text-blue-700',
  suspensa:'bg-yellow-100 text-yellow-700', cancelada:'bg-red-100 text-red-700',
  pendente:'bg-yellow-100 text-yellow-700', aprovado:'bg-green-100 text-green-700',
  pago:'bg-blue-100 text-blue-700', confirmado:'bg-green-100 text-green-700',
  cancelado:'bg-red-100 text-red-700', ferias:'bg-purple-100 text-purple-700',
  afastado:'bg-orange-100 text-orange-700',
}
