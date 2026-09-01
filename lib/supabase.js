// Free tier Supabase project: supabase.com -> New project -> copy URL + service_role key
// Table needed (run once in Supabase SQL editor):
//
// create table users (
//   email text primary key,
//   name text,
//   first_seen timestamptz default now(),
//   last_seen timestamptz default now()
// );

export async function upsertUser(email, name) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ email, name, last_seen: new Date().toISOString() }),
  });
}

export async function getUserStats() {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/users?select=email,first_seen,last_seen`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const rows = await res.json();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const activeLast30 = rows.filter((r) => new Date(r.last_seen).getTime() > thirtyDaysAgo).length;
  return { total: rows.length, activeLast30, rows };
}

// Task persistence, one row per signed-in user, whole task list as JSON.
// Table needed (run once in Supabase SQL editor, alongside the users table above):
//
// create table user_tasks (
//   user_email text primary key,
//   tasks jsonb default '[]'::jsonb,
//   updated_at timestamptz default now()
// );

export async function getUserTasks(email) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/user_tasks?user_email=eq.${encodeURIComponent(email)}&select=tasks`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0].tasks : null;
}

export async function saveUserTasks(email, tasks) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_tasks`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ user_email: email, tasks, updated_at: new Date().toISOString() }),
  });
}

// Satisfaction feedback — one row per thumbs up/down.
// Table needed (run once in Supabase SQL editor, alongside the others above):
//
// create table feedback (
//   id bigint generated always as identity primary key,
//   user_email text,
//   rating text,
//   created_at timestamptz default now()
// );

export async function submitFeedback(email, rating) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/feedback`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_email: email || null, rating }),
  });
}

export async function getFeedbackStats() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return { up: 0, down: 0 };
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/feedback?select=rating`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    },
  });
  const rows = await res.json();
  const up = rows.filter((r) => r.rating === "up").length;
  const down = rows.filter((r) => r.rating === "down").length;
  return { up, down };
}

// Task assignment — delegating a task to someone else's email. If they ever
// sign in with that email, it shows up as "Assigned to you" on their side.
// Table needed (run once in Supabase SQL editor, alongside the others above):
//
// create table assignments (
//   id bigint generated always as identity primary key,
//   from_email text not null,
//   to_email text not null,
//   task_text text not null,
//   reason text,
//   status text default 'pending',
//   reply text,
//   created_at timestamptz default now()
// );

export async function createAssignment(fromEmail, toEmail, taskText, reason) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/assignments`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from_email: fromEmail, to_email: toEmail, task_text: taskText, reason: reason || "" }),
  });
}

export async function getAssignmentsForUser(email) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return [];
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/assignments?to_email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  return res.json();
}

export async function getAssignmentsSentByUser(email) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return [];
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/assignments?from_email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  return res.json();
}

export async function replyToAssignment(id, toEmail, reply) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/assignments?id=eq.${id}&to_email=eq.${encodeURIComponent(toEmail)}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reply }),
  });
}

export async function completeAssignment(id, email) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/assignments?id=eq.${id}&to_email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "done" }),
  });
}
