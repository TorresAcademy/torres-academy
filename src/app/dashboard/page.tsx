'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? null)
      setLoading(false)
    }

    loadUser()
  }, [])

  if (loading) {
    return <main className="p-6">Loading...</main>
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      {email ? (
        <p>Welcome, {email}</p>
      ) : (
        <p>You are not logged in yet.</p>
      )}
    </main>
  )
}