'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, FolderTree } from 'lucide-react'

type Course = {
  id: number
  title: string
}

type Module = {
  id: number
  course_id: number
  title: string
  position: number
  is_published: boolean
}

type CourseModuleSelectProps = {
  courses: Course[]
  modules: Module[]
  defaultCourseId?: number | null
  defaultModuleId?: number | null
  courseName?: string
  moduleName?: string
}

export default function CourseModuleSelect({
  courses,
  modules,
  defaultCourseId = null,
  defaultModuleId = null,
  courseName = 'course_id',
  moduleName = 'module_id',
}: CourseModuleSelectProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(
    defaultCourseId ? String(defaultCourseId) : ''
  )

  const [selectedModuleId, setSelectedModuleId] = useState(
    defaultModuleId ? String(defaultModuleId) : ''
  )

  const filteredModules = useMemo(() => {
    if (!selectedCourseId) return []

    return modules.filter(
      (module) => String(module.course_id) === selectedCourseId
    )
  }, [modules, selectedCourseId])

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedModuleId('')
      return
    }

    const stillValid = filteredModules.some(
      (module) => String(module.id) === selectedModuleId
    )

    if (!stillValid) {
      setSelectedModuleId('')
    }
  }, [selectedCourseId, selectedModuleId, filteredModules])

  return (
    <div className="grid gap-5">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
            <BookOpen className="h-4 w-4" />
          </div>

          <div>
            <p className="font-semibold text-slate-900">Course</p>
            <p className="text-sm text-slate-500">
              Choose the course this lesson belongs to.
            </p>
          </div>
        </div>

        <select
          name={courseName}
          required
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500"
        >
          <option value="">Choose course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300">
            <FolderTree className="h-4 w-4" />
          </div>

          <div>
            <p className="font-semibold text-slate-900">Module</p>
            <p className="text-sm text-slate-500">
              The module list updates automatically from the selected course.
            </p>
          </div>
        </div>

        <select
          name={moduleName}
          value={selectedModuleId}
          onChange={(e) => setSelectedModuleId(e.target.value)}
          disabled={!selectedCourseId}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="">
            {!selectedCourseId
              ? 'Choose course first'
              : filteredModules.length === 0
                ? 'No modules for this course yet'
                : 'No module assigned'}
          </option>

          {filteredModules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.position}. {module.title}
              {module.is_published ? '' : ' (draft)'}
            </option>
          ))}
        </select>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {selectedCourseId ? 'Course selected' : 'No course selected'}
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {filteredModules.length} module{filteredModules.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  )
}
