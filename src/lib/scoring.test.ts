import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { answersMatch, leaderboard, normalize, scorePlayer } from "./scoring.ts";
import {
  addGame, addPlayer, addProp, blankData, pickProp, pickWinner, setMargin, setPropAnswer, setResult,
  setSeasonPick, setSeasonResult,
} from "./state.ts";

const BEFORE = new Date("2026-10-21T12:00:00Z");

describe("normalize", () => {
  it("ignores case, accents and spacing", () => {
    assert.equal(normalize("  Nikola   JOKIĆ "), "nikola jokic");
    assert.equal(normalize("Spėlionė"), "spelione");
    assert.ok(answersMatch("Luka Dončić", "luka doncic"));
    assert.ok(!answersMatch("", ""));
  });
});

describe("scorePlayer", () => {
  it("scores game winners and the margin bonus", () => {
    let d = blankData(BEFORE);
    d = addGame(d, { when: "2026-12-25T20:00:00Z", away: "LAL", home: "GSW" });
    d = addGame(d, { when: "2026-12-26T20:00:00Z", away: "BOS", home: "NYK" });
    d = addGame(d, { when: "2026-12-27T20:00:00Z", away: "MIA", home: "ORL" });
    const [g1, g2, g3] = d.games;
    const me = d.activePlayer;
    d = setMargin(pickWinner(d, me, g1.id, "GSW", BEFORE), me, g1.id, 7, BEFORE); // right, margin off by 1 → 2 pts
    d = setMargin(pickWinner(d, me, g2.id, "BOS", BEFORE), me, g2.id, 20, BEFORE); // right, margin way off → 1 pt
    d = pickWinner(d, me, g3.id, "MIA", BEFORE); // no result yet → pending
    d = setResult(d, g1.id, { away: 100, home: 108 });
    d = setResult(d, g2.id, { away: 115, home: 110 });
    const s = scorePlayer(d, me);
    assert.equal(s.games, 3);
    assert.equal(s.gameCorrect, 2);
    assert.equal(s.gameGraded, 2);
    assert.equal(s.pending, 1);
    assert.equal(s.total, 3);
  });

  it("gives nothing for a wrong winner even with a perfect margin", () => {
    let d = addGame(blankData(BEFORE), { when: "2026-12-25T20:00:00Z", away: "LAL", home: "GSW" });
    const g = d.games[0];
    d = setMargin(pickWinner(d, d.activePlayer, g.id, "LAL", BEFORE), d.activePlayer, g.id, 8, BEFORE);
    d = setResult(d, g.id, { away: 100, home: 108 });
    assert.equal(scorePlayer(d, d.activePlayer).total, 0);
  });

  it("scores season picks and props by their points", () => {
    let d = blankData(BEFORE);
    const me = d.activePlayer;
    d = setSeasonPick(d, me, "champ", "OKC", BEFORE);
    d = setSeasonPick(d, me, "mvp", "Nikola Jokić", BEFORE);
    d = setSeasonPick(d, me, "roy", "Someone", BEFORE);
    d = setSeasonResult(d, "champ", "OKC");
    d = setSeasonResult(d, "mvp", "nikola jokic");
    d = setSeasonResult(d, "roy", "Someone Else");
    d = addProp(d, { q: "Q?", options: ["Yes", "No"], deadline: null, pts: 4 });
    d = pickProp(d, me, d.props[0].id, "Yes", BEFORE);
    d = setPropAnswer(d, d.props[0].id, "Yes");
    const s = scorePlayer(d, me);
    assert.equal(s.season, 32);
    assert.equal(s.props, 4);
    assert.equal(s.total, 36);
  });
});

describe("leaderboard", () => {
  it("orders by points and shares ranks on ties", () => {
    let d = addPlayer(addPlayer(blankData(BEFORE), "Bea"), "Cal");
    const [me, bea, cal] = d.players.map((p) => p.id);
    d = setSeasonPick(d, bea, "champ", "OKC", BEFORE);
    d = setSeasonPick(d, cal, "champ", "OKC", BEFORE);
    d = setSeasonResult(d, "champ", "OKC");
    const board = leaderboard(d);
    assert.deepEqual(board.map((r) => [r.name, r.rank, r.total]), [["Bea", 1, 20], ["Cal", 1, 20], ["Me", 3, 0]]);
    assert.equal(board[2].id, me);
  });
});
