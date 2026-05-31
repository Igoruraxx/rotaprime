// Cache de features em memória para evitar chamadas repetidas
let cache: Record<string, boolean> | null = null

export async function featureAtiva(chave: string): Promise<boolean> {
  // Sempre carregar do cache ou buscar
  if (!cache) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/configuracoes`, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) return true // fallback: permitir se API falhar
      const data = await res.json()
      cache = {}
      for (const f of data.features || []) {
        cache[f.chave] = f.ativo
      }
    } catch {
      return true
    }
  }
  return cache[chave] ?? true
}

export function limparCacheFeatures() {
  cache = null
}

// Lista completa de chaves do sistema para referência
export const FEATURES = {
  DASHBOARD: 'dashboard',
  RELATORIO_DIARIO: 'relatorio_diario',
  PACOTES_LISTA: 'pacotes_lista',
  PACOTES_REGISTRAR: 'pacotes_registrar',
  PACOTES_RASTREAR: 'pacotes_rastrear',
  PACOTES_EDITAR: 'pacotes_editar',
  PACOTES_REPASSAR_LOTE: 'pacotes_repassar_lote',
  ENTREGADORES_CRUD: 'entregadores_crud',
  ENTREGADOR_DETALHE: 'entregador_detalhe',
  FOTOS_GALERIA: 'fotos_galeria',
  FOTOS_VALIDAR: 'fotos_validar',
  TRANSPORTADORAS_CRUD: 'transportadoras_crud',
  CONFIGURACOES: 'configuracoes_sistema',
} as const
