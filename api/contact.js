// Serverless contact endpoint — receives the CDM contact-modal submission and
// posts it to Slack via an Incoming Webhook. The webhook URL is a SECRET and
// lives only in the SLACK_WEBHOOK_URL env var, never in the client.
//
// Vercel: drop this file at /api/contact.js and set SLACK_WEBHOOK_URL in the
// project's Environment Variables. The frontend POSTs JSON to /api/contact.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    console.error('SLACK_WEBHOOK_URL is not set');
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  // Vercel parses JSON bodies automatically; guard for the raw-string case too.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot — a real user never fills this. Pretend success, send nothing.
  if (body._honey) return res.status(200).json({ ok: true });

  const clean = (v, max = 2000) =>
    String(v == null ? '' : v).trim().slice(0, max);

  const first = clean(body.first_name, 120);
  const last = clean(body.last_name, 120);
  const company = clean(body.company, 200);
  const email = clean(body.email, 200);
  const message = clean(body.message, 4000);
  const formType = clean(body.form_type, 40) || 'contact';

  const name = [first, last].filter(Boolean).join(' ');

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: 'Name and email are required' });
  }

  const heading = formType === 'report'
    ? ':bar_chart:  New report request'
    : ':airplane:  New CDM lead';

  const fields = [
    { type: 'mrkdwn', text: `*Name:*\n${name}` },
    { type: 'mrkdwn', text: `*Email:*\n${email}` },
  ];
  if (company) fields.push({ type: 'mrkdwn', text: `*Company:*\n${company}` });

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: heading, emoji: true } },
    { type: 'section', fields },
  ];
  if (message) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Message:*\n${message}` },
    });
  }

  // Intent score + activity feed (present when the lead converted from the score sidebar)
  const score = Number.isFinite(Number(body.score)) ? Number(body.score) : null;
  const scoreTier = clean(body.score_tier, 120);
  const activity = Array.isArray(body.activity) ? body.activity.slice(0, 20) : [];

  if (score !== null) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Intent score:* *${score}*${scoreTier ? `  ·  ${scoreTier}` : ''}`,
      },
    });
  }
  if (activity.length) {
    const lines = activity
      .map((a) => {
        const t = clean(a && a.time, 20);
        const label = clean(a && a.label, 200);
        const pts = Number.isFinite(Number(a && a.points)) ? Number(a.points) : null;
        return `• ${t ? `\`${t}\`  ` : ''}${label}${pts !== null ? `  *+${pts}*` : ''}`;
      })
      .join('\n')
      .slice(0, 2900); // Slack section text cap is 3000 chars
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*What they did:*\n${lines}` },
    });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `Submitted via championdigitalmedia.com` }],
  });

  const payload = {
    text: `${formType === 'report' ? 'Report request' : 'New lead'} — ${name} (${email})`, // notification fallback
    blocks,
  };

  try {
    const slackRes = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!slackRes.ok) {
      const detail = await slackRes.text();
      console.error('Slack webhook failed', slackRes.status, detail);
      return res.status(502).json({ ok: false, error: 'Could not deliver to Slack' });
    }
  } catch (err) {
    console.error('Slack webhook error', err);
    return res.status(502).json({ ok: false, error: 'Could not deliver to Slack' });
  }

  return res.status(200).json({ ok: true });
}
