import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { replyToAssignment } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not signed in" });

  const { id, reply } = req.body;
  if (!id || !reply) return res.status(400).json({ error: "id and reply are required" });

  await replyToAssignment(id, session.user.email, reply);
  return res.status(200).json({ ok: true });
}
