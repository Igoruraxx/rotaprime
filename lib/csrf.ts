import { SignJWT, jwtVerify } from 'jose'

const CSRF_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rota-prime-csrf-secret-2026'
)

export async function gerarTokenCSRF(entregadorId: number): Promise<string> {
  const token = await new SignJWT({
    entregador_id: entregadorId,
    ts: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(CSRF_SECRET)
  return token
}

export async function validarTokenCSRF(
  token: string,
  entregadorId: number
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, CSRF_SECRET)
    return (payload as { entregador_id: number }).entregador_id === entregadorId
  } catch {
    return false
  }
}
