/*
 * CIDEX Gmail bridge (Google Apps Script)
 *
 * Runs inside the team's Gmail account (CidexInfotech1@gmail.com).
 *  1. Every 5 minutes, new customer messages are emailed to the team with [CID-ref] in the subject.
 *  2. Every 5 minutes, replies sent from that Gmail account with [CID-ref] in the subject mark the
 *     customer message as replied, so it leaves the customer's "Pending mails" list.
 *
 * The Supabase SERVICE ROLE key is stored in Script Properties, never in the website.
 */

const SUPABASE_URL = 'https://xqabhktmkeadzrxkmepo.supabase.co';
const TEAM_EMAIL = 'CidexInfotech1@gmail.com';

function sbHeaders_() {
  const key = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
  if (!key) throw new Error('Set SUPABASE_SERVICE_KEY in Project Settings > Script properties.');
  return { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
}

function sbRequest_(method, path, body) {
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1' + path, {
    method: method,
    headers: sbHeaders_(),
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('Supabase ' + method + ' ' + path + ' failed: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
  const text = res.getContentText();
  return text ? JSON.parse(text) : [];
}

/* 1. Email the team about new customer messages */
function notifyNewMessages() {
  const rows = sbRequest_('GET',
    '/messages?notified=eq.false&replied=eq.false&select=id,ref,subject,body,user_id,created_at&order=created_at.asc&limit=50');
  rows.forEach(function (m) {
    GmailApp.sendEmail(TEAM_EMAIL,
      '[CID-' + m.ref + '] ' + m.subject,
      'New message from a customer.\n\n' +
      'To answer, reply to this email from Gmail and keep the [CID-' + m.ref + '] part of the subject.\n\n' +
      '----------------------------------------\n' + m.body + '\n----------------------------------------\n' +
      'Received: ' + m.created_at + '\nCustomer ID: ' + m.user_id
    );
    sbRequest_('PATCH', '/messages?id=eq.' + encodeURIComponent(m.id), { notified: true });
  });
}

/* 2. Mark a customer message as replied when a reply with its [CID-ref] is sent from this Gmail */
function markRepliedFromGmail() {
  const threads = GmailApp.search('in:sent subject:"[CID-" newer_than:14d', 0, 100);
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      const subject = msg.getSubject() || '';
      // Replies start with "Re: [CID-...]". The team's own notification email does not, so it is skipped.
      if (subject.indexOf('Re: [CID-') !== 0) return;
      const match = subject.match(/\[CID-([0-9a-f]{10})\]/);
      if (!match) return;
      sbRequest_('PATCH', '/messages?ref=eq.' + match[1] + '&replied=eq.false', { replied: true });
    });
  });
}

/* 3. Email the team about each new free website check */
function notifyNewAudits() {
  const rows = sbRequest_('GET',
    '/audit_requests?notified=eq.false&select=id,url,name,email,score,result,created_at&order=created_at.asc&limit=50');
  rows.forEach(function (a) {
    const lines = ((a.result && a.result.checks) || []).map(function (c) {
      return '- [' + c.status + '] ' + c.label + ': ' + c.note;
    }).join('\n');
    GmailApp.sendEmail(TEAM_EMAIL,
      'New website check: ' + a.url + ' (score ' + a.score + ')',
      'Name: ' + (a.name || '-') + '\nEmail: ' + a.email + '\nWebsite: ' + a.url + '\nScore: ' + a.score + '/100\n\n' +
      lines + '\n\nFollow up by email or WhatsApp.\nReceived: ' + a.created_at
    );
    sbRequest_('PATCH', '/audit_requests?id=eq.' + encodeURIComponent(a.id), { notified: true });
  });
}

/* Run once from the Apps Script editor to create the 5-minute triggers. */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('notifyNewMessages').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('markRepliedFromGmail').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('notifyNewAudits').timeBased().everyMinutes(5).create();
}
