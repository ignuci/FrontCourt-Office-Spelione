import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isCorrect, maxPoints, scoreAnswers, stageStatus, standings, validateLeague,
  type League, type Question, type Stage,
} from "./league.ts";

const real = JSON.parse(readFileSync(new URL("../../public/league.json", import.meta.url), "utf8")) as League;

const q = (over: Partial<Question>): Question => ({ id: "q", type: "text", text: "Q?", points: 2, answer: null, ...over });

function stage(questions: Question[], lock = "2026-11-01T00:00:00+03:00"): Stage {
  return { id: "s1", name: "Test", lock, questions };
}

describe("league.json", () => {
  it("is valid", () => {
    assert.deepEqual(validateLeague(real), []);
  });

  it("Ruduo has 15 questions, season-long ones last", () => {
    const r = real.stages[0].questions;
    assert.equal(r.length, 15);
    const firstSeason = r.findIndex((x) => x.reveal === "Reguliarus sezonas");
    assert.ok(firstSeason > 0 && r.slice(firstSeason).every((x) => x.reveal === "Reguliarus sezonas"));
  });

  it("has the four stages in order", () => {
    assert.deepEqual(real.stages.map((s) => s.name), ["Ruduo", "Kalėdos", "All-Star", "Pavasaris"]);
  });

  it("has lock dates in order", () => {
    const locks = real.stages.map((s) => Date.parse(s.lock));
    assert.deepEqual([...locks].sort((a, b) => a - b), locks);
  });
});

describe("validateLeague", () => {
  it("catches common mistakes", () => {
    const bad: League = {
      season: "x",
      sheetUrl: "",
      players: ["Ana", "ana"],
      stages: [
        stage([
          q({ id: "a", type: "team", answer: "XYZ" }),
          q({ id: "a", type: "choice", options: ["Yes"], answer: "Maybe" }),
          q({ id: "c", points: 0, closest: true }),
          q({ id: "d", type: "choice", options: ["Taip", "Taip"] }),
        ]),
      ],
    };
    const errors = validateLeague(bad).join("\n");
    assert.match(errors, /Duplicate player/);
    assert.match(errors, /duplicate question id/);
    assert.match(errors, /not a team code/);
    assert.match(errors, /at least two options/);
    assert.match(errors, /not one of the options/);
    assert.match(errors, /points must be more than 0/);
    assert.match(errors, /only works for number questions/);
    assert.match(errors, /same option twice/);
  });
});

describe("isCorrect", () => {
  it("is null until the answer is known", () => {
    assert.equal(isCorrect(q({}), "anything"), null);
  });
  it("matches teams and choices exactly", () => {
    assert.equal(isCorrect(q({ type: "team", answer: "OKC" }), "OKC"), true);
    assert.equal(isCorrect(q({ type: "team", answer: "OKC" }), "BOS"), false);
    assert.equal(isCorrect(q({ type: "choice", options: ["Yes", "No"], answer: "No" }), "No"), true);
  });
  it("matches open answers ignoring case and accents, with alternative spellings", () => {
    const mvp = q({ answer: ["Nikola Jokić", "Jokic"] });
    assert.equal(isCorrect(mvp, "  nikola JOKIC "), true);
    assert.equal(isCorrect(mvp, "jokić"), true);
    assert.equal(isCorrect(mvp, "Luka"), false);
    assert.equal(isCorrect(mvp, ""), false);
    assert.equal(isCorrect(mvp, undefined), false);
  });
  it("uses the tolerance for numbers", () => {
    const wins = q({ type: "number", tolerance: 1, answer: "17" });
    assert.equal(isCorrect(wins, "16"), true);
    assert.equal(isCorrect(wins, "18"), true);
    assert.equal(isCorrect(wins, "19"), false);
    assert.equal(isCorrect(wins, "lots"), false);
    assert.equal(isCorrect(q({ type: "number", answer: "5" }), "5"), true);
  });
});

describe("closest guess", () => {
  const wins = q({ type: "number", closest: true, answer: "17" });
  it("gives the points to the nearest guess, and to everyone tied for nearest", () => {
    const all = ["12", "15", "19", "30", undefined];
    assert.equal(isCorrect(wins, "15", all), true);
    assert.equal(isCorrect(wins, "19", all), true);
    assert.equal(isCorrect(wins, "12", all), false);
    assert.equal(isCorrect(wins, "30", all), false);
  });
  it("a lone guess is the closest even if far off", () => {
    assert.equal(isCorrect(wins, "40", ["40"]), true);
  });
  it("accepts a comma as a decimal point", () => {
    assert.equal(isCorrect(q({ type: "number", answer: "2.5" }), "2,5"), true);
  });
  it("works through standings", () => {
    const s = stage([wins]);
    const league: League = { season: "x", sheetUrl: "", players: ["Ana", "Bo", "Cy"], stages: [s] };
    const rows = standings(league, [
      { player: "Ana", stage: "s1", submittedAt: "", answers: { q: "16" } },
      { player: "Bo", stage: "s1", submittedAt: "", answers: { q: "18" } },
      { player: "Cy", stage: "s1", submittedAt: "", answers: { q: "10" } },
    ]);
    assert.deepEqual(rows.map((r) => [r.player, r.total]), [["Ana", 2], ["Bo", 2], ["Cy", 0]]);
  });
});

describe("scoring and standings", () => {
  const s = stage([
    q({ id: "a", type: "team", points: 5, answer: "OKC" }),
    q({ id: "b", points: 3, answer: "Jokic" }),
    q({ id: "c", points: 2, answer: null }),
  ]);

  it("adds up points for right answers only", () => {
    assert.equal(scoreAnswers(s, { a: "OKC", b: "jokić", c: "x" }), 8);
    assert.equal(scoreAnswers(s, { a: "BOS", b: "Jokic" }), 3);
    assert.equal(scoreAnswers(s, null), 0);
    assert.equal(maxPoints(s), 10);
  });

  it("ranks the league's players, including ones who didn't submit", () => {
    const league: League = { season: "x", sheetUrl: "", players: ["Ana", "Bo", "Cy"], stages: [s] };
    const rows = standings(league, [
      { player: "Ana", stage: "s1", submittedAt: "", answers: { a: "OKC" } },
      { player: "Bo", stage: "s1", submittedAt: "", answers: { a: "OKC", b: "Jokic" } },
      { player: "Stranger", stage: "s1", submittedAt: "", answers: { a: "OKC", b: "Jokic" } },
    ]);
    assert.deepEqual(rows.map((r) => [r.player, r.total, r.rank]), [["Bo", 8, 1], ["Ana", 5, 2], ["Cy", 0, 3]]);
    assert.equal(rows[2].byStage.s1, null);
  });

  it("shares ranks on ties", () => {
    const league: League = { season: "x", sheetUrl: "", players: ["Ana", "Bo"], stages: [s] };
    const rows = standings(league, []);
    assert.deepEqual(rows.map((r) => r.rank), [1, 1]);
  });
});

describe("stageStatus", () => {
  const now = new Date("2026-10-25T12:00:00+03:00");
  it("is soon without questions or before opening, open before lock, locked after", () => {
    assert.equal(stageStatus(stage([]), now), "soon");
    assert.equal(stageStatus({ ...stage([q({})]), opens: "2026-10-26T00:00:00+03:00" }, now), "soon");
    assert.equal(stageStatus(stage([q({})]), now), "open");
    assert.equal(stageStatus(stage([q({})], "2026-10-25T11:00:00+03:00"), now), "locked");
  });
});
