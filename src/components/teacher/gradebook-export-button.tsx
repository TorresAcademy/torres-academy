'use client'

type ExportRow = {
  studentName: string
  studentEmail: string
  courseTitle: string
  progressPercentage: number
  completedLessons: number
  totalLessons: number
  quizAverage: number | null
  attemptedQuizzes: number
  totalQuizzes: number
  failedAttempts: number
  missingReflections: number
  pendingFeedback: number
  totalSubmissionTasks: number
  requiredSubmissionTasks: number
  submittedTasks: number
  reviewedSubmissionTasks: number
  pendingSubmissionReviews: number
  needsRevisionSubmissions: number
  acceptedSubmissions: number
  missingRequiredSubmissions: number
  riskLevel: string
  riskScore: number
  riskReasons: string
  certificateStatus: string
  certificateCode: string
  certificateIssuedAt: string
}

type GradebookExportButtonProps = {
  rows: ExportRow[]
}

function escapeCsv(value: string | number | null) {
  const text = value === null ? '' : String(value)
  const escaped = text.replace(/"/g, '""')

  if (
    escaped.includes(',') ||
    escaped.includes('"') ||
    escaped.includes('\n')
  ) {
    return `"${escaped}"`
  }

  return escaped
}

export default function GradebookExportButton({
  rows,
}: GradebookExportButtonProps) {
  function exportCsv() {
    const headers = [
      'Student Name',
      'Student Email',
      'Course',
      'Progress %',
      'Completed Lessons',
      'Total Lessons',
      'Quiz Average %',
      'Attempted Quizzes',
      'Total Quizzes',
      'Failed Attempts',
      'Missing Reflections',
      'Pending Feedback',
      'Total Submission Tasks',
      'Required Submission Tasks',
      'Submitted Tasks',
      'Reviewed Submission Tasks',
      'Pending Submission Reviews',
      'Needs Revision Submissions',
      'Accepted Submissions',
      'Missing Required Submissions',
      'Risk Level',
      'Risk Score',
      'Risk Reasons',
      'Certificate Status',
      'Certificate Code',
      'Certificate Issued At',
    ]

    const csvRows = rows.map((row) => [
      row.studentName,
      row.studentEmail,
      row.courseTitle,
      row.progressPercentage,
      row.completedLessons,
      row.totalLessons,
      row.quizAverage,
      row.attemptedQuizzes,
      row.totalQuizzes,
      row.failedAttempts,
      row.missingReflections,
      row.pendingFeedback,
      row.totalSubmissionTasks,
      row.requiredSubmissionTasks,
      row.submittedTasks,
      row.reviewedSubmissionTasks,
      row.pendingSubmissionReviews,
      row.needsRevisionSubmissions,
      row.acceptedSubmissions,
      row.missingRequiredSubmissions,
      row.riskLevel,
      row.riskScore,
      row.riskReasons,
      row.certificateStatus,
      row.certificateCode,
      row.certificateIssuedAt,
    ])

    const csv = [headers, ...csvRows]
      .map((line) => line.map(escapeCsv).join(','))
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `torres-academy-gradebook-${date}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      disabled={rows.length === 0}
      className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      Export CSV
    </button>
  )
}