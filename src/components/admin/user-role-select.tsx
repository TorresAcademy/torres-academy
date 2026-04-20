'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type UserRoleSelectProps = {
  userId: string
  currentRole: string
  disabled?: boolean
}

export default function UserRoleSelect({
  userId,
  currentRole,
  disabled = false,
}: UserRoleSelectProps) {
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState(currentRole || 'student')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleChange(newRole: string) {
    setRole(newRole)
    setLoading(true)
    setErrorMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      setErrorMessage(error.message)
      setRole(currentRole || 'student')
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div>
      <select
        value={role}
        disabled={disabled || loading}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60"
      >
        <option value="student">student</option>
        <option value="teacher">teacher</option>
        <option value="admin">admin</option>
      </select>

      {errorMessage && (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}