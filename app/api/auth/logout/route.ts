import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  await clearSession(response)
  return response
}
