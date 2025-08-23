// src/app/(dashboard)/layout.js
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }) {
  const supabase = createSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="h-screen overflow-hidden">
      {children}
    </div>
  )
}