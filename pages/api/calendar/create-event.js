import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

// Creates a Calendar event using the logged-in user's own Google token.
// Nothing here touches your (the site owner's) Google account or costs you anything.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const { title, notes, startISO, endISO } = req.body;
  if (!title || !startISO) {
    return res.status(400).json({ error: "title and startISO are required" });
  }

  const event = {
    summary: title,
    description: notes || "",
    start: { dateTime: startISO },
    end: { dateTime: endISO || startISO },
  };

  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    return res.status(resp.status).json({ error: err });
  }

  const data = await resp.json();
  return res.status(200).json({ ok: true, eventLink: data.htmlLink, eventId: data.id });
}
