import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>{children}</body>
    </html>
  )
}
