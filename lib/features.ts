// ═══════════════════════════════════════════════════════════════
// Sistema de Feature Toggles — usado por admin E entregador
// ═══════════════════════════════════════════════════════════════

let _cache: Record<string, boolean> | null = null
let _cacheTime = 0
const CACHE_TTL = 30_000 // 30 segundos

export const FEATURES = {
  // Geral
  MODULO_ADMIN: 'modulo_admin',
  MODULO_ENTREGADOR: 'modulo_entregador',
  TEMA_ESCURO: 'tema_escuro',
  SISTEMA_AUDITORIA: 'sistema_auditoria',

  // Pacotes
  PACOTES_CRUD: 'pacotes_crud',
  RASTREAMENTO_AVANCADO: 'rastreamento_avancado',
  ATRIBUICAO_LOTE: 'atribuicao_lote',
  EDICAO_COMPLETA_PACOTE: 'edicao_completa_pacote',
  VALIDACAO_ADMIN: 'validacao_admin',
  MAPA_PACOTES: 'mapa_pacotes',
  COMPROVANTE_PDF: 'comprovante_pdf',

  // Entregadores
  ENTREGADORES_CRUD: 'entregadores_crud',
  ENTREGADOR_DETALHE: 'entregador_detalhe',
  ENTREGADOR_CAMPOS_ADICIONAIS: 'entregador_campos_adicionais',
  CONTROLE_SENHA: 'controle_senha',
  VALOR_PADRAO_ENTREGA: 'valor_padrao_entrega',
  CICLOS_PAGAMENTO: 'ciclos_pagamento',

  // Entregas
  FOTO_ENTREGA: 'foto_entrega',
  GPS_ENTREGA: 'gps_entrega',
  COMPRESSED_FOTO: 'compressed_foto',
  GESTAO_FOTOS_ADMIN: 'gestao_fotos_admin',
  AGRUPAMENTO_ROTA: 'agrupamento_rota',

  // Relatórios
  RELATORIO_DIARIO: 'relatorio_diario',
  RELATORIO_CONSOLIDADO: 'relatorio_consolidado',
  FINALIZAR_DIA: 'finalizar_dia',
  EXPORTAR_RELATORIO: 'exportar_relatorio',

  // Financeiro
  MODULO_FINANCEIRO: 'modulo_financeiro',
  CONTROLE_PAGAMENTOS: 'controle_pagamentos',
  DASHBOARD_FINANCEIRO: 'dashboard_financeiro',

  // Comunicação
  WHATSAPP_INTEGRACAO: 'whatsapp_integracao',
  LOG_WHATSAPP: 'log_whatsapp',

  // Transportadoras
  TRANSPORTADORAS_CRUD: 'transportadoras_crud',

  // Segurança
  CSRF_PROTECAO: 'csrf_protecao',
  RATE_LIMIT: 'rate_limit',
  MASS_ASSIGNMENT_PROTECTION: 'mass_assignment_protection',
  SESSION_TIMEOUT: 'session_timeout',

  // Dashboard Entregador
  DASHBOARD_ENTREGADOR: 'dashboard_entregador',
  MEUS_PACOTES_AVANCADO: 'meus_pacotes_avancado',
  DETALHE_PACOTE_COMPLETO: 'detalhe_pacote_completo',
} as const

export async function featureAtiva(chave: string): Promise<boolean> {
  // Cache em memória por 30s
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache[chave] ?? false
  }

  try {
    const res = await fetch('/api/configuracoes')
    if (!res.ok) {
      // Fallback: assume tudo ativo se não conseguir carregar
      return true
    }
    const data = await res.json()
    const configs: Array<{ chave: string; ativo: boolean }> = data.todas || data.configuracoes || []
    _cache = {}
    for (const c of configs) {
      _cache[c.chave] = c.ativo
    }
    _cacheTime = Date.now()
    return _cache[chave] ?? true // default: ativo se não encontrado
  } catch {
    return true // fallback: assume ativo
  }
}

export function limparCacheFeatures(): void {
  _cache = null
  _cacheTime = 0
}

// Hook React para usar features nos componentes
import { useState, useEffect } from 'react'

export function useFeature(chave: string): boolean | null {
  const [ativo, setAtivo] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    featureAtiva(chave).then(v => {
      if (mounted) setAtivo(v)
    })
    return () => { mounted = false }
  }, [chave])

  return ativo
}

export function useFeatures(chaves: string[]): Record<string, boolean | null> {
  const [result, setResult] = useState<Record<string, boolean | null>>({})

  useEffect(() => {
    let mounted = true
    Promise.all(chaves.map(async (c) => ({ c, v: await featureAtiva(c) })))
      .then(items => {
        if (!mounted) return
        const obj: Record<string, boolean | null> = {}
        for (const { c, v } of items) obj[c] = v
        setResult(obj)
      })
    return () => { mounted = false }
  }, [chaves.join(',')])

  return result
}
