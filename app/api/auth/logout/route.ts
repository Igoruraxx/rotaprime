import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(new URL('/login', origin))
  await clearSession(response)
  return response
}
