import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ActionError, InvalidFileError, addGame, addPlayer, addProp, blankData, isSeasonLocked, parseData, pickProp,
  pickWinner, removeGame, removePlayer, serialize, setMargin, setPropAnswer, setResult, setSeasonPick,
} from "./state.ts";

const BEFORE = new Date("2026-10-21T12:00:00Z");
const AFTER = new Date("2026-12-26T12:00:00Z");

function withGame() {
  const d = addGame(blankData(BEFORE), { when: "2026-12-25T20:00:00Z", away: "LAL", home: "GSW" });
  return { d, g: d.games[0], me: d.activePlayer };
}

describe("games", () => {
  it("adds a game and rejects bad matchups", () => {
    const { g } = withGame();
    assert.equal(g.away, "LAL");
    assert.equal(g.result, null);
    assert.throws(() => addGame(blankData(), { when: "2026-12-25T20:00:00Z", away: "LAL", home: "LAL" }), ActionError);
    assert.throws(() => addGame(blankData(), { when: "2026-12-25T20:00:00Z", away: "XXX", home: "LAL" }), ActionError);
    assert.throws(() => addGame(blankData(), { when: "not a date", away: "BOS", home: "LAL" }), ActionError);
  });

  it("toggles a winner pick before tip-off", () => {
    const { d, g, me } = withGame();
    const picked = pickWinner(d, me, g.id, "GSW", BEFORE);
    assert.equal(picked.gamePicks[me][g.id].winner, "GSW");
    const cleared = pickWinner(picked, me, g.id, "GSW", BEFORE);
    assert.equal(cleared.gamePicks[me][g.id].winner, null);
  });

  it("ignores picks after tip-off and for teams not in the game", () => {
    const { d, g, me } = withGame();
    assert.equal(pickWinner(d, me, g.id, "GSW", AFTER), d);
    assert.equal(pickWinner(d, me, g.id, "BOS", BEFORE), d);
    assert.equal(setMargin(d, me, g.id, 5, AFTER), d);
  });

  it("does not mutate the original data", () => {
    const { d, g, me } = withGame();
    const snapshot = serialize(d);
    pickWinner(d, me, g.id, "GSW", BEFORE);
    setMargin(d, me, g.id, 8, BEFORE);
    assert.equal(serialize(d), snapshot);
  });

  it("records results with the right winner and rejects ties", () => {
    const { d, g } = withGame();
    const done = setResult(d, g.id, { away: 110, home: 104 });
    assert.deepEqual(done.games[0].result, { away: 110, home: 104, winner: "LAL" });
    assert.throws(() => setResult(d, g.id, { away: 100, home: 100 }), ActionError);
    assert.equal(setResult(done, g.id, null).games[0].result, null);
  });

  it("removes a game together with everyone's picks on it", () => {
    const { d, g, me } = withGame();
    const gone = removeGame(pickWinner(d, me, g.id, "GSW", BEFORE), g.id);
    assert.equal(gone.games.length, 0);
    assert.equal(gone.gamePicks[me][g.id], undefined);
  });
});

describe("season picks", () => {
  it("locks after the lock date", () => {
    const d = { ...blankData(), seasonLock: "2026-11-15" };
    assert.equal(isSeasonLocked(d, BEFORE), false);
    assert.equal(isSeasonLocked(d, AFTER), true);
    assert.equal(setSeasonPick(d, d.activePlayer, "champ", "OKC", AFTER), d);
    assert.equal(setSeasonPick(d, d.activePlayer, "champ", "OKC", BEFORE).seasonPicks[d.activePlayer].champ, "OKC");
  });
});

describe("props", () => {
  it("validates and toggles answers", () => {
    assert.throws(() => addProp(blankData(), { q: " ", options: ["Yes", "No"], deadline: null, pts: 3 }), ActionError);
    assert.throws(() => addProp(blankData(), { q: "Q?", options: ["Yes", "yes "], deadline: null, pts: 3 }), ActionError);
    let d = addProp(blankData(), { q: "Trade before deadline?", options: ["Yes", "No", "Yes"], deadline: "2027-02-05", pts: 3 });
    const p = d.props[0];
    assert.deepEqual(p.options, ["Yes", "No"]);
    d = pickProp(d, d.activePlayer, p.id, "Yes", BEFORE);
    assert.equal(d.propPicks[d.activePlayer][p.id], "Yes");
    d = pickProp(d, d.activePlayer, p.id, "Yes", BEFORE);
    assert.equal(d.propPicks[d.activePlayer][p.id], undefined);
  });

  it("stops picks once decided", () => {
    let d = addProp(blankData(), { q: "Q?", options: ["A", "B"], deadline: null, pts: 2 });
    const id = d.props[0].id;
    d = setPropAnswer(d, id, "A");
    assert.equal(pickProp(d, d.activePlayer, id, "B", BEFORE), d);
    assert.equal(setPropAnswer(d, id, "nope").props[0].answer, null);
  });
});

describe("players", () => {
  it("adds, rejects duplicates and removes with their picks", () => {
    let d = addPlayer(blankData(), "Ignas");
    assert.throws(() => addPlayer(d, "ignas"), ActionError);
    const ignas = d.players[1].id;
    d = setSeasonPick(d, ignas, "mvp", "Jokić", BEFORE);
    d = { ...d, activePlayer: ignas };
    d = removePlayer(d, ignas);
    assert.equal(d.players.length, 1);
    assert.equal(d.activePlayer, d.players[0].id);
    assert.equal(d.seasonPicks[ignas], undefined);
    assert.throws(() => removePlayer(d, d.players[0].id), ActionError);
  });
});

describe("JSON files", () => {
  it("round-trips through serialize and parseData", () => {
    const { d, g, me } = withGame();
    const full = setResult(setMargin(pickWinner(d, me, g.id, "GSW", BEFORE), me, g.id, 6, BEFORE), g.id, { away: 100, home: 108 });
    assert.deepEqual(parseData(JSON.parse(serialize(full))), full);
  });

  it("rejects files that aren't ours", () => {
    assert.throws(() => parseData(null), InvalidFileError);
    assert.throws(() => parseData({ hello: "world" }), InvalidFileError);
    assert.throws(() => parseData({ players: [] }), InvalidFileError);
  });

  it("fills in missing sections and drops broken entries", () => {
    const d = parseData({
      players: [{ id: "a", name: "Ana" }],
      activePlayer: "ghost",
      games: [{ id: "g1", when: "bad date", away: "BOS", home: "NYK" }, { id: "g2", when: "2026-11-01T00:00:00Z", away: "BOS", home: "NYK" }],
      props: [{ id: "p1", q: "One option?", options: ["Only"] }],
      gamePicks: { a: { g2: { winner: "BOS", margin: "abc" } } },
    });
    assert.equal(d.activePlayer, "a");
    assert.deepEqual(d.games.map((g) => g.id), ["g2"]);
    assert.equal(d.props.length, 0);
    assert.deepEqual(d.gamePicks.a.g2, { winner: "BOS", margin: null });
    assert.deepEqual(d.seasonPicks, {});
  });
});
