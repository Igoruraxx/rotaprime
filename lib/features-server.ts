// ═══════════════════════════════════════════════════════════════
// Feature Toggles — versão SERVER-ONLY (consulta Supabase direto)
// Usado em layouts e server components — sem dependência React
// ═══════════════════════════════════════════════════════════════
import { supabase } from '@/lib/db'

let _serverCache: Record<string, boolean> | null = null
let _serverCacheTime = 0
const CACHE_TTL = 30_000

export async function getAllFeaturesServer(): Promise<Record<string, boolean>> {
  if (_serverCache && Date.now() - _serverCacheTime < CACHE_TTL) {
    return _serverCache
  }
  try {
    const { data } = await supabase
      .from('configuracoes_sistema')
      .select('chave, ativo')
    const map: Record<string, boolean> = {}
    if (data) {
      for (const c of data) map[c.chave] = c.ativo
    }
    _serverCache = map
    _serverCacheTime = Date.now()
    return map
  } catch {
    return {}
  }
}

export async function featureAtivaServer(chave: string): Promise<boolean> {
  const features = await getAllFeaturesServer()
  return features[chave] ?? true
}
