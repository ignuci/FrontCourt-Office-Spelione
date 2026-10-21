/**
 * FrontCourt Office Spėlionė — answer storage in a Google Sheet.
 *
 * Paste this whole file into Extensions → Apps Script of your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps: apps-script/README.md
 *
 * Rules enforced here (not just in the website):
 *  - only names listed in league.json can submit
 *  - one submission per person per stage — the first one is final
 *  - no submissions after a stage's lock time
 *  - everyone's answers (your own too) stay hidden until the stage locks;
 *    before that, the sheet only tells who has submitted and when
 */

// Where the site publishes its league.json (players, stages, lock dates).
const LEAGUE_URL = 'https://ignuci.github.io/FrontCourt-Office-Spelione/league.json';
const SHEET_NAME = 'Answers';
const HEADER = ['Submitted at', 'Player', 'Stage', 'Answers (JSON)'];

function doGet(e) {
  const league = league_();
  const now = new Date();
  const locked = {};
  league.stages.forEach(function (s) { locked[s.id] = new Date(s.lock) <= now; });
  const submissions = rows_().map(function (r) {
    return { player: r.player, stage: r.stage, submittedAt: r.submittedAt, answers: locked[r.stage] ? r.answers : null };
  });
  return json_({ ok: true, submissions: submissions, serverTime: now.toISOString() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // one write at a time, so two taps can't create two rows
  try {
    const body = JSON.parse(e.postData.contents);
    const league = league_();
    const stage = league.stages.filter(function (s) { return s.id === body.stage; })[0];
    if (!stage) return json_({ ok: false, error: 'Unknown stage.' });
    if (league.players.indexOf(body.player) === -1) return json_({ ok: false, error: 'That name is not on the player list.' });

    const isLocked = new Date(stage.lock) <= new Date();
    const existing = rows_().filter(function (r) { return r.player === body.player && r.stage === body.stage; })[0];
    if (existing) {
      // Already submitted: say so, but don't hand the answers back before the lock.
      return json_({ ok: true, alreadySubmitted: true, submission: { player: existing.player, stage: existing.stage, submittedAt: existing.submittedAt, answers: isLocked ? existing.answers : null } });
    }

    if (isLocked) return json_({ ok: false, error: stage.name + ' is locked — submissions are closed.' });

    const answers = {};
    stage.questions.forEach(function (q) {
      const v = body.answers && body.answers[q.id];
      if (v != null && String(v).trim() !== '') answers[q.id] = String(v).slice(0, 200);
    });
    const now = new Date();
    sheet_().appendRow([now, body.player, body.stage, JSON.stringify(answers)]);
    return json_({ ok: true, submission: { player: body.player, stage: body.stage, submittedAt: now.toISOString(), answers: answers } });
  } catch (err) {
    return json_({ ok: false, error: 'Could not save: ' + err });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_() {
  const values = sheet_().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[1]) continue;
    let answers = {};
    try { answers = JSON.parse(r[3] || '{}'); } catch (err) { answers = {}; }
    out.push({ submittedAt: new Date(r[0]).toISOString(), player: String(r[1]), stage: String(r[2]), answers: answers });
  }
  return out;
}

function league_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('league');
  if (cached) return JSON.parse(cached);
  const text = UrlFetchApp.fetch(LEAGUE_URL + '?t=' + Date.now()).getContentText();
  cache.put('league', text, 120); // re-read at most every 2 minutes
  return JSON.parse(text);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to create the sheet tab and grant permissions. */
function setup() {
  sheet_();
  league_();
}
