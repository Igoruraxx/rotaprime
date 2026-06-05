import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const agora = new Date().toISOString()

  // Buscar indicadores e listas em paralelo
  const [
    { count: total },
    { count: pendentesValidacao },
    { count: atrasados },
    { count: naCentral },
    { data: ultimosPacotes },
    { data: transportadoras },
  ] = await Promise.all([
    // Total de pacotes
    supabase.from('pacotes').select('*', { count: 'exact', head: true }),
    // Pendentes de validação: entregue mas não validado pelo admin
    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Entregue'),
    // Atrasados: passou da data limite e não foi entregue/validado
    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .lt('data_limite_entrega', agora)
      .not('status', 'in', '("Entregue","Validado pelo Admin")'),
    // Na central: recebidos, aguardando retirada, retornados
    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Recebido pela Central', 'Aguardando Retirada', 'Retornado a Central']),
    // Últimos 50 pacotes (mais recentes primeiro) com dados do entregador
    supabase
      .from('pacotes')
      .select('*, entregadores(nome, telefone)')
      .order('data_chegada', { ascending: false })
      .limit(50),
    // Lista de transportadoras para filtro
    supabase
      .from('transportadoras')
      .select('nome')
      .order('nome'),
  ])

  return NextResponse.json({
    stats: {
      total: total || 0,
      pendentesValidacao: pendentesValidacao || 0,
      atrasados: atrasados || 0,
      naCentral: naCentral || 0,
    },
    ultimosPacotes: ultimosPacotes || [],
    transportadoras: (transportadoras || []).map((t: { nome: string }) => t.nome),
  })
}
