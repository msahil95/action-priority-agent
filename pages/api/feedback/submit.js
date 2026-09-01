import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { submitFeedback } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { rating } = req.body;
  if (rating !== "up" && rating !== "down") {
    return res.status(400).json({ error: "rating must be 'up' or 'down'" });
  }

  const session = await getServerSession(req, res, authOptions);
  await submitFeedback(session?.user?.email, rating);
  return res.status(200).json({ ok: true });
}
