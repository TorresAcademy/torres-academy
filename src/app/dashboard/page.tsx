import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import LogoutButton from '@/components/logout-button'
import UserAvatar from '@/components/user-avatar'

type DashboardPageProps = {
  searchParams?: Promise<{
    notifications?: string
  }>
}

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  avatar_url: string | null
}

type Course = {
  id: number
  title: string
  slug: string
  description: string | null
  is_free: boolean | null
  is_published: boolean | null
  status: 'draft' | 'published' | 'archived' | null
  enrollment_opens_at: string | null
  enrollment_closes_at: string | null
  course_starts_at: string | null
  course_ends_at: string | null
  recommended_duration_label: string | null
}

type Module = {
  id: number
  course_id: number
  title: string
  position: number
  is_published: boolean
  release_at: string | null
  due_at: string | null
}

type Lesson = {
  id: number
  course_id: number
  title: string
  slug: string
  position: number
  is_published: boolean | null
  module_id: number | null
}

type Enrollment = {
  course_id: number
}

type ProgressRow = {
  lesson_id: number
  completed: boolean | null
}

type Certificate = {
  id: number
  course_id: number
  verification_code: string
  status: string
  issued_at: string
}

type NotificationRow = {
  id: number
  type: string
  title: string
  message: string | null
  link_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  notification_key: string | null
}

type NotificationSeedRow = {
  type: string
  title: string
  link_url: string | null
  notification_key: string | null
}

type EnrollmentWindowState = 'coming_soon' | 'open' | 'closed'
type CourseSeasonState = 'upcoming' | 'active' | 'ended'

function toValidDate(value: string | null | undefined) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date
}

