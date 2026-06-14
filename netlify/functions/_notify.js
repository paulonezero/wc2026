// Notification dispatch stub for the daily snippet. Both delivery channels
// are opt-in via env vars — if nothing is configured, this is a no-op. Wire
// up future integrations by setting the envs (no code change needed).
//
//   NOTIFY_TEAMS_WEBHOOK   — Microsoft Teams "Incoming Webhook" URL.
//   NOTIFY_EMAIL_TO        — comma-separated recipient list.
//   NOTIFY_EMAIL_FROM      — verified sender on the SendGrid account.
//   SENDGRID_API_KEY       — SendGrid API key.
//
// Returns { delivered: [...], skipped: [...], errors: [...] } so callers can
// log a one-line summary. Never throws — channel failures are swallowed so a
// flaky webhook doesn't block snippet persistence.

const TEAMS_TIMEOUT_MS = 8000;
const SENDGRID_TIMEOUT_MS = 8000;

export async function dispatchSnippet(snippet, state) {
  const delivered = [];
  const skipped = [];
  const errors = [];

  if (!snippet?.body) {
    return { delivered, skipped: ["empty-body"], errors };
  }

  const poolName = state?.poolName || "The Office Pool";
  const subject = `${poolName} · morning snippet`;
  const plainBody = `${snippet.body}\n\n— ${poolName}`;

  // ---- Microsoft Teams -----------------------------------------------------
  const teamsUrl = process.env.NOTIFY_TEAMS_WEBHOOK;
  if (teamsUrl) {
    try {
      const res = await fetch(teamsUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `**${subject}**\n\n${snippet.body}` }),
        signal: AbortSignal.timeout(TEAMS_TIMEOUT_MS),
      });
      if (res.ok) delivered.push("teams");
      else errors.push(`teams ${res.status}`);
    } catch (e) {
      errors.push(`teams: ${e.message || e}`);
    }
  } else {
    skipped.push("teams (NOTIFY_TEAMS_WEBHOOK unset)");
  }

  // ---- Email (SendGrid) ----------------------------------------------------
  const sgKey = process.env.SENDGRID_API_KEY;
  const emailTo = process.env.NOTIFY_EMAIL_TO;
  const emailFrom = process.env.NOTIFY_EMAIL_FROM;
  if (sgKey && emailTo && emailFrom) {
    try {
      const recipients = emailTo.split(",").map(s => s.trim()).filter(Boolean).map(email => ({ email }));
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${sgKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: recipients, subject }],
          from: { email: emailFrom },
          content: [{ type: "text/plain", value: plainBody }],
        }),
        signal: AbortSignal.timeout(SENDGRID_TIMEOUT_MS),
      });
      if (res.ok) delivered.push("email");
      else errors.push(`email ${res.status}`);
    } catch (e) {
      errors.push(`email: ${e.message || e}`);
    }
  } else {
    skipped.push("email (SENDGRID_API_KEY / NOTIFY_EMAIL_TO / NOTIFY_EMAIL_FROM unset)");
  }

  return { delivered, skipped, errors };
}
