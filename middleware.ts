import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const rotasPublicas = ['/login', '/api/auth/login', '/api/auth/check', '/api/auth/token']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas não precisam de autenticação
  if (rotasPublicas.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Rotas de API protegidas
  if (pathname.startsWith('/api/')) {
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Rotas admin e entregador
  const session = await getSessionFromRequest(request)
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