function formatDate(value: string | null) {
  const date = toValidDate(value)
  if (!date) return null

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getEnrollmentWindowState(course: Course): EnrollmentWindowState {
  const now = new Date()
  const opensAt = toValidDate(course.enrollment_opens_at)
  const closesAt = toValidDate(course.enrollment_closes_at)

  if (opensAt && now < opensAt) {
    return 'coming_soon'
  }

  if (closesAt && now > closesAt) {
    return 'closed'
  }

  return 'open'
}

function getCourseSeasonState(course: Course): CourseSeasonState {
  const now = new Date()
  const startsAt = toValidDate(course.course_starts_at)
  const endsAt = toValidDate(course.course_ends_at)

  if (startsAt && now < startsAt) {
    return 'upcoming'
  }

  if (endsAt && now > endsAt) {
    return 'ended'
  }

  return 'active'
}

function getAvailabilityBadgeClass(state: EnrollmentWindowState) {
  if (state === 'coming_soon') return 'bg-amber-100 text-amber-800'
  if (state === 'closed') return 'bg-red-100 text-red-700'
  return 'bg-green-100 text-green-700'
}

function getAvailabilityLabel(state: EnrollmentWindowState) {
  if (state === 'coming_soon') return 'Coming soon'
  if (state === 'closed') return 'Enrollment closed'
  return 'Open now'
}

function getCourseSeasonBadgeClass(state: CourseSeasonState) {
  if (state === 'upcoming') return 'bg-amber-100 text-amber-800'
  if (state === 'ended') return 'bg-slate-200 text-slate-700'
  return 'bg-blue-100 text-blue-700'
}

function getCourseSeasonLabel(state: CourseSeasonState) {
  if (state === 'upcoming') return 'Starts soon'
  if (state === 'ended') return 'Season ended'
  return 'Active season'
}

function getNotificationBadgeClass(type: string) {
  if (type.includes('certificate')) return 'bg-green-100 text-green-700'

  if (
    type.includes('submission') ||
    type.includes('review') ||
    type.includes('feedback')
  ) {
    return 'bg-blue-100 text-blue-700'
  }

  if (
    type.includes('due') ||
    type.includes('overdue') ||
    type.includes('closing')
  ) {
    return 'bg-amber-100 text-amber-800'
  }

  if (type.includes('enrollment')) {
    return 'bg-indigo-100 text-indigo-700'
  }

  if (type.includes('module') || type.includes('course')) {
    return 'bg-purple-100 text-purple-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function daysUntil(value: string | null) {
  const date = toValidDate(value)
  if (!date) return null

  const diffMs = date.getTime() - Date.now()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function notificationFingerprint(row: {
  type: string
  title: string
  link_url: string | null
}) {
  return `${row.type}::${row.title}::${row.link_url ?? ''}`
}

function notificationIdentifier(row: NotificationSeedRow) {
  return row.notification_key ?? notificationFingerprint(row)
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const notificationsFilter =
    resolvedSearchParams?.notifications === 'unread' ? 'unread' : 'all'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileData as Profile | null

  const displayName =
    profile?.full_name || profile?.email || user.email || 'Student'

  const role = profile?.role || 'student'
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher' || role === 'admin'

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  const enrollments = (enrollmentsData ?? []) as Enrollment[]
  const enrolledCourseIds = enrollments.map((item) => item.course_id)

  let enrolledCourses: Course[] = []

  if (enrolledCourseIds.length > 0) {
    const { data: enrolledCoursesData } = await supabase
      .from('courses')
      .select(
        'id, title, slug, description, is_free, is_published, status, enrollment_opens_at, enrollment_closes_at, course_starts_at, course_ends_at, recommended_duration_label'
      )
      .in('id', enrolledCourseIds)
      .order('title', { ascending: true })

    enrolledCourses = (enrolledCoursesData ?? []) as Course[]
  }

  const { data: availableCoursesData } = await supabase
    .from('courses')
    .select(
      'id, title, slug, description, is_free, is_published, status, enrollment_opens_at, enrollment_closes_at, course_starts_at, course_ends_at, recommended_duration_label'
    )
    .eq('status', 'published')
    .eq('is_free', true)
    .order('title', { ascending: true })

  const availableCourses = ((availableCoursesData ?? []) as Course[]).filter(
    (course) => !enrolledCourseIds.includes(course.id)
  )

  const allVisibleCourseIds = [
    ...new Set([
      ...enrolledCourses.map((course) => course.id),
      ...availableCourses.map((course) => course.id),
    ]),
  ]

  let lessons: Lesson[] = []
  let modules: Module[] = []

  if (allVisibleCourseIds.length > 0) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, course_id, title, slug, position, is_published, module_id')
      .in('course_id', allVisibleCourseIds)
      .eq('is_published', true)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })

    lessons = (lessonsData ?? []) as Lesson[]

    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('id, course_id, title, position, is_published, release_at, due_at')
      .in('course_id', allVisibleCourseIds)
      .order('course_id', { ascending: true })
      .order('position', { ascending: true })
      .order('id', { ascending: true })

    modules = (modulesData ?? []) as Module[]
  }

  const moduleMap = new Map(modules.map((module) => [module.id, module]))
  const lessonIds = lessons.map((lesson) => lesson.id)

  let progressRows: ProgressRow[] = []

  if (lessonIds.length > 0) {
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds)

    progressRows = (progressData ?? []) as ProgressRow[]
  }

  let certificates: Certificate[] = []

  if (enrolledCourseIds.length > 0) {
    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('id, course_id, verification_code, status, issued_at')
      .eq('user_id', user.id)
      .in('course_id', enrolledCourseIds)

    certificates = (certificatesData ?? []) as Certificate[]
  }

  if (role === 'student' && (enrolledCourses.length > 0 || availableCourses.length > 0)) {
    const serviceSupabase = createServiceRoleClient()

    const seedTypes = [
      'module_unlocked',
      'module_due_soon',
      'module_overdue',
      'enrollment_opening_soon',
      'enrollment_now_open',
      'enrollment_closing_soon',
      'course_starting_soon',
    ]

    const { data: existingSeedNotificationsData } = await serviceSupabase
      .from('notifications')
      .select('type, title, link_url, notification_key')
      .eq('user_id', user.id)
      .in('type', seedTypes)
      .limit(1000)

    const existingSeedNotifications =
      (existingSeedNotificationsData ?? []) as NotificationSeedRow[]

    const existingIdentifiers = new Set(
      existingSeedNotifications.map((row) => notificationIdentifier(row))
    )

    const pendingNotifications: {
      user_id: string
      type: string
      title: string
      message: string
      link_url: string
      notification_key: string
    }[] = []

    const now = new Date()
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000

    for (const course of enrolledCourses) {
      const linkUrl = `/courses/${course.slug}`
      const courseModules = modules.filter(
        (module) => module.course_id === course.id && module.is_published
      )

      for (const module of courseModules) {
        const releaseAt = toValidDate(module.release_at)
        const dueAt = toValidDate(module.due_at)
        const dueDays = daysUntil(module.due_at)

        if (
          releaseAt &&
          now >= releaseAt &&
          now.getTime() - releaseAt.getTime() <= fourteenDaysMs
        ) {
          const notificationKey = `module_unlocked:${course.id}:${module.id}:${module.release_at ?? 'none'}`
          const row = {
            type: 'module_unlocked',
            title: `Module unlocked: ${module.title}`,
            link_url: linkUrl,
            notification_key: notificationKey,
          }

          if (!existingIdentifiers.has(notificationKey)) {
            existingIdentifiers.add(notificationKey)

            pendingNotifications.push({
              user_id: user.id,
              type: row.type,
              title: row.title,
              message: `${module.title} in ${course.title} is now open and ready to study.`,
              link_url: linkUrl,
              notification_key: notificationKey,
            })
          }
        }

        if (dueAt && dueDays !== null && dueDays >= 0 && dueDays <= 7) {
          const notificationKey = `module_due_soon:${course.id}:${module.id}:${module.due_at ?? 'none'}`
          const row = {
            type: 'module_due_soon',
            title: `Module due soon: ${module.title}`,
            link_url: linkUrl,
            notification_key: notificationKey,
          }

          if (!existingIdentifiers.has(notificationKey)) {
            existingIdentifiers.add(notificationKey)

            pendingNotifications.push({
              user_id: user.id,
              type: row.type,
              title: row.title,
              message: `${module.title} in ${course.title} is due on ${
                formatDate(module.due_at) ?? 'the due date'
              }.`,
              link_url: linkUrl,
              notification_key: notificationKey,
            })
          }
        }

        if (
          dueAt &&
          now > dueAt &&
          now.getTime() - dueAt.getTime() <= fourteenDaysMs
        ) {
          const notificationKey = `module_overdue:${course.id}:${module.id}:${module.due_at ?? 'none'}`
          const row = {
            type: 'module_overdue',
            title: `Module overdue: ${module.title}`,
            link_url: linkUrl,
            notification_key: notificationKey,
          }

          if (!existingIdentifiers.has(notificationKey)) {
            existingIdentifiers.add(notificationKey)

            pendingNotifications.push({
              user_id: user.id,
              type: row.type,
              title: row.title,
              message: `${module.title} in ${course.title} passed its due date on ${
                formatDate(module.due_at) ?? 'its due date'
              }.`,
              link_url: linkUrl,
              notification_key: notificationKey,
            })
          }
        }
      }

      const startsAt = toValidDate(course.course_starts_at)
      const startsInDays = daysUntil(course.course_starts_at)

      if (
        startsAt &&
        startsInDays !== null &&
        startsInDays >= 0 &&
        startsInDays <= 7
      ) {
        const notificationKey = `course_starting_soon:${course.id}:${course.course_starts_at ?? 'none'}`
        const row = {
          type: 'course_starting_soon',
          title: `Course starts soon: ${course.title}`,
          link_url: linkUrl,
          notification_key: notificationKey,
        }

        if (!existingIdentifiers.has(notificationKey)) {
          existingIdentifiers.add(notificationKey)

          pendingNotifications.push({
            user_id: user.id,
            type: row.type,
            title: row.title,
            message: `${course.title} starts on ${
              formatDate(course.course_starts_at) ?? 'its start date'
            }.`,
            link_url: linkUrl,
            notification_key: notificationKey,
          })
        }
      }
    }

    for (const course of availableCourses) {
      const linkUrl = `/courses/${course.slug}`
      const enrollmentState = getEnrollmentWindowState(course)
      const opensAt = toValidDate(course.enrollment_opens_at)
      const closesAt = toValidDate(course.enrollment_closes_at)
      const opensInDays = daysUntil(course.enrollment_opens_at)
      const closesInDays = daysUntil(course.enrollment_closes_at)

      if (
        opensAt &&
        now < opensAt &&
        opensInDays !== null &&
        opensInDays >= 0 &&
        opensInDays <= 7
      ) {
        const notificationKey = `enrollment_opening_soon:${course.id}:${course.enrollment_opens_at ?? 'none'}`
        const row = {
          type: 'enrollment_opening_soon',
          title: `Enrollment opens soon: ${course.title}`,
          link_url: linkUrl,
          notification_key: notificationKey,
        }

        if (!existingIdentifiers.has(notificationKey)) {
          existingIdentifiers.add(notificationKey)

          pendingNotifications.push({
            user_id: user.id,
            type: row.type,
            title: row.title,
            message: `Enrollment for ${course.title} opens on ${
              formatDate(course.enrollment_opens_at) ?? 'the opening date'
            }.`,
            link_url: linkUrl,
            notification_key: notificationKey,
          })
        }
      }

      if (
        opensAt &&
        enrollmentState === 'open' &&
        now >= opensAt &&
        now.getTime() - opensAt.getTime() <= fourteenDaysMs
      ) {
        const notificationKey = `enrollment_now_open:${course.id}:${course.enrollment_opens_at ?? 'none'}`
        const row = {
          type: 'enrollment_now_open',
          title: `Enrollment now open: ${course.title}`,
          link_url: linkUrl,
          notification_key: notificationKey,
        }

        if (!existingIdentifiers.has(notificationKey)) {
          existingIdentifiers.add(notificationKey)

          pendingNotifications.push({
            user_id: user.id,
            type: row.type,
            title: row.title,
            message: `${course.title} is now open for enrollment.`,
            link_url: linkUrl,
            notification_key: notificationKey,
          })
        }
      }

      if (
        closesAt &&
        enrollmentState === 'open' &&
        closesInDays !== null &&
        closesInDays >= 0 &&
        closesInDays <= 7
      ) {
        const notificationKey = `enrollment_closing_soon:${course.id}:${course.enrollment_closes_at ?? 'none'}`
        const row = {
          type: 'enrollment_closing_soon',
          title: `Enrollment closing soon: ${course.title}`,
          link_url: linkUrl,
          notification_key: notificationKey,
        }

        if (!existingIdentifiers.has(notificationKey)) {
          existingIdentifiers.add(notificationKey)

          pendingNotifications.push({
            user_id: user.id,
            type: row.type,
            title: row.title,
            message: `Enrollment for ${course.title} closes on ${
              formatDate(course.enrollment_closes_at) ?? 'the closing date'
            }.`,
            link_url: linkUrl,
            notification_key: notificationKey,
          })
        }
      }
    }

    if (pendingNotifications.length > 0) {
      await serviceSupabase.from('notifications').upsert(pendingNotifications, {
        onConflict: 'user_id,notification_key',
        ignoreDuplicates: true,
      })
    }
  }

  const [
    notificationsCountResult,
    unreadNotificationsCountResult,
  ] = await Promise.all([
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
  ])

  let notificationsQuery = supabase
    .from('notifications')
    .select(
      'id, type, title, message, link_url, is_read, read_at, created_at, notification_key'
    )
    .eq('user_id', user.id)

  if (notificationsFilter === 'unread') {
    notificationsQuery = notificationsQuery.eq('is_read', false)
  }

  const { data: notificationsData } = await notificationsQuery
    .order('created_at', { ascending: false })
    .limit(30)

  const notifications = (notificationsData ?? []) as NotificationRow[]
  const totalNotificationsCount = notificationsCountResult.count ?? 0
  const unreadNotificationsCount = unreadNotificationsCountResult.count ?? 0
  const hasReadNotifications =
    totalNotificationsCount > unreadNotificationsCount

  const completedLessonIds = new Set(
    progressRows.filter((row) => row.completed).map((row) => row.lesson_id)
  )

  const issuedCertificateCourseIds = new Set(
    certificates
      .filter((certificate) => certificate.status === 'issued')
      .map((certificate) => certificate.course_id)
  )

  function getCourseCertificate(courseId: number) {
    return (
      certificates.find(
        (certificate) =>
          certificate.course_id === courseId && certificate.status === 'issued'
      ) ?? null
    )
  }

  function getPublishedCourseModules(courseId: number) {
    return modules.filter(
      (module) => module.course_id === courseId && module.is_published
    )
  }

  function isLessonAccessible(lesson: Lesson) {
    if (!lesson.module_id) return true

    const module = moduleMap.get(lesson.module_id)
    if (!module) return false
    if (!module.is_published) return false

    const releaseAt = toValidDate(module.release_at)
    if (releaseAt && new Date() < releaseAt) {
      return false
    }

    return true
  }

  function getCourseLessons(courseId: number) {
    return lessons.filter((lesson) => lesson.course_id === courseId)
  }

  function getAccessibleCourseLessons(courseId: number) {
    return getCourseLessons(courseId).filter(isLessonAccessible)
  }

  function getCoursePacing(courseId: number) {
    const publishedModules = getPublishedCourseModules(courseId)

    const upcomingModules = publishedModules
      .filter((module) => {
        const releaseAt = toValidDate(module.release_at)
        return Boolean(releaseAt && new Date() < releaseAt)
      })
      .sort((a, b) => {
        const aTime = toValidDate(a.release_at)?.getTime() ?? 0
        const bTime = toValidDate(b.release_at)?.getTime() ?? 0
        return aTime - bTime
      })

    const futureDueModules = publishedModules
      .filter((module) => {
        const dueAt = toValidDate(module.due_at)
        return Boolean(dueAt && new Date() <= dueAt)
      })
      .sort((a, b) => {
        const aTime = toValidDate(a.due_at)?.getTime() ?? 0
        const bTime = toValidDate(b.due_at)?.getTime() ?? 0
        return aTime - bTime
      })

    const overdueModules = publishedModules.filter((module) => {
      const dueAt = toValidDate(module.due_at)
      return Boolean(dueAt && new Date() > dueAt)
    })

    const dueSoonModule =
      futureDueModules.find((module) => {
        const days = daysUntil(module.due_at)
        return days !== null && days >= 0 && days <= 7
      }) ?? null

    return {
      nextUpcomingModule: upcomingModules[0] ?? null,
      nextDueModule: futureDueModules[0] ?? null,
      dueSoonModule,
      overdueCount: overdueModules.length,
    }
  }

  function getCourseProgress(courseId: number) {
    const courseLessons = getCourseLessons(courseId)
    const accessibleLessons = getAccessibleCourseLessons(courseId)
    const totalLessons = courseLessons.length

    if (totalLessons === 0) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        percentage: 0,
        firstLessonSlug: null as string | null,
        nextLessonSlug: null as string | null,
        isComplete: false,
        lockedLessonCount: 0,
      }
    }

    const completedLessons = courseLessons.filter((lesson) =>
      completedLessonIds.has(lesson.id)
    ).length

    const percentage = Math.round((completedLessons / totalLessons) * 100)

    const firstLessonSlug =
      accessibleLessons[0]?.slug ?? courseLessons[0]?.slug ?? null

    const nextIncompleteAccessibleLesson =
      accessibleLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ??
      accessibleLessons[0] ??
      null

    const lockedLessonCount = courseLessons.filter(
      (lesson) => !isLessonAccessible(lesson)
    ).length

    return {
      totalLessons,
      completedLessons,
      percentage,
      firstLessonSlug,
      nextLessonSlug: nextIncompleteAccessibleLesson?.slug ?? null,
      isComplete: percentage === 100,
      lockedLessonCount,
    }
  }

  async function markNotificationRead(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/dashboard')
    }

    const notificationId = Number(formData.get('notification_id'))

    if (!notificationId || Number.isNaN(notificationId)) {
      return
    }

    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    revalidatePath('/dashboard')
  }

  async function markAllNotificationsRead() {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/dashboard')
    }

    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    revalidatePath('/dashboard')
  }

  async function dismissNotification(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/dashboard')
    }

    const notificationId = Number(formData.get('notification_id'))

    if (!notificationId || Number.isNaN(notificationId)) {
      return
    }

    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    revalidatePath('/dashboard')
  }

  async function clearReadNotifications() {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login?next=/dashboard')
    }

    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true)

    revalidatePath('/dashboard')
  }

  const totalEnrolledLessons = enrolledCourses.reduce((total, course) => {
    return total + getCourseProgress(course.id).totalLessons
  }, 0)

  const totalCompletedLessons = enrolledCourses.reduce((total, course) => {
    return total + getCourseProgress(course.id).completedLessons
  }, 0)

  const overallProgress =
    totalEnrolledLessons > 0
      ? Math.round((totalCompletedLessons / totalEnrolledLessons) * 100)
      : 0

  const completedCoursesCount = enrolledCourses.filter(
    (course) => getCourseProgress(course.id).isComplete
  ).length

  const issuedCertificatesCount = issuedCertificateCourseIds.size

  const openAvailableCoursesCount = availableCourses.filter(
    (course) => getEnrollmentWindowState(course) === 'open'
  ).length

  const coursesWithUpcomingModulesCount = enrolledCourses.filter(
    (course) => Boolean(getCoursePacing(course.id).nextUpcomingModule)
  ).length

  const coursesWithDueSoonModulesCount = enrolledCourses.filter(
    (course) => Boolean(getCoursePacing(course.id).dueSoonModule)
  ).length

  const coursesWithOverdueModulesCount = enrolledCourses.filter(
    (course) => getCoursePacing(course.id).overdueCount > 0
  ).length

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.full_name}
              email={profile?.email || user.email}
              size="md"
            />

            <div>
              <p className="text-sm font-medium text-slate-500">
                {isAdmin
                  ? 'Admin Dashboard'
                  : role === 'teacher'
                    ? 'Teacher Dashboard'
                    : 'Student Dashboard'}
              </p>

              <h1 className="text-2xl font-bold">
                Welcome back, <span className="text-blue-600">{displayName}</span>
              </h1>

              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                {role}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="#notifications"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              Notifications
              {unreadNotificationsCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Admin Panel
              </Link>
            )}

            {isTeacher && (
              <Link
                href="/teacher"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Teacher Hub
              </Link>
            )}

            <Link
              href="/dashboard/progress"
              className="rounded-xl border border-purple-300 bg-purple-50 px-5 py-3 font-semibold text-purple-700 transition hover:bg-purple-100"
            >
              My Progress
            </Link>

            <Link
              href="/certificates"
              className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Certificates
            </Link>

            <Link
              href="/profile"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
            >
              My Profile
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
              Torres Academy
            </p>

            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
              Your learning space is ready.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-50">
              Enroll in free courses, continue your lessons, complete quizzes,
              save notes, request feedback, claim certificates, and track your
              progress in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#available-courses"
                className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Explore courses
              </Link>

              <Link
                href="/dashboard/progress"
                className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                View progress report
              </Link>

              <Link
                href="/certificates"
                className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                My certificates
              </Link>

              <Link
                href="/profile"
                className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Edit profile
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Open Admin Panel
                </Link>
              )}

              {isTeacher && (
                <Link
                  href="/teacher"
                  className="rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Open Teacher Hub
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-sm backdrop-blur">
            <p className="font-bold text-blue-100">Your progress</p>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-blue-50">
                <span>Completed lessons</span>
                <span>
                  {totalCompletedLessons}/{totalEnrolledLessons}
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-blue-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{enrolledCourses.length}</p>
                <p className="mt-2 text-sm text-blue-50">My courses</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{completedCoursesCount}</p>
                <p className="mt-2 text-sm text-blue-50">Completed courses</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{issuedCertificatesCount}</p>
                <p className="mt-2 text-sm text-blue-50">Certificates</p>
              </div>

              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-3xl font-bold">{openAvailableCoursesCount}</p>
                <p className="mt-2 text-sm text-blue-50">Open now</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
                Upcoming modules: {coursesWithUpcomingModulesCount}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
                Due soon: {coursesWithDueSoonModulesCount}
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
                Overdue: {coursesWithOverdueModulesCount}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12">
        <section id="notifications">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Notifications
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Alerts and updates
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {notificationsFilter === 'unread'
                  ? `Showing unread only · ${unreadNotificationsCount} unread`
                  : `Showing all notifications · ${totalNotificationsCount} total`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard#notifications"
                className={`rounded-xl px-4 py-2 font-semibold transition ${
                  notificationsFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-900 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                All ({totalNotificationsCount})
              </Link>

              <Link
                href="/dashboard?notifications=unread#notifications"
                className={`rounded-xl px-4 py-2 font-semibold transition ${
                  notificationsFilter === 'unread'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-900 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                Unread only ({unreadNotificationsCount})
              </Link>

              {unreadNotificationsCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Mark all as read
                  </button>
                </form>
              )}

              {hasReadNotifications && (
                <form action={clearReadNotifications}>
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Clear read
                  </button>
                </form>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                {notificationsFilter === 'unread'
                  ? "You're all caught up"
                  : 'No notifications yet'}
              </h3>

              <p className="mt-2 text-slate-600">
                {notificationsFilter === 'unread'
                  ? 'There are no unread notifications right now.'
                  : 'When the system sends updates about modules, enrollments, submissions, reviews, or certificates, they will appear here.'}
              </p>

              {notificationsFilter === 'unread' && totalNotificationsCount > 0 && (
                <div className="mt-4">
                  <Link
                    href="/dashboard#notifications"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    Show all notifications
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-3xl border p-6 shadow-sm ${
                    notification.is_read
                      ? 'border-slate-200 bg-white'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getNotificationBadgeClass(
                          notification.type
                        )}`}
                      >
                        {notification.type.replaceAll('_', ' ')}
                      </span>

                      {!notification.is_read && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900">
                    {notification.title}
                  </h3>

                  {notification.message && (
                    <p className="mt-3 leading-7 text-slate-600">
                      {notification.message}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {notification.link_url && (
                      <Link
                        href={notification.link_url}
                        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Open
                      </Link>
                    )}

                    {!notification.is_read && (
                      <form action={markNotificationRead}>
                        <input
                          type="hidden"
                          name="notification_id"
                          value={notification.id}
                        />
                        <button
                          type="submit"
                          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                        >
                          Mark as read
                        </button>
                      </form>
                    )}

                    <form action={dismissNotification}>
                      <input
                        type="hidden"
                        name="notification_id"
                        value={notification.id}
                      />
                      <button
                        type="submit"
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-red-300 hover:text-red-600"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                My Courses
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Continue learning
              </h2>
            </div>

            <p className="text-sm text-slate-600">
              Courses you are already enrolled in
            </p>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">
                No enrolled courses yet
              </h3>

              <p className="mt-2 text-slate-600">
                Choose a free course below to start learning.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {enrolledCourses.map((course) => {
                const progress = getCourseProgress(course.id)
                const certificate = getCourseCertificate(course.id)
                const seasonState = getCourseSeasonState(course)
                const seasonLabel = getCourseSeasonLabel(seasonState)
                const seasonClass = getCourseSeasonBadgeClass(seasonState)
                const pacing = getCoursePacing(course.id)

                return (
                  <article
                    key={course.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {course.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {course.description || 'No description yet.'}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${seasonClass}`}
                          >
                            {seasonLabel}
                          </span>

                          {course.recommended_duration_label && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {course.recommended_duration_label}
                            </span>
                          )}

                          {course.course_starts_at && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Starts: {formatDate(course.course_starts_at)}
                            </span>
                          )}

                          {course.course_ends_at && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Ends: {formatDate(course.course_ends_at)}
                            </span>
                          )}

                          {progress.lockedLessonCount > 0 && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Locked lessons: {progress.lockedLessonCount}
                            </span>
                          )}

                          {pacing.overdueCount > 0 && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Overdue modules: {pacing.overdueCount}
                            </span>
                          )}

                          {pacing.dueSoonModule && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                              Due soon: {pacing.dueSoonModule.title}
                            </span>
                          )}

                          {!pacing.dueSoonModule && pacing.nextUpcomingModule && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              Opens soon: {pacing.nextUpcomingModule.title}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          progress.isComplete
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {progress.isComplete
                          ? 'Completed'
                          : `${progress.percentage}%`}
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {progress.completedLessons} of {progress.totalLessons}{' '}
                          lessons completed
                        </span>
                        <span>{progress.percentage}%</span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {pacing.overdueCount > 0 && (
                      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                        <h4 className="font-bold text-red-700">
                          Module deadlines passed
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          You have {pacing.overdueCount} module
                          {pacing.overdueCount === 1 ? '' : 's'} with a passed due
                          date. Open the course to continue working through them.
                        </p>
                      </div>
                    )}

                    {!pacing.overdueCount && pacing.dueSoonModule && (
                      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <h4 className="font-bold text-amber-800">
                          Module due soon
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          <span className="font-semibold">
                            {pacing.dueSoonModule.title}
                          </span>{' '}
                          is due on {formatDate(pacing.dueSoonModule.due_at)}.
                        </p>
                      </div>
                    )}

                    {!pacing.overdueCount &&
                      !pacing.dueSoonModule &&
                      pacing.nextUpcomingModule && (
                        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                          <h4 className="font-bold text-blue-700">
                            Next module opens soon
                          </h4>

                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            <span className="font-semibold">
                              {pacing.nextUpcomingModule.title}
                            </span>{' '}
                            opens on {formatDate(pacing.nextUpcomingModule.release_at)}.
                          </p>
                        </div>
                      )}

                    {progress.isComplete && (
                      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                        <h4 className="font-bold text-green-800">
                          Course completed
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          You finished all published lessons. Go to the certificate
                          center to claim or download your certificate.
                        </p>

                        {certificate && (
                          <p className="mt-2 text-xs font-semibold text-green-700">
                            Certificate issued · Code: {certificate.verification_code}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      {progress.nextLessonSlug && !progress.isComplete ? (
                        <Link
                          href={`/lessons/${progress.nextLessonSlug}`}
                          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          Continue course
                        </Link>
                      ) : (
                        <Link
                          href={`/courses/${course.slug}`}
                          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                          View course
                        </Link>
                      )}

                      <Link
                        href={`/courses/${course.slug}`}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        Course overview
                      </Link>

                      <Link
                        href="/dashboard/progress"
                        className="rounded-xl border border-purple-300 bg-purple-50 px-5 py-3 font-semibold text-purple-700 transition hover:bg-purple-100"
                      >
                        Progress report
                      </Link>

                      {progress.isComplete && (
                        <Link
                          href={
                            certificate
                              ? `/certificates/${certificate.id}`
                              : '/certificates'
                          }
                          className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                        >
                          {certificate
                            ? 'Download certificate'
                            : 'Claim certificate'}
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section id="available-courses">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Available Courses
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Free courses you can join
              </h2>
            </div>
          </div>

          {availableCourses.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-slate-700">
                No new free courses are available right now.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {availableCourses.map((course) => {
                const courseLessons = getCourseLessons(course.id)
                const enrollmentState = getEnrollmentWindowState(course)
                const availabilityLabel = getAvailabilityLabel(enrollmentState)
                const availabilityClass = getAvailabilityBadgeClass(enrollmentState)
                const seasonState = getCourseSeasonState(course)
                const seasonLabel = getCourseSeasonLabel(seasonState)
                const seasonClass = getCourseSeasonBadgeClass(seasonState)
                const pacing = getCoursePacing(course.id)

                return (
                  <article
                    key={course.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {course.title}
                        </h3>

                        <p className="mt-3 leading-7 text-slate-600">
                          {course.description || 'No description yet.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                          Free
                        </span>

                        <span
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${availabilityClass}`}
                        >
                          {availabilityLabel}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${seasonClass}`}
                      >
                        {seasonLabel}
                      </span>

                      {course.recommended_duration_label && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {course.recommended_duration_label}
                        </span>
                      )}

                      {course.enrollment_opens_at && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Opens: {formatDate(course.enrollment_opens_at)}
                        </span>
                      )}

                      {course.enrollment_closes_at && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          Closes: {formatDate(course.enrollment_closes_at)}
                        </span>
                      )}

                      {pacing.nextUpcomingModule && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          First upcoming module: {pacing.nextUpcomingModule.title}
                        </span>
                      )}
                    </div>

                    <p className="mt-5 text-sm text-slate-600">
                      {courseLessons.length} published lesson
                      {courseLessons.length === 1 ? '' : 's'}
                    </p>

                    {enrollmentState === 'coming_soon' && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                        Enrollment opens on {formatDate(course.enrollment_opens_at)}.
                      </div>
                    )}

                    {enrollmentState === 'closed' && (
                      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-slate-700">
                        Enrollment closed on {formatDate(course.enrollment_closes_at)}.
                      </div>
                    )}

                    {enrollmentState !== 'closed' && pacing.nextUpcomingModule && (
                      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                        Next module opens on{' '}
                        {formatDate(pacing.nextUpcomingModule.release_at)}.
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                      >
                        {enrollmentState === 'open' ? 'View course' : 'View details'}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}