import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rota-prime-secret-key-2026'
)

const COOKIE_NAME = 'session'
const SESSION_DURATION = 120 * 60 // 120 minutos

export type UserSession = {
  tipo: 'admin' | 'entregador'
  id: number
  nome: string
  entregador_id?: number
}

export async function criarToken(session: UserSession): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verificarToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserSession
  } catch {
    return null
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verificarToken(token)
}

export async function setSession(response: Response, session: UserSession) {
  const token = await criarToken(session)
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION}`
  )
}

export async function clearSession(response: Response) {
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  )
}

export function getSessionFromRequest(request: NextRequest): Promise<UserSession | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return Promise.resolve(null)
  return verificarToken(token)
}
