import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { getAssignmentsSentByUser } from "../../../lib/supabase";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not signed in" });

  const assignments = await getAssignmentsSentByUser(session.user.email);
  return res.status(200).json({ assignments });
}
