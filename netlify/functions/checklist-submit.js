// netlify/functions/checklist-submit.js
// Receives psychic cleaner checklist submissions, stores them, and sends emails.
// Required Netlify env vars:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL

const nodemailer = require('nodemailer');
const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async function (event) {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    bizName = 'Unknown Business',
    contactName = '',
    email,
    pct = 0,
    tier = 'WARM',
    fails = 0,
    answers = {},
    source = 'website'
  } = data;

  if (!email) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email required' }) };
  }

  const submittedAt = new Date().toISOString();
  const submission = { bizName, contactName, email, pct, tier, fails, answers, source, submittedAt };

  // ── Store in Netlify Blobs ──────────────────────────────────────────────────
  try {
    const store = getStore({ name: 'checklist', consistency: 'strong' });
    let responses = [];
    try {
      const existing = await store.get('responses', { type: 'json' });
      if (Array.isArray(existing)) responses = existing;
    } catch { /* first submission — blob doesn't exist yet */ }
    responses.push(submission);
    await store.set('responses', JSON.stringify(responses));
  } catch (e) {
    console.error('Blob storage error:', e.message);
    // Non-fatal — emails still send even if storage fails
  }

  // ── Email ───────────────────────────────────────────────────────────────────
  const tierLabel = tier === 'HOT' ? 'Critical Issues Found'
                  : tier === 'WARM' ? 'Gaps Detected'
                  : 'Looking Good';
  const tierColor = tier === 'HOT' ? '#E74C3C'
                  : tier === 'WARM' ? '#F39C12'
                  : '#27ae60';
  const tierEmoji = tier === 'HOT' ? '🔴' : tier === 'WARM' ? '🟡' : '🟢';

  const tierMsg = tier === 'HOT'
    ? `Your space has <strong>${fails} area${fails !== 1 ? 's' : ''} with critical issues</strong>. These are the spots that show up in Google reviews and cost you tenants or staff. Alex will be in touch today.`
    : tier === 'WARM'
    ? `Your space has <strong>${fails} area${fails !== 1 ? 's' : ''} with cleaning gaps</strong>. These build quietly — staff notice before you do. A free walkthrough will show you exactly what's being missed.`
    : `Your space is tracking well. Run this checklist again in 30 days to keep your cleaner accountable.`;

  const ctaLabel = tier === 'HOT' ? 'Call Alex Now' : tier === 'WARM' ? 'Book a Free Walkthrough' : 'Visit Big Blue Mop';
  const ctaLink  = tier === 'HOT' ? 'tel:0410260800'
                 : tier === 'WARM' ? 'mailto:bigbluemop@gmail.com?subject=' + encodeURIComponent('Free Walkthrough – ' + bizName)
                 : 'https://bigbluemop.com.au';

  const prospectHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Psychic Cleaner Results</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 30px rgba(91,200,245,.15);max-width:600px;width:100%">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0d1f2d 0%,#1a3a4a 100%);padding:32px 36px;text-align:center">
    <div style="font-size:28px;font-weight:900;color:#5BC8F5;letter-spacing:-0.5px">Big Blue Mop</div>
    <div style="color:#8aa5b5;font-size:13px;margin-top:4px;letter-spacing:2px;text-transform:uppercase">Commercial Cleaning · Perth</div>
  </td></tr>
  <!-- Score band -->
  <tr><td style="background:${tierColor};padding:24px 36px;text-align:center">
    <div style="font-size:42px">${tierEmoji}</div>
    <div style="font-size:24px;font-weight:900;color:#fff;margin-top:8px">${tierLabel}</div>
    <div style="font-size:48px;font-weight:900;color:#fff;line-height:1;margin:8px 0">${pct}%</div>
    <div style="color:rgba(255,255,255,.85);font-size:13px">Psychic Cleaner Score</div>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:32px 36px">
    <p style="font-size:16px;color:#1a2a38;line-height:1.7;margin:0 0 20px">
      Hi${contactName ? ' ' + contactName : ''}${bizName ? ' from ' + bizName : ''},
    </p>
    <p style="font-size:15px;color:#4a6070;line-height:1.8;margin:0 0 24px">${tierMsg}</p>
    <div style="background:#f0f9ff;border-left:4px solid ${tierColor};border-radius:8px;padding:16px 20px;margin-bottom:28px">
      <strong style="color:#1a2a38;font-size:13px;text-transform:uppercase;letter-spacing:1px">Your score breakdown</strong>
      <div style="margin-top:10px;background:#e0f3fc;border-radius:6px;overflow:hidden;height:14px">
        <div style="width:${pct}%;background:${tierColor};height:100%;border-radius:6px;transition:width 1s"></div>
      </div>
      <div style="color:#4a6070;font-size:13px;margin-top:8px">${pct}% · ${fails} area${fails !== 1 ? 's' : ''} failed · ${10 - fails} area${(10 - fails) !== 1 ? 's' : ''} passed</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:28px">
      <a href="${ctaLink}" style="display:inline-block;background:${tierColor};color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 36px;border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.15)">${ctaLabel} →</a>
    </td></tr></table>
    <p style="font-size:13px;color:#8aa5b5;margin:0">Big Blue Mop cleans commercial spaces across Perth Metro. We specialise in holding cleaners accountable so you don't have to.</p>
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8fcff;padding:20px 36px;text-align:center;border-top:1px solid #d6f0fc">
    <p style="font-size:12px;color:#8aa5b5;margin:0">Big Blue Mop · Perth, WA · <a href="tel:0410260800" style="color:#5BC8F5;text-decoration:none">0410 260 800</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const channelLabel = source === 'website' || !source ? 'Direct Website' : 'Email Campaign — ' + source;
  const notifyHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Checklist Response</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(91,200,245,.12);max-width:560px;width:100%">
  <tr><td style="background:${tierColor};padding:20px 28px">
    <div style="font-size:13px;font-weight:800;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:1.5px">New Checklist Response ${tierEmoji}</div>
    <div style="font-size:26px;font-weight:900;color:#fff;margin-top:4px">${bizName || 'Unknown'}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.85);margin-top:2px">${contactName} · ${email}</div>
  </td></tr>
  <tr><td style="padding:24px 28px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f9ff"><span style="font-size:12px;color:#8aa5b5;text-transform:uppercase;letter-spacing:1px">Score</span><br><strong style="font-size:20px;color:${tierColor}">${pct}% — ${tierLabel}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f9ff"><span style="font-size:12px;color:#8aa5b5;text-transform:uppercase;letter-spacing:1px">Fails</span><br><strong style="color:#1a2a38">${fails} area${fails !== 1 ? 's' : ''} failed</strong></td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f9ff"><span style="font-size:12px;color:#8aa5b5;text-transform:uppercase;letter-spacing:1px">Channel</span><br><strong style="color:#1a2a38">${channelLabel}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px 0"><span style="font-size:12px;color:#8aa5b5;text-transform:uppercase;letter-spacing:1px">Submitted</span><br><strong style="color:#1a2a38">${new Date(submittedAt).toLocaleString('en-AU', { timeZone: 'Australia/Perth' })} AWST</strong></td>
      </tr>
    </table>
    <div style="margin-top:20px;display:flex;gap:10px">
      <a href="mailto:${email}?subject=${encodeURIComponent('Re: Your Cleaning Audit — ' + bizName)}" style="display:inline-block;background:#5BC8F5;color:#fff;text-decoration:none;font-weight:800;font-size:13px;padding:10px 22px;border-radius:10px;margin-right:10px">Reply to ${contactName || 'Prospect'} →</a>
      <a href="tel:0410260800" style="display:inline-block;background:#0d1f2d;color:#5BC8F5;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:10px">View in CRM</a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const fromAddr = `"Big Blue Mop" <${process.env.SMTP_USER}>`;
  const notifyAddr = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

  try {
    await Promise.all([
      transporter.sendMail({
        from: fromAddr,
        to: email,
        subject: `Your Psychic Cleaner Results — ${pct}% (${tierLabel})`,
        html: prospectHtml
      }),
      transporter.sendMail({
        from: fromAddr,
        to: notifyAddr,
        subject: `[${tier}] New Checklist: ${bizName} scored ${pct}% via ${channelLabel}`,
        html: notifyHtml
      })
    ]);
  } catch (e) {
    console.error('Email send error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Email failed', detail: e.message }) };
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
};
