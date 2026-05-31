import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { uploadFoto } from '@/lib/storage'

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { foto, pasta } = await request.json()

    if (!foto) {
      return NextResponse.json({ erro: 'Foto é obrigatória' }, { status: 400 })
    }

    const url = await uploadFoto(foto, pasta || 'entregas')

    if (!url) {
      return NextResponse.json({ erro: 'Erro ao fazer upload' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch {
    return NextResponse.json({ erro: 'Erro ao processar upload' }, { status: 500 })
  }
}
