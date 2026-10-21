"use client";

import { useEffect, useRef, useState } from "react";
import {
  answeredCount, formatAnswer, isCorrect, maxPoints, scoreAnswers, stageAnswers, stageStatus,
  type Answers, type League, type Question, type Stage, type Submission,
} from "@/lib/league";
import { fmtDateTime, plural } from "@/lib/lt";
import { simplifyName, suggest } from "@/lib/text";
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

const QUESTIONS: [string, string, string] = ["klausimas", "klausimai", "klausimų"];
const firstAnswer = (q: Question) => (Array.isArray(q.answer) ? q.answer[0] : (q.answer ?? undefined));

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
            {[
              status === "locked" ? `Užrakinta ${fmtDateTime(stage.lock)}` : status === "soon" ? "Dar neatidaryta" : null,
              stage.questions.length > 0 ? `${plural(stage.questions.length, QUESTIONS)} · iki ${maxPoints(stage)} tšk.` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {status === "open" && <Tag tone="open">Atidaryta</Tag>}
        {status === "locked" && <Tag tone="lock">Užrakinta</Tag>}
        {status === "soon" && <Tag tone="lock">Netrukus</Tag>}
      </div>

      {status === "open" && (
        <div className="card mb-4 text-center">
          <Countdown target={stage.lock} label="Atsakymams pateikti liko" />
        </div>
      )}

      {stage.note && status !== "soon" && <p className="mb-4 rounded-xl bg-orange-soft px-3.5 py-2.5 text-[13px] text-orange-deep">{stage.note}</p>}

      {status === "soon" ? (
        <ComingSoon stage={stage} />
      ) : p.submission ? (
        <MyAnswers stage={stage} submission={p.submission} everyone={stageAnswers(p.league, stage.id, p.submissions)} />
      ) : status === "open" ? (
        p.pending ? (
          <PendingNotice />
        ) : (
          <AnswerForm {...p} />
        )
      ) : (
        <Empty>Šiam etapui spėjimų nepateikei.</Empty>
      )}

      {status !== "soon" && (
        <div className="card mt-4">
          <h3 className="text-xl font-extrabold uppercase">
            Pateikė {submitted.length} / {p.league.players.length}
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
          {status === "open" && <p className="mt-2 text-[13px] text-muted">Visų atsakymai bus matomi, kai etapas užsirakins.</p>}
        </div>
      )}

      {status === "locked" && <EveryonesAnswers league={p.league} stage={stage} submissions={p.submissions} me={p.player} />}
    </section>
  );
}

/** Points and, if set, when the answer is revealed. */
function Meta({ q, inline = false }: { q: Question; inline?: boolean }) {
  return (
    <span className={inline ? "ml-1 inline-flex flex-wrap items-center gap-1 align-middle" : "flex flex-none flex-col items-end gap-1"}>
      <Points value={q.points} />
      {q.reveal && (
        <span className="whitespace-nowrap rounded-full bg-purple-soft px-1.5 py-0.5 text-[11px] font-semibold text-on-purple-soft">{q.reveal}</span>
      )}
    </span>
  );
}

/* ---------- not open yet ---------- */

function ComingSoon({ stage }: { stage: Stage }) {
  return (
    <div className="card text-center">
      {stage.note && <p className="mx-auto mb-4 max-w-xl text-lg">{stage.note}</p>}
      {stage.opens ? <Countdown target={stage.opens} label="Iki atidarymo liko" /> : <p className="text-muted">Data bus paskelbta netrukus.</p>}
    </div>
  );
}

