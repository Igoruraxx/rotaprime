import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()

  if (session?.tipo === 'admin') redirect('/admin')
  if (session?.tipo === 'entregador') redirect('/entregador')

  redirect('/login')
}
