import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllFeaturesServer } from '@/lib/features-server'
import { FEATURES } from '@/lib/feature-keys'

// ═══════════════════════════════════════════
// Cada item do nav → feature toggle vinculada
// ═══════════════════════════════════════════
const NAV_FEATURE_MAP: Record<string, string> = {
  '/entregador': FEATURES.DASHBOARD_ENTREGADOR,
  '/entregador/acompanhamento': FEATURES.DASHBOARD_ENTREGADOR,
  '/entregador/meus-pacotes': FEATURES.MEUS_PACOTES_AVANCADO,
  '/entregador/meus-dados': FEATURES.ENTREGADOR_DETALHE,
  '/entregador/financeiro': FEATURES.MODULO_FINANCEIRO,
}

const ALL_NAV_ITEMS = [
  { href: '/entregador', icon: '📊', label: 'Dashboard', grupo: 'Gestão' },
  { href: '/entregador/acompanhamento', icon: '📋', label: 'Acompanhamento', grupo: 'Gestão' },
  { href: '/entregador/meus-pacotes', icon: '📦', label: 'Meus Pacotes', grupo: 'Gestão' },
  { href: '/entregador/meus-dados', icon: '👤', label: 'Meus Dados', grupo: 'Pessoal' },
  { href: '/entregador/financeiro', icon: '💰', label: 'Financeiro', grupo: 'Pessoal' },
]

function filtrarItens<T extends { href: string }>(
  itens: T[],
  features: Record<string, boolean>
): T[] {
  return itens.filter(item => {
    const chave = NAV_FEATURE_MAP[item.href]
    if (!chave) return true
    return features[chave] !== false
  })
}

export default async function EntregadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.tipo !== 'entregador') redirect('/login')

  const features = await getAllFeaturesServer()
  const NAV_ITEMS = filtrarItens(ALL_NAV_ITEMS, features)
  const GRUPOS = Array.from(new Set(NAV_ITEMS.map(i => i.grupo)))

  const isImpersonated = session.impersonated === true

  return (
    <div className="min-h-screen flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-64 hidden md:flex flex-col fixed inset-y-0 left-0 z-30 border-r border-gray-200 bg-gray-50">
        {/* Logo */}
        <a href="/entregador" className="px-5 py-5 border-b border-gray-200 flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="relative w-9 h-9 bg-gradient-to-br from-violet-600 to-purple-800 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-orange-400 text-lg" style={{ filter: 'drop-shadow(0 0 6px rgba(251, 146, 60, 0.5))' }}>🚛</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Rota Prime</h1>
            <p className="text-[10px] text-violet-600 font-semibold">
              {session.nome}
            </p>
          </div>
        </a>

        {/* Navigation — filtra por feature */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
          {GRUPOS.map(grupo => (
            <div key={grupo}>
              <p className="text-[10px] font-semibold text-gray-500/70 uppercase tracking-widest px-3 mb-1.5">
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
          <div className="px-3 py-2 text-xs text-gray-400 truncate">
            👤 {session.nome}
          </div>
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
            <a href="/entregador" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-800 rounded-lg flex items-center justify-center">
                <span className="text-orange-400 text-base">🚛</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Rota Prime</h1>
                <p className="text-[10px] text-violet-600 font-semibold">{session.nome}</p>
              </div>
            </a>
            <form action="/api/auth/logout" method="POST">
              <button className="text-xs text-gray-400 hover:text-red-600 transition font-medium">Sair</button>
            </form>
          </div>
        </header>

        {/* Mobile nav — filtra por feature */}
        <nav className="md:hidden overflow-x-auto border-b border-gray-200 bg-gray-50 no-scrollbar">
          <div className="flex px-2 py-1.5 gap-1 text-xs">
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg hover:bg-gray-200/70 text-gray-500 hover:text-gray-900 whitespace-nowrap transition font-medium"
              >
                {item.icon} {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Banner de impersonação */}
        {isImpersonated && (
          <div className="bg-gradient-to-r from-violet-600 to-purple-700">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <span className="text-base">🔍</span>
                <span>
                  <strong className="text-white">Modo Impersonação</strong>
                  {' · '}Você está vendo como <strong className="text-white">{session.nome}</strong>
                  {session.originalAdminNome && (
                    <> (admin: {session.originalAdminNome})</>
                  )}
                </span>
              </div>
              <form action="/api/admin/sair-impersonacao" method="POST">
                <button className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap">
                  ✕ Sair
                </button>
              </form>
            </div>
          </div>
        )}

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
