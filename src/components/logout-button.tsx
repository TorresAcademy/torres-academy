// src/components/logout-button.tsx
'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </button>
  )
}