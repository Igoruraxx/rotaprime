import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { setImpersonatedSession, getSessionFromRequest, clearImpersonation } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || session.tipo !== 'admin') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const entregadorId = Number(body.entregador_id)
    if (!entregadorId) {
      return NextResponse.json({ erro: 'ID do entregador é obrigatório' }, { status: 400 })
    }

    // Busca dados do entregador
    const { data: entregador, error } = await supabase
      .from('entregadores')
      .select('id, nome')
      .eq('id', entregadorId)
      .single()

    if (error || !entregador) {
      return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
    }

    // Cria a sessão de entregador com flag de impersonação
    const entregadorSession = {
      tipo: 'entregador' as const,
      id: entregador.id,
      nome: entregador.nome,
      entregador_id: entregador.id,
      impersonated: true,
      originalAdminId: session.id,
      originalAdminNome: session.nome,
    }

    const adminSession = {
      tipo: 'admin' as const,
      id: session.id,
      nome: session.nome,
    }

    const response = new NextResponse(
      JSON.stringify({
        ok: true,
        mensagem: `Entrando como ${entregador.nome}...`,
        redirect: `/entregador/acompanhamento`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

    await setImpersonatedSession(response, entregadorSession, adminSession)
    return response

  } catch (err) {
    console.error('Erro ao impersonar:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
