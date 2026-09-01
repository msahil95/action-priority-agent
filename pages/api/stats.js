import { getUserStats, getFeedbackStats } from "../../lib/supabase";

export default async function handler(req, res) {
  const { key } = req.query;
  if (key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Not authorized" });
  }
  const stats = await getUserStats();
  const feedback = await getFeedbackStats();
  return res.status(200).json({ ...stats, feedback });
}
