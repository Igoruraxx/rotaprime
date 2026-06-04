import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest, criarToken, UserSession } from '@/lib/auth'

const rotasPublicas = ['/login', '/api/auth/login', '/api/auth/check', '/api/auth/token']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas não precisam de autenticação
  if (rotasPublicas.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  let session = await getSessionFromRequest(request)

  // ═══ DEV MODE: Auto-login sem credenciais ═══
  if (!session) {
    const destino = pathname.startsWith('/entregador') ? 'entregador' : 'admin'
    const fakeSession: UserSession = destino === 'admin'
      ? { tipo: 'admin', id: 1, nome: 'Admin' }
      : { tipo: 'entregador', id: 2, nome: 'Entregador Teste' }

    const token = await criarToken(fakeSession)
    const response = NextResponse.next()
    response.headers.set(
      'Set-Cookie',
      `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7200`
    )
    return response
  }
  // ════════════════════════════════════════════

  // Rotas de API protegidas
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Rotas admin e entregador
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/admin') && session.tipo !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/entregador') && session.tipo !== 'entregador') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
