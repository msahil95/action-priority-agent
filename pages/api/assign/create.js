import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createAssignment } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not signed in" });

  const { toEmail, taskText, reason } = req.body;
  if (!toEmail || !taskText) return res.status(400).json({ error: "toEmail and taskText are required" });

  await createAssignment(session.user.email, toEmail, taskText, reason);
  return res.status(200).json({ ok: true });
}
