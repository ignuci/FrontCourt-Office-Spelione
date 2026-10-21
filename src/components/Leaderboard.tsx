import type { RankedPlayer } from "@/lib/scoring";

export function LeaderboardTable({ rows, me, compact = false }: { rows: RankedPlayer[]; me: string; compact?: boolean }) {
  const th = "border-b border-line px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted";
  const td = "border-b border-line px-2 py-2.5 text-sm";
  const num = "text-right tabular-nums";
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={th}>#</th>
          <th className={th}>Player</th>
          {!compact && (
            <>
              <th className={`${th} ${num}`}>Games</th>
              <th className={`${th} ${num}`}>Season</th>
              <th className={`${th} ${num}`}>Props</th>
              <th className={`${th} ${num}`}>Correct</th>
            </>
          )}
          <th className={`${th} ${num}`}>Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} className={p.id === me ? "bg-orange-soft" : ""}>
            <td className={`${td} font-display text-xl font-extrabold text-orange`}>{p.rank}</td>
            <td className={td}>{p.name}</td>
            {!compact && (
              <>
                <td className={`${td} ${num}`}>{p.games}</td>
                <td className={`${td} ${num}`}>{p.season}</td>
                <td className={`${td} ${num}`}>{p.props}</td>
                <td className={`${td} ${num}`}>
                  {p.gameCorrect}/{p.gameGraded}
                </td>
              </>
            )}
            <td className={`${td} ${num} font-bold`}>{p.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
