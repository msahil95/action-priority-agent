// One proxy, three providers. All calls happen server-side, so none of
// them hit browser CORS restrictions. The key passes through per-request —
// never stored, never logged.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { provider, apiKey, systemInstruction, text } = req.body;
  if (!provider || !apiKey || !text) {
    return res.status(400).json({ error: "provider, apiKey, and text are required" });
  }

  try {
    let raw;
    let usage = null; // { limit, remaining, resetAt } — real numbers from the provider, when available

    if (provider === "gemini") {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "Gemini request failed" });
      raw = data.candidates[0].content.parts[0].text;
      // Gemini doesn't expose remaining-quota headers, so no real `usage` here — client self-tracks against the known 1,500/day free cap.
    }

    else if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1200,
          system: systemInstruction,
          messages: [{ role: "user", content: text }],
        }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "Claude request failed" });
      raw = data.content.find((b) => b.type === "text").text;

      const limit = r.headers.get("anthropic-ratelimit-tokens-limit");
      const remaining = r.headers.get("anthropic-ratelimit-tokens-remaining");
      const resetAt = r.headers.get("anthropic-ratelimit-tokens-reset");
      if (limit && remaining) usage = { limit: Number(limit), remaining: Number(remaining), resetAt };
    }

    else if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: text },
          ],
        }),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "OpenAI request failed" });
      raw = data.choices[0].message.content;

      const limit = r.headers.get("x-ratelimit-limit-tokens");
      const remaining = r.headers.get("x-ratelimit-remaining-tokens");
      const resetIn = r.headers.get("x-ratelimit-reset-tokens"); // OpenAI gives a duration string like "6m0s", not a timestamp
      if (limit && remaining) usage = { limit: Number(limit), remaining: Number(remaining), resetIn };
    }

    else {
      return res.status(400).json({ error: "Unknown provider" });
    }

    return res.status(200).json({ raw, usage });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
