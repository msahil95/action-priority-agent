import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

// Sends a real email through the signed-in user's own Gmail account.
// Costs nothing, uses no separate email service — just their existing Google login.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const { to, subject, body } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "to and subject are required" });

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body || "",
  ].join("\r\n");

  const encoded = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return res.status(resp.status).json({ error: err });
  }

  return res.status(200).json({ ok: true });
}
