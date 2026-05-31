import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || session.tipo !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:block">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-gray-800">Rota Prime</h1>
          <p className="text-xs text-gray-500">Admin</p>
        </div>
        <nav className="p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase px-3 pt-3 pb-1">Gestão</p>
          <a href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
            📊 Dashboard
          </a>
          <a href="/admin/pacotes" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
            📦 Pacotes
          </a>
          <a href="/admin/registrar" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
            ➕ Registrar
          </a>
          <a href="/admin/rastrear" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
            🔍 Rastrear
          </a>

          <p className="text-xs font-semibold text-gray-400 uppercase px-3 pt-4 pb-1">Config</p>
          <a href="/login" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition">
            🚪 Sair
          </a>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar mobile */}
        <header className="bg-white border-b md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-800">Rota Prime</h1>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-red-600">Sair</button>
            </form>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="bg-white border-b md:hidden overflow-x-auto">
          <div className="flex px-2 py-1 gap-1 text-xs">
            <a href="/admin" className="px-3 py-2 rounded-lg hover:bg-blue-50 whitespace-nowrap">📊 Dash</a>
            <a href="/admin/pacotes" className="px-3 py-2 rounded-lg hover:bg-blue-50 whitespace-nowrap">📦 Pacotes</a>
            <a href="/admin/registrar" className="px-3 py-2 rounded-lg hover:bg-blue-50 whitespace-nowrap">➕ Novo</a>
            <a href="/admin/rastrear" className="px-3 py-2 rounded-lg hover:bg-blue-50 whitespace-nowrap">🔍 Buscar</a>
          </div>
        </nav>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
