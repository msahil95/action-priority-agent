// Gemini blocks direct browser-to-API calls (CORS). This route is a thin
// pass-through: it takes the user's own key + text, forwards to Gemini,
// returns the result. The key is never written to disk, a database, or logs.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { apiKey, systemInstruction, text } = req.body;
  if (!apiKey || !text) {
    return res.status(400).json({ error: "apiKey and text are required" });
  }

  try {
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || "Gemini request failed" });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
