'use client'

import { useFeature } from '@/lib/features'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  feature: string
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Envolve qualquer seção/página que deve sumir completamente
 * quando a feature está desligada.
 *
 * - null  → carregando (nada visível)
 * - false → funcionalidade desativada + redirect opcional
 * - true  → renderiza children
 */
export default function FeatureGuard({ feature, children, redirectTo }: Props) {
  const ativo = useFeature(feature)
  const router = useRouter()

  useEffect(() => {
    if (ativo === false && redirectTo) {
      router.replace(redirectTo)
    }
  }, [ativo, redirectTo, router])

  // Carregando — não mostra nada ainda
  if (ativo === null) return null

  // Desativado — completamente invisível
  if (ativo === false) return null

  // Ativo — renderiza conteúdo
  return <>{children}</>
}
