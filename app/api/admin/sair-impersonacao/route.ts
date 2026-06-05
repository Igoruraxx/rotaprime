import { NextRequest, NextResponse } from 'next/server'
import { criarToken, verificarToken } from '@/lib/auth'

const COOKIE_NAME = 'session'
const ADMIN_COOKIE = 'admin_session'

export async function POST(request: NextRequest) {
  try {
    // Lê o token admin do cookie admin_session
    const adminToken = request.cookies.get(ADMIN_COOKIE)?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    const adminSession = await verificarToken(adminToken)
    if (!adminSession || adminSession.tipo !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Cria um novo token admin com os dados originais
    const novoToken = await criarToken(adminSession)

    // Constrói os cookies manualmente
    const cookieSession = `${COOKIE_NAME}=${novoToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7200`
    const cookieAdmin = `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`

    // Retorna redirect com múltiplos Set-Cookie headers
    return new Response(null, {
      status: 302,
      headers: [
        ['Location', '/admin'],
        ['Set-Cookie', cookieSession],
        ['Set-Cookie', cookieAdmin],
      ] as [string, string][],
    })
  } catch (err) {
    console.error('Erro ao sair da impersonação:', err)
    return NextResponse.redirect(new URL('/admin', request.url))
  }
}
