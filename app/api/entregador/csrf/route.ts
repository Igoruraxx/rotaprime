import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { gerarTokenCSRF } from '@/lib/csrf'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const token = await gerarTokenCSRF(session.id)
  return NextResponse.json({ csrf_token: token })
}
