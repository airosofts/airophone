// src/app/(auth)/layout.js
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function AuthLayout({ children }) {
  const supabase = createSupabaseServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is already logged in, redirect to inbox
  if (session) {
    redirect('/inbox')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}