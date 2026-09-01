import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

// Cancels a Calendar event using the logged-in user's own Google token —
// called automatically when a task is marked done or moved to Delete.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: "eventId is required" });

  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    }
  );

  // Google returns 204 No Content on success, or 410 if already deleted — both are fine
  if (!resp.ok && resp.status !== 410) {
    const err = await resp.text();
    return res.status(resp.status).json({ error: err });
  }

  return res.status(200).json({ ok: true });
}