/** Big days / hours / minutes / seconds countdown to a moment, with the date underneath. */
function Countdown({ target, label }: { target: string; label: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Date.parse(target) - now);
  const parts: [number, string][] = [
    [Math.floor(left / 86_400_000), "d."],
    [Math.floor(left / 3_600_000) % 24, "val."],
    [Math.floor(left / 60_000) % 60, "min."],
    [Math.floor(left / 1000) % 60, "sek."],
  ];
  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-3 flex justify-center gap-2 sm:gap-3" role="timer" aria-live="off">
        {parts.map(([n, unit]) => (
          <div key={unit} className="w-18 rounded-xl bg-purple py-3 text-white sm:w-22">
            <div className="font-display text-4xl font-extrabold leading-none tabular-nums sm:text-5xl">{String(n).padStart(2, "0")}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider opacity-75">{unit}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">{fmtDateTime(target)}</p>
    </>
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
        <h3 className="text-2xl font-extrabold uppercase">Patikrink atsakymus</h3>
        <p className="mb-3 text-sm text-muted">Pateikus atsakymų pakeisti nebegalėsi.</p>
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
            Keisti atsakymus
          </Button>
          <Button onClick={send} disabled={saving}>
            {saving ? "Saugoma…" : "Pateikti galutinai"}
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
              <div className="flex-1">
                <p className="font-semibold">{q.text}</p>
                <div className="mt-1.5 sm:hidden">
                  <Meta q={q} inline />
                </div>
              </div>
              <div className="max-sm:hidden">
                <Meta q={q} />
              </div>
            </div>
            <div className="mt-3">
              <AnswerInput q={q} value={draft[q.id] ?? ""} onChange={(v) => onAnswer(q.id, v)} />
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3.5 shadow-lg">
        <div className="min-w-0 flex-1 text-sm">
          Atsakyta{" "}
          <b>
            {done} / {total}
          </b>
          <span className="block text-[13px] text-muted">
            {canSave ? "Atsakymai išsaugomi šiame įrenginyje, kol pildai." : "Išsaugojimas dar neįjungtas – pildyti gali, bet pateikti dar ne."}
          </span>
        </div>
        <Button onClick={() => setReviewing(true)} disabled={done < total || !canSave}>
          Peržiūrėti ir pateikti
        </Button>
      </div>
    </div>
  );
}

function AnswerInput({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  if (q.type === "team") {
    return <TeamSelect aria-label={q.text} conf={q.conf} placeholder="— pasirink komandą —" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.type === "choice" && (q.options?.length ?? 0) > 8) {
    return <TypeAhead q={q} value={value} onChange={onChange} />;
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
      placeholder={q.type === "number" ? "Tavo skaičius" : "Tavo atsakymas"}
      maxLength={200}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Type a few letters, pick from the suggestions. Only a name from the list counts as an answer. */
function TypeAhead({ q, value, onChange }: { q: Question; value: string; onChange: (v: string) => void }) {
  const options = q.options ?? [];
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const listId = `${q.id}-list`;
  const box = useRef<HTMLDivElement>(null);
  const matches = suggest(options, text);

  const choose = (o: string) => {
    setText(o);
    onChange(o);
    setOpen(false);
  };
  const type = (v: string) => {
    setText(v);
    setOpen(true);
    setHi(0);
    // Typed the full name exactly? Count it without needing a click.
    onChange(options.find((o) => simplifyName(o) === simplifyName(v)) ?? "");
  };

  return (
    <div
      ref={box}
      className="relative"
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input
        role="combobox"
        aria-label={q.text}
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Pradėk rašyti vardą…"
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(e) => type(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && matches[hi]) {
            e.preventDefault();
            choose(matches[hi]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={value ? "pr-9!" : ""}
      />
      {value && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-bold text-good">✓</span>}
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-[10px] border border-line bg-card py-1 shadow-lg">
          {matches.map((o, i) => (
            <li key={o} role="option" aria-selected={i === hi}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(o)}
                className={`block w-full px-3 py-2 text-left text-sm ${i === hi ? "bg-orange-soft" : ""}`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
      {text.trim() && !value && (
        <p className="mt-1 text-[13px] text-orange-deep">
          {matches.length ? "Pasirink vardą iš sąrašo." : "Tokio vardo sąraše nėra – pabandyk kitaip."}
        </p>
      )}
    </div>
  );
}

function PendingNotice() {
  return (
    <div className="card border-orange">
      <h3 className="text-xl font-extrabold uppercase">Siunčiami tavo atsakymai…</h3>
      <p className="mt-1 text-sm text-muted">
        Jie saugiai išsaugoti šiame įrenginyje ir bus išsiųsti, kai tik atsiras ryšys. Gali palikti puslapį atidarytą arba sugrįžti vėliau –
        iš naujo atsakinėti nereikės.
      </p>
    </div>
  );
}

/* ---------- after submitting ---------- */

function MyAnswers({ stage, submission, everyone }: { stage: Stage; submission: Submission; everyone: Answers[] }) {
  const answers = submission.answers ?? {};
  const scored = stage.questions.some((q) => q.answer != null);
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="good">Pateikta</Tag>
        <span className="text-sm text-muted">{fmtDateTime(submission.submittedAt)} · išsaugota</span>
        {scored && (
          <span className="ml-auto font-display text-2xl font-extrabold text-orange">
            {scoreAnswers(stage, submission.answers, everyone)} / {maxPoints(stage)} tšk.
          </span>
        )}
      </div>
      <ol className="mt-3 divide-y divide-line">
        {stage.questions.map((q, i) => {
          const ok = isCorrect(q, answers[q.id], everyone.map((a) => a[q.id]));
          return (
            <li key={q.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
              <span className="w-6 flex-none font-display text-lg font-bold text-orange">{i + 1}</span>
              <span className="min-w-48 flex-1 text-muted">
                {q.text}
                <Meta q={q} inline />
              </span>
              <b>{formatAnswer(q, answers[q.id])}</b>
              {ok === true && <Tag tone="good">+{q.points}</Tag>}
              {ok === false && <span className="text-[13px] text-bad">✗ {formatAnswer(q, firstAnswer(q))}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EveryonesAnswers({ league, stage, submissions, me }: { league: League; stage: Stage; submissions: Submission[]; me: string }) {
  const subs = league.players.map((name) => submissions.find((s) => s.stage === stage.id && s.player === name));
  const everyone = stageAnswers(league, stage.id, submissions);
  const th = "border-b border-line px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
  const td = "border-b border-line px-2 py-2 text-[13px] align-top";
  return (
    <div className="card mt-4 overflow-x-auto">
      <h3 className="text-xl font-extrabold uppercase">Visų atsakymai</h3>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Klausimas</th>
            <th className={th}>Teisingas</th>
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
                <b className="text-orange">{i + 1}.</b> {q.text}{" "}
                <span className="text-muted">
                  ({q.points} tšk.{q.reveal ? ` · ${q.reveal}` : ""})
                </span>
              </td>
              <td className={`${td} font-semibold`}>
                {q.answer == null ? (
                  <span className="text-muted">{q.reveal ?? "—"}</span>
                ) : (
                  <>
                    {formatAnswer(q, firstAnswer(q))}
                    {q.closest && <span className="block text-[11px] font-normal text-muted">laimi arčiausias</span>}
                  </>
                )}
              </td>
              {subs.map((s, j) => {
                const v = s?.answers?.[q.id];
                const ok = s ? isCorrect(q, v, everyone.map((a) => a[q.id])) : null;
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
              Taškai
            </td>
            {subs.map((s, j) => (
              <td key={j} className={`${td} font-bold`}>
                {s ? scoreAnswers(stage, s.answers, everyone) : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
