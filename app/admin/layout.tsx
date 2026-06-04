import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllFeaturesServer } from '@/lib/features-server'
import { FEATURES } from '@/lib/feature-keys'

// ═══════════════════════════════════════════
// Cada item do nav → feature toggle vinculada
// ═══════════════════════════════════════════
const NAV_FEATURE_MAP: Record<string, string> = {
  '/admin': FEATURES.MODULO_ADMIN,
  '/admin/registrar': FEATURES.PACOTES_CRUD,
  '/admin/pacotes': FEATURES.PACOTES_CRUD,
  '/admin/rastrear': FEATURES.RASTREAMENTO_AVANCADO,
  '/admin/relatorio': FEATURES.RELATORIO_DIARIO,
  '/admin/relatorio-mensal': FEATURES.RELATORIO_CONSOLIDADO,
  '/admin/financeiro': FEATURES.DASHBOARD_FINANCEIRO,
  '/admin/pagamentos': FEATURES.CONTROLE_PAGAMENTOS,
  '/admin/finalizar-dia': FEATURES.FINALIZAR_DIA,
  '/admin/entregadores': FEATURES.ENTREGADORES_CRUD,
  '/admin/fotos': FEATURES.GESTAO_FOTOS_ADMIN,
  '/admin/transportadoras': FEATURES.TRANSPORTADORAS_CRUD,
  '/admin/predefinicoes': FEATURES.VALOR_PADRAO_ENTREGA,
}

const ALL_NAV_ITEMS = [
  { href: '/admin', icon: '📊', label: 'Dashboard', grupo: 'Início' },
  { href: '/admin/registrar', icon: '➕', label: 'Registrar', grupo: 'Início' },
  { href: '/admin/pacotes', icon: '📦', label: 'Pacotes', grupo: 'Início' },
  { href: '/admin/rastrear', icon: '🔍', label: 'Rastrear', grupo: 'Início' },
  { href: '/admin/fotos', icon: '📸', label: 'Fotos', grupo: 'Início' },
  { href: '/admin/relatorio', icon: '📋', label: 'Relatório', grupo: 'Gestão' },
  { href: '/admin/financeiro', icon: '💰', label: 'Financeiro', grupo: 'Gestão' },
  { href: '/admin/finalizar-dia', icon: '🔒', label: 'Finalizar', grupo: 'Gestão' },
  { href: '/admin/relatorio-mensal', icon: '📊', label: 'Métricas', grupo: 'Gestão' },
  { href: '/admin/transportadoras', icon: '🚚', label: 'Transportadoras', grupo: 'Sistema' },
  { href: '/admin/entregadores', icon: '👥', label: 'Entregadores', grupo: 'Sistema' },
  { href: '/admin/predefinicoes', icon: '🎛️', label: 'Predefinições', grupo: 'Sistema' },
  { href: '/admin/configuracoes', icon: '⚙️', label: 'Controle', grupo: 'Sistema' },
]

const ALL_MOBILE_ITEMS = [
  { href: '/admin', icon: '📊', label: 'Dash' },
  { href: '/admin/registrar', icon: '➕', label: 'Novo' },
  { href: '/admin/pacotes', icon: '📦', label: 'Pacotes' },
  { href: '/admin/rastrear', icon: '🔍', label: 'Buscar' },
  { href: '/admin/relatorio', icon: '📋', label: 'Relatório' },
  { href: '/admin/financeiro', icon: '💰', label: 'Finance' },
  { href: '/admin/finalizar-dia', icon: '🔒', label: 'Finaliz.' },
  { href: '/admin/relatorio-mensal', icon: '📊', label: 'Métric.' },
  { href: '/admin/fotos', icon: '📸', label: 'Fotos' },
  { href: '/admin/transportadoras', icon: '🚚', label: 'Transp.' },
  { href: '/admin/entregadores', icon: '👥', label: 'Entreg.' },
  { href: '/admin/predefinicoes', icon: '🎛️', label: 'Predef.' },
  { href: '/admin/configuracoes', icon: '⚙️', label: 'Ctrl' },
]

function filtrarItens<T extends { href: string }>(
  itens: T[],
  features: Record<string, boolean>
): T[] {
  return itens.filter(item => {
    const chave = NAV_FEATURE_MAP[item.href]
    if (!chave) return true // sempre visível (ex: /admin/configuracoes)
    return features[chave] !== false // false → esconde
  })
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.tipo !== 'admin') redirect('/login')

  const features = await getAllFeaturesServer()
  const NAV_ITEMS = filtrarItens(ALL_NAV_ITEMS, features)
  const MOBILE_ITEMS = filtrarItens(ALL_MOBILE_ITEMS, features)

  // Recalcular grupos apenas com itens visíveis
  const gruposVisiveis = Array.from(new Set(NAV_ITEMS.map(i => i.grupo)))

  return (
    <div className="min-h-screen flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-64 hidden md:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-gray-200 bg-gray-50">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.4))' }}>🚛</span>
              <span className="absolute -top-1 -right-1 text-sm" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' }}>📦</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Rota Prime</h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation — filtra por feature */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
          {gruposVisiveis.map(grupo => (
            <div key={grupo}>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                {grupo}
              </p>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter(i => i.grupo === grupo).map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 transition-all duration-200"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-200">
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-600 hover:bg-gray-200/70 transition-all duration-200 w-full">
              <span>🚪</span>
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Top bar mobile */}
        <header className="md:hidden border-b border-gray-200 bg-gray-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚛</span>
              <h1 className="text-lg font-bold text-gray-900">Rota Prime</h1>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-gray-400 hover:text-red-600 transition">Sair</button>
            </form>
          </div>
        </header>

        {/* Mobile nav — filtra por feature */}
        <nav className="md:hidden overflow-x-auto border-b border-gray-200 bg-gray-50">
          <div className="flex px-2 py-1 gap-1 text-xs">
            {MOBILE_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg hover:bg-gray-200/70 text-gray-500 hover:text-gray-900 whitespace-nowrap transition"
              >
                {item.icon} {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="admin-content flex-1 p-4 md:p-8">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
