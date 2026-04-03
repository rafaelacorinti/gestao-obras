export const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
export const formatDate = (d) => d ? new Intl.DateTimeFormat('pt-BR').format(new Date(d + 'T00:00:00')) : '-'
export const formatDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : ''

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
