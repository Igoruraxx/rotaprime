// ═══════════════════════════════════════════════════════════════
// Sistema de Feature Toggles — usado por admin E entregador
// ═══════════════════════════════════════════════════════════════
import { FEATURES } from './feature-keys'
export { FEATURES }

let _cache: Record<string, boolean> | null = null
let _cacheTime = 0
const CACHE_TTL = 30_000 // 30 segundos

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
