// Sanitização de textos (remove HTML/script injection)
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

export function sanitizeFloat(value: string): number | null {
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function sanitizeInt(value: string): number | null {
  const num = parseInt(value.replace(/\D/g, ''), 10)
  return isNaN(num) ? null : num
}

export function sanitizeGPS(value: string): string | null {
  const cleaned = value.replace(/[^0-9.\-,]/g, '')
  const parts = cleaned.split(',')
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

export function validateCodigoPacote(codigo: string): boolean {
  return /^PACK-\d{8}-\d{5}$/.test(codigo)
}

export function formatBR(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('pt-BR')
}

export function formatBRDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

export function gerarCodigoPacote(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')
  return `PACK-${y}${m}${d}-${rand}`
}

export function statusIcon(status: string): string {
  const icons: Record<string, string> = {
    'Recebido pela Central': '📦',
    'Aguardando Retirada': '⏳',
    'Retirado pelo Entregador': '✋',
    'Em Rota': '🚚',
    'Entregue': '✅',
    'Retornado a Central': '🔄',
    'Validado pelo Admin': '👍'
  }
  return icons[status] || '📦'
}

export function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    'Recebido pela Central': 'bg-gray-100 text-gray-700',
    'Aguardando Retirada': 'bg-yellow-100 text-yellow-700',
    'Retirado pelo Entregador': 'bg-blue-100 text-blue-700',
    'Em Rota': 'bg-indigo-100 text-indigo-700',
    'Entregue': 'bg-green-100 text-green-700',
    'Retornado a Central': 'bg-red-100 text-red-700',
    'Validado pelo Admin': 'bg-emerald-100 text-emerald-700'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function gpsLink(gps: string): string {
  if (!gps) return '#'
  return `https://www.google.com/maps?q=${gps}`
}
