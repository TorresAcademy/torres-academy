"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StudentSubmission = {
  id: number;
  task_id: number;
  submission_type?: string | null;
  external_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_mime_type?: string | null;
  student_comment?: string | null;
  status?: string | null;
  teacher_feedback?: string | null;
  teacher_score?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SubmissionTask = {
  id: number;
  title?: string | null;
  instructions?: string | null;
  accept_file?: boolean | null;
  accept_link?: boolean | null;
  accepted_file_types?: string[] | null;
  accepted_link_types?: string[] | null;
  is_required_for_completion?: boolean | null;
  is_required_for_certificate?: boolean | null;
  latest_submission?: StudentSubmission | null;
  submissions?: StudentSubmission[];
};

type Props = {
  lessonId: string | number;
};

const DEFAULT_FILE_TYPES = ["pdf", "png", "jpg", "jpeg"];

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizeAcceptedTypes(task: SubmissionTask) {
  const raw = task.accepted_file_types ?? DEFAULT_FILE_TYPES;

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).replace(".", "").trim().toLowerCase());
  }

  return DEFAULT_FILE_TYPES;
}

function statusClasses(status?: string | null) {
  const value = (status ?? "").toLowerCase();

  if (value === "accepted") {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (value === "reviewed") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (value === "needs_revision") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  if (value === "rejected") {
    return "bg-red-100 text-red-700 border-red-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function prettyStatus(status?: string | null) {
  if (!status) return "submitted";
  return status.replaceAll("_", " ");
}

export function LessonSubmissionPanel({ lessonId }: Props) {
  const [tasks, setTasks] = useState<SubmissionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>(
    {}
  );
  const [linkValues, setLinkValues] = useState<Record<number, string>>({});
  const [commentValues, setCommentValues] = useState<Record<number, string>>({});

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/lesson-submissions?lessonId=${encodeURIComponent(String(lessonId))}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load submission tasks");
      }

      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const hasTasks = useMemo(() => tasks.length > 0, [tasks]);

  async function submitFile(taskId: number) {
    const file = selectedFiles[taskId];

    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    try {
      setSubmittingTaskId(taskId);
      setError(null);

      const formData = new FormData();
      formData.append("taskId", String(taskId));
      formData.append("submissionType", "file");
      formData.append("file", file);

      if (commentValues[taskId]?.trim()) {
        formData.append("studentComment", commentValues[taskId].trim());
      }

      const response = await fetch("/api/lesson-submissions", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit file");
      }

      setSelectedFiles((prev) => ({ ...prev, [taskId]: null }));

      const input = document.getElementById(
        `submission-file-${taskId}`
      ) as HTMLInputElement | null;

      if (input) input.value = "";

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit file");
    } finally {
      setSubmittingTaskId(null);
    }
  }

  async function submitLink(taskId: number) {
    const externalUrl = linkValues[taskId]?.trim();

    if (!externalUrl) {
      setError("Please paste a link first.");
      return;
    }

    try {
      setSubmittingTaskId(taskId);
      setError(null);

      const formData = new FormData();
      formData.append("taskId", String(taskId));
      formData.append("submissionType", "link");
      formData.append("externalUrl", externalUrl);

      if (commentValues[taskId]?.trim()) {
        formData.append("studentComment", commentValues[taskId].trim());
      }

      const response = await fetch("/api/lesson-submissions", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit link");
      }

      setLinkValues((prev) => ({ ...prev, [taskId]: "" }));

      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit link");
    } finally {
      setSubmittingTaskId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
        </div>
      </section>
    );
  }

  if (!hasTasks) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Lesson submissions
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Submit your work as a file or secure link, depending on what your teacher requested.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        {tasks.map((task) => {
          const latest = task.latest_submission;
          const fileTypes = normalizeAcceptedTypes(task);

          return (
            <div
              key={task.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {task.title || "Submission task"}
                  </h3>

                  {task.is_required_for_completion ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Required for completion
                    </span>
                  ) : null}

                  {task.is_required_for_certificate ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                      Required for certificate
                    </span>
                  ) : null}
                </div>

                {task.instructions ? (
                  <p className="mt-2 text-sm text-slate-700">{task.instructions}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  {task.accept_file ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                      Files: {fileTypes.join(", ").toUpperCase()}
                    </span>
                  ) : null}

                  {task.accept_link ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                      Links: {(task.accepted_link_types ?? []).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>

              {latest ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      Your current submission
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                        latest.status
                      )}`}
                    >
                      {prettyStatus(latest.status)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    {latest.file_url && latest.file_name ? (
                      <p>
                        File:{" "}
                        <a
                          href={latest.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {latest.file_name}
                        </a>
                      </p>
                    ) : null}

                    {latest.external_url ? (
                      <p>
                        Link:{" "}
                        <a
                          href={latest.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          Open submitted link
                        </a>
                      </p>
                    ) : null}

                    {latest.student_comment ? (
                      <p>
                        Comment:{" "}
                        <span className="text-slate-600">{latest.student_comment}</span>
                      </p>
                    ) : null}

                    {latest.teacher_feedback ? (
                      <p>
                        Teacher feedback:{" "}
                        <span className="text-slate-600">{latest.teacher_feedback}</span>
                      </p>
                    ) : null}

                    {typeof latest.teacher_score === "number" ? (
                      <p>
                        Score:{" "}
                        <span className="font-medium text-slate-900">
                          {latest.teacher_score}
                        </span>
                      </p>
                    ) : null}

                    <p className="text-xs text-slate-500">
                      Last updated: {formatDate(latest.updated_at || latest.created_at)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                <label
                  htmlFor={`submission-comment-${task.id}`}
                  className="mb-2 block text-sm font-medium text-slate-800"
                >
                  Comment for your teacher (optional)
                </label>

                <textarea
                  id={`submission-comment-${task.id}`}
                  value={commentValues[task.id] ?? ""}
                  onChange={(event) =>
                    setCommentValues((prev) => ({
                      ...prev,
                      [task.id]: event.target.value,
                    }))
                  }
                  placeholder="Add a short explanation about your work..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                />

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {task.accept_file ? (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Upload a file
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Accepted: {fileTypes.join(", ").toUpperCase()}
                      </p>

                      <input
                        id={`submission-file-${task.id}`}
                        type="file"
                        accept={fileTypes.map((type) => `.${type}`).join(",")}
                        onChange={(event) =>
                          setSelectedFiles((prev) => ({
                            ...prev,
                            [task.id]: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                      />

                      <button
                        type="button"
                        onClick={() => void submitFile(task.id)}
                        disabled={!selectedFiles[task.id] || submittingTaskId === task.id}
                        className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submittingTaskId === task.id ? "Submitting..." : "Submit file"}
                      </button>
                    </div>
                  ) : null}

                  {task.accept_link ? (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Submit a secure link
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Use https:// links only
                      </p>

                      <input
                        type="url"
                        value={linkValues[task.id] ?? ""}
                        onChange={(event) =>
                          setLinkValues((prev) => ({
                            ...prev,
                            [task.id]: event.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                      />

                      <button
                        type="button"
                        onClick={() => void submitLink(task.id)}
                        disabled={!linkValues[task.id]?.trim() || submittingTaskId === task.id}
                        className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submittingTaskId === task.id ? "Submitting..." : "Submit link"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}