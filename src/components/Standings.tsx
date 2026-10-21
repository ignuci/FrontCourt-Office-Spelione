import { maxPoints, standings, stageStatus, type League, type Submission } from "@/lib/league";
import { SectionHead } from "./ui";

export function Standings({ league, submissions, me, now }: { league: League; submissions: Submission[]; me: string | null; now: Date }) {
  const rows = standings(league, submissions);
  const th = "border-b border-line px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "border-b border-line px-2 py-2.5 text-sm";
  const anyScored = league.stages.some((s) => s.questions.some((q) => q.answer != null));

  return (
    <section>
      <SectionHead title="Turnyrinė lentelė">
        Taškai skaičiuojami, kai paaiškėja teisingi atsakymai.
      </SectionHead>
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} text-left`}>#</th>
              <th className={`${th} text-left`}>Žaidėjas</th>
              {league.stages.map((s) => (
                <th key={s.id} className={`${th} text-right`}>
                  {s.name}
                  {s.questions.length > 0 && <span className="block font-normal normal-case tracking-normal">iš {maxPoints(s)}</span>}
                </th>
              ))}
              <th className={`${th} text-right`}>Iš viso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player} className={r.player === me ? "bg-orange-soft" : ""}>
                <td className={`${td} font-display text-xl font-extrabold text-orange`}>{r.rank}</td>
                <td className={`${td} font-semibold`}>{r.player}</td>
                {league.stages.map((s) => {
                  const v = r.byStage[s.id];
                  const status = stageStatus(s, now);
                  return (
                    <td key={s.id} className={`${td} text-right tabular-nums`}>
                      {v == null ? (
                        <span className="text-muted">{status === "open" ? "…" : "—"}</span>
                      ) : status === "open" ? (
                        <span className="font-semibold text-good" title="Pateikė">✓</span>
                      ) : (
                        v
                      )}
                    </td>
                  );
                })}
                <td className={`${td} text-right text-base font-bold tabular-nums`}>{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[13px] text-muted">
          {anyScored ? "" : "Teisingų atsakymų dar nėra, todėl visi turi 0. "}
          ✓ – pateikė, taškai paaiškės vėliau · „…“ – dar nepateikė · „—“ – nedalyvavo.
        </p>
      </div>
    </section>
  );
}
