export default function Privacy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", fontFamily: "Inter, sans-serif", color: "#1C1F26", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#5C6470", fontSize: 13, marginBottom: 28 }}>Last updated: September 2026</p>

      <p>
        Action &amp; Priority Agent ("the app") is a free tool that sorts your
        tasks using the Eisenhower Matrix and, if you choose, connects to your
        Google Calendar and Gmail to act on them. This page explains what
        data the app touches and how it's used — plainly, without legal
        padding.
      </p>

      <h2 style={sectionStyle}>What we collect, and why</h2>
      <p><strong>Your Google account info.</strong> When you sign in with
      Google, we receive your name and email address, so the app knows who
      you are and can save your tasks under your account.</p>

      <p><strong>Calendar and Gmail access.</strong> If you sign in, you're
      granting the app permission to create and delete events on your
      calendar, and send emails from your own Gmail — but only when you
      explicitly click a button to do so (e.g. "Add to Calendar" or "Send").
      The app never creates events or sends emails on its own, in the
      background, or without you taking that specific action.</p>

      <p><strong>Your tasks.</strong> If you're signed in, your task list is
      saved so it's there when you come back. If you delegate a task to
      someone else's email, that task and its status (and any reply they
      send back) are stored so both of you can see it.</p>

      <p><strong>Your AI provider API key.</strong> This is never sent to or
      stored on our servers. It lives only in your own browser's local
      storage, and is sent directly from your browser (via our server, as a
      pass-through, to avoid a technical browser restriction) to whichever
      AI provider you chose — Google, Anthropic, or OpenAI. We never see it,
      log it, or store it anywhere.</p>

      <p><strong>Basic usage stats.</strong> We record that you signed in
      (email, first-seen and last-seen dates) and, if you choose to give it,
      a thumbs up/down on how the app is working for you. This is used only
      to understand how many people use the app and whether it's helpful —
      never sold, never shared, never used for advertising.</p>

      <h2 style={sectionStyle}>What we don't do</h2>
      <p>We don't run ads. We don't sell or share your data with advertisers
      or data brokers. We don't read your email or calendar beyond what's
      needed to perform the specific action you clicked. We don't use your
      data to train any AI model — the AI provider you choose has its own
      separate policy for that, since your key talks to them directly, not
      through us.</p>

      <h2 style={sectionStyle}>Where data is stored</h2>
      <p>Signed-in data (your tasks, delegation records, sign-in log) is
      stored using Supabase, a hosted database provider. Authentication is
      handled by Google's own sign-in system — we never see or store your
      Google password.</p>

      <h2 style={sectionStyle}>Deleting your data</h2>
      <p>You can revoke the app's access to your Google account at any time
      from your Google Account's security settings
      (myaccount.google.com/permissions). To have your stored tasks or
      sign-in record deleted entirely, contact us at the email below.</p>

      <h2 style={sectionStyle}>Children</h2>
      <p>This app is not directed at children under 13, and we don't
      knowingly collect data from them.</p>

      <h2 style={sectionStyle}>Changes to this policy</h2>
      <p>If this policy changes, the "Last updated" date at the top will
      change too. Continued use of the app after a change means you accept
      the update.</p>

      <h2 style={sectionStyle}>Contact</h2>
      <p>Questions about this policy or your data: ayyan555.ai@gmail.com</p>
    </div>
  );
}

const sectionStyle = { fontSize: 18, fontWeight: 700, marginTop: 28, marginBottom: 8 };
