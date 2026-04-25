'use client'

import { useEffect, useMemo, useState } from 'react'

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
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Course
        </label>

        <select
          name={courseName}
          required
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        >
          <option value="">Choose course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Module
        </label>

        <select
          name={moduleName}
          value={selectedModuleId}
          onChange={(e) => setSelectedModuleId(e.target.value)}
          disabled={!selectedCourseId}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
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

        <p className="mt-2 text-xs text-slate-500">
          The module list changes automatically based on the selected course.
        </p>
      </div>
    </div>
  )
}