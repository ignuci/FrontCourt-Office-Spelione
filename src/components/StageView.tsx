"use client";

import { useEffect, useState } from "react";
import {
  answeredCount, formatAnswer, isCorrect, maxPoints, scoreAnswers, stageStatus,
  type Answers, type League, type Question, type Stage, type Submission,
} from "@/lib/league";
import { TeamSelect } from "./TeamSelect";
import { Button, Empty, Points, Tag } from "./ui";

interface Props {
  league: League;
  stage: Stage;
  player: string;
  now: Date;
  draft: Answers;
  submission: Submission | undefined;
  submissions: Submission[];
  pending: boolean;
  canSave: boolean;
  onAnswer: (qid: string, value: string) => void;
  onSubmit: () => Promise<{ ok: true } | { ok: false; message: string }>;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function StageView(p: Props) {
  const { stage, now } = p;
  const status = stageStatus(stage, now);
  const submitted = p.submissions.filter((s) => s.stage === stage.id).map((s) => s.player);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-4xl font-extrabold uppercase">{stage.name}</h2>
          <p className="text-sm text-muted">
            {status === "locked" ? `Locked ${fmtDate(stage.lock)}` : status === "open" ? `Locks ${fmtDate(stage.lock)}` : "Not open yet"}
            {stage.questions.length > 0 && ` · ${stage.questions.length} questions · up to ${maxPoints(stage)} pts`}
          </p>
        </div>
        {status === "open" && <Tag tone="open">Open</Tag>}
        {status === "locked" && <Tag tone="lock">Locked</Tag>}
        {status === "soon" && <Tag tone="lock">Coming soon</Tag>}
      </div>

      {stage.note && status !== "soon" && <p className="mb-4 rounded-xl bg-orange-soft px-3.5 py-2.5 text-[13px] text-orange-deep">{stage.note}</p>}

      {status === "soon" ? (
        <ComingSoon stage={stage} />
      ) : p.submission ? (
        <MyAnswers stage={stage} submission={p.submission} />
      ) : status === "open" ? (
        p.pending ? (
          <PendingNotice />
        ) : (
          <AnswerForm {...p} />
        )
      ) : (
        <Empty>You didn&apos;t submit predictions for {stage.name}.</Empty>
      )}

      {status !== "soon" && (
        <div className="card mt-4">
          <h3 className="text-xl font-extrabold uppercase">
            Submitted {submitted.length} / {p.league.players.length}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.league.players.map((name) => (
              <span
                key={name}
                className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                  submitted.includes(name) ? "bg-good-soft text-good" : "bg-purple-soft text-muted"
                }`}
              >
                {submitted.includes(name) ? "✓ " : ""}
                {name}
              </span>
            ))}
          </div>
          {status === "open" && <p className="mt-2 text-[13px] text-muted">Everyone&apos;s answers are revealed when {stage.name} locks.</p>}
        </div>
      )}

      {status === "locked" && <EveryonesAnswers league={p.league} stage={stage} submissions={p.submissions} me={p.player} />}
    </section>
  );
}

/* ---------- not open yet ---------- */

function ComingSoon({ stage }: { stage: Stage }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = stage.opens ? Date.parse(stage.opens) : NaN;
  const left = Math.max(0, target - now);
  const parts: [number, string][] = [
    [Math.floor(left / 86_400_000), "days"],
    [Math.floor(left / 3_600_000) % 24, "hours"],
    [Math.floor(left / 60_000) % 60, "min"],
    [Math.floor(left / 1000) % 60, "sec"],
  ];
  return (
    <div className="card text-center">
      {stage.note && <p className="mx-auto mb-4 max-w-xl text-lg">{stage.note}</p>}
      {Number.isNaN(target) ? (
        <p className="text-muted">The date for {stage.name} is coming soon.</p>
      ) : (
        <>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted">{stage.name} opens in</p>
          <div className="mt-3 flex justify-center gap-2 sm:gap-3" role="timer" aria-live="off">
            {parts.map(([n, label]) => (
              <div key={label} className="w-18 rounded-xl bg-purple py-3 text-white sm:w-22">
                <div className="font-display text-4xl font-extrabold leading-none tabular-nums sm:text-5xl">{String(n).padStart(2, "0")}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider opacity-75">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-muted">{new Date(target).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
        </>
      )}
    </div>
  );
}

/* ---------- answering ---------- */

function AnswerForm({ stage, draft, onAnswer, onSubmit, canSave }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = answeredCount(stage, draft);
  const total = stage.questions.length;

  const send = async () => {
    setSaving(true);
    setError(null);
    const r = await onSubmit();
    setSaving(false);
    if (!r.ok) setError(r.message);
  };

  if (reviewing) {
    return (
      <div className="card">
        <h3 className="text-2xl font-extrabold uppercase">Check your answers</h3>
        <p className="mb-3 text-sm text-muted">Once you submit, your answers are final and can&apos;t be changed.</p>
        <ol className="divide-y divide-line">
          {stage.questions.map((q, i) => (
            <li key={q.id} className="flex gap-3 py-2.5 text-sm">
              <span className="w-6 flex-none font-display text-lg font-bold text-orange">{i + 1}</span>
              <span className="flex-1 text-muted">{q.text}</span>
              <b className="text-right">{formatAnswer(q, draft[q.id])}</b>
            </li>
          ))}
        </ol>
        {error && <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setReviewing(false)} disabled={saving}>
            Change answers
          </Button>
          <Button onClick={send} disabled={saving}>
            {saving ? "Saving…" : "Submit — final"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ol className="grid gap-3">
        {stage.questions.map((q, i) => (
          <li key={q.id} className="card">
            <div className="flex items-start gap-3">
              <span className="font-display text-2xl font-extrabold leading-none text-orange">{i + 1}</span>
              <p className="flex-1 font-semibold">{q.text}</p>
              <Points value={q.points} />
            </div>
            <div className="mt-3">
              <AnswerInput q={q} value={draft[q.id] ?? ""} onChange={(v) => onAnswer(q.id, v)} />
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-3 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5 shadow-lg">
        <div className="min-w-0 flex-1 text-sm">
          <b>
            {done} / {total}
          </b>{" "}
          answered
          <span className="block text-[13px] text-muted">
            {canSave ? "Your answers are saved on this device as you type." : "Saving isn't switched on yet — you can fill in answers, but not submit."}
          </span>
        </div>
        <Button onClick={() => setReviewing(true)} disabled={done < total || !canSave}>
          Review &amp; submit
        </Button>
      </div>
    </div>
  );
}

function AnswerInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  if (q.type === "team") {
    return <TeamSelect aria-label={q.text} conf={q.conf} placeholder="— choose a team —" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.type === "choice") {
    return (
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={q.text}>
        {q.options?.map((o) => (
          <button
            key={o}
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(value === o ? "" : o)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              value === o ? "border-orange bg-orange text-white" : "border-line bg-card hover:border-orange"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }
  return (
    <input
      aria-label={q.text}
      type={q.type === "number" ? "number" : "text"}
      inputMode={q.type === "number" ? "numeric" : undefined}
      placeholder={q.type === "number" ? "Your number" : "Your answer"}
      maxLength={200}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function PendingNotice() {
  return (
    <div className="card border-orange">
      <h3 className="text-xl font-extrabold uppercase">Sending your answers…</h3>
      <p className="mt-1 text-sm text-muted">
        They&apos;re safely stored on this device and will be sent to the answer sheet as soon as there&apos;s a connection. Keep this page
        open or come back later — you won&apos;t need to answer again.
      </p>
    </div>
  );
}

/* ---------- after submitting ---------- */

function MyAnswers({ stage, submission }: { stage: Stage; submission: Submission }) {
  const answers = submission.answers ?? {};
  const scored = stage.questions.some((q) => q.answer != null);
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="good">Submitted</Tag>
        <span className="text-sm text-muted">{new Date(submission.submittedAt).toLocaleString()} · saved in the answer sheet</span>
        {scored && (
          <span className="ml-auto font-display text-2xl font-extrabold text-orange">
            {scoreAnswers(stage, submission.answers)} / {maxPoints(stage)} pts
          </span>
        )}
      </div>
      <ol className="mt-3 divide-y divide-line">
        {stage.questions.map((q, i) => {
          const ok = isCorrect(q, answers[q.id]);
          return (
            <li key={q.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="w-6 flex-none font-display text-lg font-bold text-orange">{i + 1}</span>
              <span className="min-w-48 flex-1 text-muted">
                {q.text}
                <Points value={q.points} />
              </span>
              <b>{formatAnswer(q, answers[q.id])}</b>
              {ok === true && <Tag tone="good">+{q.points}</Tag>}
              {ok === false && (
                <span className="text-[13px] text-bad">✗ {formatAnswer(q, Array.isArray(q.answer) ? q.answer[0] : (q.answer ?? undefined))}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EveryonesAnswers({ league, stage, submissions, me }: { league: League; stage: Stage; submissions: Submission[]; me: string }) {
  const subs = league.players.map((name) => submissions.find((s) => s.stage === stage.id && s.player === name));
  const th = "border-b border-line px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
  const td = "border-b border-line px-2 py-2 text-[13px] align-top";
  return (
    <div className="card mt-4 overflow-x-auto">
      <h3 className="text-xl font-extrabold uppercase">Everyone&apos;s answers</h3>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Question</th>
            <th className={th}>Correct</th>
            {league.players.map((name) => (
              <th key={name} className={`${th} ${name === me ? "text-orange" : ""}`}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stage.questions.map((q, i) => (
            <tr key={q.id}>
              <td className={`${td} min-w-52`}>
                <b className="text-orange">{i + 1}.</b> {q.text} <span className="text-muted">({q.points} pts)</span>
              </td>
              <td className={`${td} font-semibold`}>{q.answer == null ? <span className="text-muted">tbd</span> : formatAnswer(q, Array.isArray(q.answer) ? q.answer[0] : q.answer)}</td>
              {subs.map((s, j) => {
                const v = s?.answers?.[q.id];
                const ok = s ? isCorrect(q, v) : null;
                return (
                  <td key={j} className={`${td} ${ok === true ? "bg-good-soft text-good" : ok === false ? "text-bad" : ""}`}>
                    {s ? formatAnswer(q, v) : <span className="text-muted">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className={`${td} font-bold`} colSpan={2}>
              Points
            </td>
            {subs.map((s, j) => (
              <td key={j} className={`${td} font-bold`}>
                {s ? scoreAnswers(stage, s.answers) : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
