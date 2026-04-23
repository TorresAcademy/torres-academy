import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "student-submissions";
const DEFAULT_FILE_TYPES = ["pdf", "png", "jpg", "jpeg"];

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

function getFileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function getAcceptedFileTypes(task: Record<string, any>) {
  const raw = task.accepted_file_types ?? DEFAULT_FILE_TYPES;

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).replace(".", "").trim().toLowerCase());
  }

  return DEFAULT_FILE_TYPES;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("lesson_submission_tasks")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("is_published", true)
      .order("created_at", { ascending: true });

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const taskIds = tasks.map((task) => task.id);

    const { data: submissions, error: submissionsError } = await supabase
      .from("student_submissions")
      .select("*")
      .eq("student_id", user.id)
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (submissionsError) {
      return NextResponse.json({ error: submissionsError.message }, { status: 500 });
    }

    const submissionsWithUrls = await Promise.all(
      (submissions ?? []).map(async (submission) => {
        if (!submission.file_path) {
          return submission;
        }

        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(submission.file_path, 60 * 60);

        return {
          ...submission,
          file_url: data?.signedUrl ?? null,
        };
      })
    );

    const tasksWithSubmissions = tasks.map((task) => {
      const taskSubmissions = submissionsWithUrls.filter(
        (submission) => submission.task_id === task.id
      );

      return {
        ...task,
        submissions: taskSubmissions,
        latest_submission: taskSubmissions[0] ?? null,
      };
    });

    return NextResponse.json({ tasks: tasksWithSubmissions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const taskId = Number(formData.get("taskId"));
    const submissionType = String(formData.get("submissionType") ?? "").trim();
    const studentComment = String(formData.get("studentComment") ?? "").trim();

    if (!taskId || !submissionType) {
      return NextResponse.json(
        { error: "taskId and submissionType are required" },
        { status: 400 }
      );
    }

    if (!["file", "link"].includes(submissionType)) {
      return NextResponse.json(
        { error: "submissionType must be 'file' or 'link'" },
        { status: 400 }
      );
    }

    const { data: task, error: taskError } = await supabase
      .from("lesson_submission_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.is_published) {
      return NextResponse.json(
        { error: "This submission task is not published" },
        { status: 403 }
      );
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, course_id")
      .eq("id", task.lesson_id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: "Could not resolve lesson/course for this task" },
        { status: 500 }
      );
    }

    const { data: existingSubmission } = await supabase
      .from("student_submissions")
      .select("*")
      .eq("task_id", taskId)
      .eq("student_id", user.id)
      .maybeSingle();

    let storagePath: string | null = null;

    const payload: Record<string, any> = {
      task_id: taskId,
      lesson_id: lesson.id,
      course_id: lesson.course_id,
      student_id: user.id,
      submission_type: submissionType,
      student_comment: studentComment || null,
      status: "submitted",
      teacher_score: null,
      teacher_feedback: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
      file_path: null,
      file_name: null,
      file_mime_type: null,
      external_url: null,
    };

    if (submissionType === "link") {
      if (!task.accept_link) {
        return NextResponse.json(
          { error: "This task does not accept links" },
          { status: 400 }
        );
      }

      const externalUrl = String(formData.get("externalUrl") ?? "").trim();

      if (!externalUrl || !isHttpsUrl(externalUrl)) {
        return NextResponse.json(
          { error: "Please provide a valid https:// link" },
          { status: 400 }
        );
      }

      payload.external_url = externalUrl;
    }

    if (submissionType === "file") {
      if (!task.accept_file) {
        return NextResponse.json(
          { error: "This task does not accept file uploads" },
          { status: 400 }
        );
      }

      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Please choose a file" }, { status: 400 });
      }

      const extension = getFileExtension(file.name);
      const allowedTypes = getAcceptedFileTypes(task);

      if (!allowedTypes.includes(extension)) {
        return NextResponse.json(
          { error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}` },
          { status: 400 }
        );
      }

      const safeName = sanitizeFileName(file.name);
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      storagePath = `${user.id}/${taskId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      payload.file_path = storagePath;
      payload.file_name = file.name;
      payload.file_mime_type = file.type || null;
    }

    let savedSubmission: any = null;

    if (existingSubmission) {
      if (existingSubmission.file_path) {
        await supabase.storage.from(BUCKET).remove([existingSubmission.file_path]);
      }

      const { data, error: updateError } = await supabase
        .from("student_submissions")
        .update(payload)
        .eq("id", existingSubmission.id)
        .select("*")
        .single();

      if (updateError) {
        if (storagePath) {
          await supabase.storage.from(BUCKET).remove([storagePath]);
        }

        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      savedSubmission = data;
    } else {
      const { data, error: insertError } = await supabase
        .from("student_submissions")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) {
        if (storagePath) {
          await supabase.storage.from(BUCKET).remove([storagePath]);
        }

        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      savedSubmission = data;
    }

    let fileUrl: string | null = null;

    if (savedSubmission.file_path) {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(savedSubmission.file_path, 60 * 60);

      fileUrl = data?.signedUrl ?? null;
    }

    return NextResponse.json({
      submission: {
        ...savedSubmission,
        file_url: fileUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}