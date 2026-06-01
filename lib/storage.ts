import sharp from 'sharp'
import { supabase } from './db'

const MAX_KB = 200

export async function uploadFoto(
  base64: string,
  pasta: string = 'entregas'
): Promise<string | null> {
  try {
    // Extrair base64 do data URL
    const matches = base64.match(/^data:image\/\w+;base64,(.+)$/)
    if (!matches) return null

    const buffer = Buffer.from(matches[1], 'base64')

    // Comprimir para WebP no máximo 200 KB
    const comprimido = await comprimirImagem(buffer)
    if (!comprimido) return null

    const filename = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`

    const { data, error } = await supabase.storage
      .from('fotos')
      .upload(filename, comprimido, {
        contentType: 'image/webp',
        upsert: false
      })

    if (error) {
      console.error('Erro upload:', error)
      return null
    }

    // URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('fotos')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (err) {
    console.error('Erro upload:', err)
    return null
  }
}

async function comprimirImagem(buffer: Buffer): Promise<Buffer | null> {
  try {
    let qualidade = 85
    let resultado = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: qualidade })
      .toBuffer()

    // Reduzir qualidade progressivamente até caber em 200KB
    while (resultado.length > MAX_KB * 1024 && qualidade > 15) {
      qualidade -= 10
      resultado = await sharp(buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: qualidade })
        .toBuffer()
    }

    return resultado
  } catch (err) {
    console.error('Erro compressão:', err)
    return null
  }
}
