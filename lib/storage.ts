import { supabase } from './db'

export async function uploadFoto(
  base64: string,
  pasta: string = 'entregas'
): Promise<string | null> {
  try {
    // Extrair base64 e tipo do data URL
    const matches = base64.match(/^data:(image\/(\w+));base64,(.+)$/)
    if (!matches) return null

    const extension = matches[2] === 'jpeg' ? 'jpg' : matches[2]
    const buffer = Buffer.from(matches[3], 'base64')

    const filename = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

    const { data, error } = await supabase.storage
      .from('fotos')
      .upload(filename, buffer, {
        contentType: `image/${extension}`,
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
