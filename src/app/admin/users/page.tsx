import { requireAdmin } from '@/lib/admin/require-admin'
import UserRoleSelect from '@/components/admin/user-role-select'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  created_at: string | null
}

export default async function AdminUsersPage() {
  const { supabase, user } = await requireAdmin()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: false })

  const users = (data ?? []) as Profile[]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Users
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Manage users
        </h2>
        <p className="mt-2 text-slate-600">
          View users and assign roles: student, teacher, or admin.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {users.length === 0 ? (
          <p className="text-slate-700">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Joined</th>
                </tr>
              </thead>

              <tbody>
                {users.map((profile) => {
                  const isCurrentUser = profile.id === user.id

                  return (
                    <tr key={profile.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 text-slate-900">
                        {profile.full_name || '—'}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {profile.email || '—'}
                      </td>

                      <td className="py-3 pr-4">
                        <UserRoleSelect
                          userId={profile.id}
                          currentRole={profile.role || 'student'}
                          disabled={isCurrentUser}
                        />

                        {isCurrentUser && (
                          <p className="mt-1 text-xs text-slate-500">
                            You cannot change your own role here.
                          </p>
                        )}
                      </td>

                      <td className="py-3 pr-4 text-slate-700">
                        {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}