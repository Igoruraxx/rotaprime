import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rota Prime',
  description: 'Sistema de Gestão de Entregas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
