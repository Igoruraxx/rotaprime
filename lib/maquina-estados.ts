// Máquina de Estados - Fluxo de Pacotes
// Define as transições válidas entre status

export const TRANSICOES: Record<string, string[]> = {
  'Recebido pela Central':     ['Retirado pelo Entregador', 'Aguardando Retirada', 'Retornado a Central'],
  'Aguardando Retirada':       ['Retirado pelo Entregador', 'Retornado a Central'],
  'Retirado pelo Entregador':  ['Em Rota', 'Retornado a Central'],
  'Em Rota':                   ['Entregue', 'Retornado a Central'],
  'Entregue':                  ['Validado pelo Admin', 'Retornado a Central'],
  'Retornado a Central':       ['Aguardando Retirada', 'Recebido pela Central'],
  'Validado pelo Admin':       [],
}

export const STATUS_ORDEM: Record<string, number> = {
  'Recebido pela Central': 0,
  'Aguardando Retirada': 1,
  'Retirado pelo Entregador': 2,
  'Em Rota': 3,
  'Entregue': 4,
  'Retornado a Central': -1,
  'Validado pelo Admin': 5,
}

// Quem pode executar cada transição
// Formato: 'statusAtual->novoStatus' : { quem, logs? }
const PERMISSOES: Record<string, { quem: string; logs?: string }> = {
  'Aguardando Retirada':        { quem: 'admin', logs: 'data_repassado_entregador' },
  'Recebido pela Central->Retirado pelo Entregador': { quem: 'entregador', logs: 'data_retirada_central' },
  'Retirado pelo Entregador':   { quem: 'entregador', logs: 'data_retirada_central' },
  'Em Rota':                    { quem: 'entregador' },
  'Entregue':                   { quem: 'entregador', logs: 'data_entrega_real' },
  'Retornado a Central':        { quem: 'entregador' },
  'Validado pelo Admin':        { quem: 'admin', logs: 'data_validacao_admin' },
  'Recebido pela Central':      { quem: 'admin' },
}

// Transições específicas que sobrescrevem a permissão padrão
const TRANSICOES_PERMITIDAS: Record<string, string> = {
  'Retornado a Central->Aguardando Retirada': 'entregador', // Entregador pode tentar novamente
}

export type StatusPacote = keyof typeof TRANSICOES

export function podeTransitar(statusAtual: string, novoStatus: string): boolean {
  return TRANSICOES[statusAtual]?.includes(novoStatus) ?? false
}

export function transicoesValidas(statusAtual: string): string[] {
  return TRANSICOES[statusAtual] || []
}

// Status que o admin NUNCA pode selecionar (apenas entregador via app)
export const STATUS_RESTRITOS_ADMIN = new Set(['Em Rota', 'Entregue'])

// Status que exigem entregador_id ao serem definidos pelo admin
export const STATUS_EXIGE_ENTREGADOR = new Set(['Aguardando Retirada', 'Retirado pelo Entregador'])

export function transicoesValidasParaAdmin(statusAtual: string): string[] {
  return (TRANSICOES[statusAtual] || []).filter(s => !STATUS_RESTRITOS_ADMIN.has(s))
}

export function quemPode(statusAtual: string, novoStatus: string): string | null {
  // Verifica primeiro se há uma transição específica permitida
  const chaveTransicao = `${statusAtual}->${novoStatus}`
  if (TRANSICOES_PERMITIDAS[chaveTransicao]) {
    return TRANSICOES_PERMITIDAS[chaveTransicao]
  }
  const permissao = PERMISSOES[novoStatus]
  return permissao?.quem || null
}

export function logTransicao(statusAtual: string, novoStatus: string): string | null {
  const permissao = PERMISSOES[novoStatus]
  return permissao?.logs || null
}

export function transicaoValida(
  statusAtual: string,
  novoStatus: string,
  tipoUsuario: 'admin' | 'entregador'
): { valida: boolean; erro?: string } {
  if (statusAtual === novoStatus) {
    return { valida: false, erro: 'Pacote já está neste status' }
  }

  if (!podeTransitar(statusAtual, novoStatus)) {
    return {
      valida: false,
      erro: `Não é possível mudar de "${statusAtual}" para "${novoStatus}"`
    }
  }

  const permitido = quemPode(statusAtual, novoStatus)
  if (permitido && permitido !== tipoUsuario) {
    return {
      valida: false,
      erro: `Apenas ${permitido === 'admin' ? 'administradores' : 'entregadores'} podem realizar esta ação`
    }
  }

  return { valida: true }
}

export function camposParaTransicao(statusAtual: string, novoStatus: string): Record<string, unknown> {
  const updates: Record<string, unknown> = { status: novoStatus }
  const agora = new Date().toISOString()

  const campoLog = logTransicao(statusAtual, novoStatus)
  if (campoLog) {
    updates[campoLog] = agora
  }

  // Se admin define "Retirado pelo Entregador", também preenche o campo
  // de quando foi repassado ao entregador (timeline anterior)
  if (novoStatus === 'Retirado pelo Entregador' && statusAtual !== 'Aguardando Retirada') {
    updates.data_repassado_entregador = agora
    updates.data_retirada_central = agora
  }

  if (novoStatus === 'Validado pelo Admin') {
    updates.validacao_admin = true
    updates.data_validacao_admin = agora
  }

  if (novoStatus === 'Recebido pela Central') {
    updates.data_retirada_central = null
    updates.data_entrega_real = null
  }

  return updates
}

export function statusAcoes(status: string): { label: string; destino: string; cor: string }[] {
  const mapa: Record<string, { label: string; destino: string; cor: string }[]> = {
    'Recebido pela Central': [
      { label: '📤 Aguardar Retirada', destino: 'Aguardando Retirada', cor: 'bg-yellow-500' },
    ],
    'Aguardando Retirada': [],
    'Retirado pelo Entregador': [
      { label: '🚚 Iniciar Rota', destino: 'Em Rota', cor: 'bg-indigo-500' },
    ],
    'Em Rota': [
      { label: '✅ Entregar', destino: 'Entregue', cor: 'bg-green-500' },
      { label: '🔄 Devolver', destino: 'Retornado a Central', cor: 'bg-red-500' },
    ],
    'Entregue': [
      { label: '👍 Validar', destino: 'Validado pelo Admin', cor: 'bg-emerald-500' },
    ],
    'Retornado a Central': [
      { label: '📦 Recolocar em Rota', destino: 'Aguardando Retirada', cor: 'bg-yellow-500' },
    ],
  }
  return mapa[status] || []
}
