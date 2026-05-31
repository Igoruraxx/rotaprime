import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function EntregadorPage() {
  const session = await getSession()
  if (!session || session.tipo !== 'entregador') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Rota Prime</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.nome}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-red-600 hover:text-red-800">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Painel</h2>
        <div className="text-gray-500">
          🔧 Módulo Entregador em construção
        </div>
      </main>
    </div>
  )
}
