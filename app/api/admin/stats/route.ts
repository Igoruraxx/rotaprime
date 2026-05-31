import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]
  const agora = new Date().toISOString()

  // Buscar indicadores em paralelo
  const [
    { count: total },
    { count: validar },
    { count: atrasados },
    { count: central },
    { data: ultimosPacotes },
    { data: entregadores }
  ] = await Promise.all([
    supabase.from('pacotes').select('*', { count: 'exact', head: true }),
    supabase.from('pacotes').select('*', { count: 'exact', head: true }).neq('status', 'Validado pelo Admin'),
    supabase.from('pacotes').select('*', { count: 'exact', head: true }).lt('data_limite_entrega', agora).not('status', 'in', '("Entregue","Validado pelo Admin")'),
    supabase.from('pacotes').select('*', { count: 'exact', head: true }).in('status', ['Recebido pela Central', 'Aguardando Retirada', 'Retornado a Central']),
    supabase.from('pacotes').select('*, entregadores(nome)').order('data_chegada', { ascending: false }).limit(10),
    supabase.from('entregadores').select('*').eq('ativo', true)
  ])

  return NextResponse.json({
    stats: {
      total: total || 0,
      validar: validar || 0,
      atrasados: atrasados || 0,
      central: central || 0
    },
    ultimosPacotes: ultimosPacotes || [],
    entregadores: entregadores || []
  })
}
