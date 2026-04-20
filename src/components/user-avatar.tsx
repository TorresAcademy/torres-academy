type UserAvatarProps = {
  src?: string | null
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || 'User'

  const parts = source
    .replace(/@.*/, '')
    .replace(/[._-]/g, ' ')
    .split(' ')
    .filter(Boolean)

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'U'
}

export default function UserAvatar({
  src,
  name,
  email,
  size = 'md',
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-9 w-9 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-20 w-20 text-2xl',
    xl: 'h-28 w-28 text-3xl',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name || email || 'User avatar'}
        className={`${sizeClasses[size]} rounded-full border border-slate-200 object-cover shadow-sm`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full border border-blue-200 bg-blue-100 font-bold text-blue-700 shadow-sm`}
    >
      {getInitials(name, email)}
    </div>
  )
}