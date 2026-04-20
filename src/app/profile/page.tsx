import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '@/components/profile-form'
import UserAvatar from '@/components/user-avatar'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/profile')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, bio, github_username, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const email = profile?.email || user.email || ''
  const name = profile?.full_name || ''

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile?.avatar_url}
              name={name}
              email={email}
              size="lg"
            />

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Account
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                My Profile
              </h1>
              <p className="mt-2 text-slate-600">
                Manage your personal information and learning profile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
              >
                Admin Panel
              </Link>
            )}

            {(profile?.role === 'teacher' || profile?.role === 'admin') && (
              <Link
                href="/teacher"
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Hub
              </Link>
            )}

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
          <ProfileForm
            userId={user.id}
            email={email}
            initialValues={{
              full_name: profile?.full_name ?? '',
              bio: profile?.bio ?? '',
              github_username: profile?.github_username ?? '',
              avatar_url: profile?.avatar_url ?? '',
            }}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <UserAvatar
                src={profile?.avatar_url}
                name={name}
                email={email}
                size="xl"
              />

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {profile?.full_name || 'Profile Summary'}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {profile?.role || 'student'}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">
                  {profile?.full_name || 'Not set yet'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">
                  {email || 'No email'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">GitHub</p>
                <p className="font-medium text-slate-900">
                  {profile?.github_username || 'Not set yet'}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Bio</p>
                <p className="text-slate-700">
                  {profile?.bio || 'No bio added yet.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}