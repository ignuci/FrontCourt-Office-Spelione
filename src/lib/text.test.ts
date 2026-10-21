import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { editDistance, namesMatch, normalize, simplifyName, suggest } from "./text.ts";

describe("normalize", () => {
  it("ignores case, accents and spacing", () => {
    assert.equal(normalize("  Nikola   JOKIĆ "), "nikola jokic");
    assert.equal(normalize("Spėlionė"), "spelione");
  });
});

describe("names", () => {
  it("drops punctuation and suffixes", () => {
    assert.equal(simplifyName("Ja'Kobi Gillespie Jr."), "jakobi gillespie");
    assert.equal(simplifyName("Trey Kaufman-Renn"), "trey kaufman renn");
  });

  it("match despite case, accents, punctuation and small typos", () => {
    assert.ok(namesMatch("Luka Dončić", "luka doncic"));
    assert.ok(namesMatch("Shai Gilgeous-Alexander", "shai gilgeous alexander"));
    assert.ok(namesMatch("Shai Gilgeous-Alexander", "Shai Gilgeus Alexandr"));
    assert.ok(namesMatch("Mikel Brown Jr.", "Mikel Brown"));
    assert.ok(namesMatch("Nikola Jokić", "Nikola Jokc"));
  });

  it("don't match different people", () => {
    assert.ok(!namesMatch("Luka Dončić", "Luka"));
    assert.ok(!namesMatch("Anthony Davis", "Anthony Edwards"));
    assert.ok(!namesMatch("Joel Embiid", ""));
  });

  it("edit distance", () => {
    assert.equal(editDistance("kitten", "sitting"), 3);
    assert.equal(editDistance("", "abc"), 3);
  });
});

describe("suggest", () => {
  const rookies = ["AJ Dybantsa", "Darryn Peterson", "Darius Acuff Jr.", "Ja'Kobi Gillespie", "Karim López", "Cameron Boozer", "Cameron Carr"];
  it("suggests by first or last name, ignoring accents and punctuation", () => {
    assert.deepEqual(suggest(rookies, "dar"), ["Darryn Peterson", "Darius Acuff Jr."]);
    assert.deepEqual(suggest(rookies, "lopez"), ["Karim López"]);
    assert.deepEqual(suggest(rookies, "jakobi"), ["Ja'Kobi Gillespie"]);
    assert.deepEqual(suggest(rookies, "cameron"), ["Cameron Boozer", "Cameron Carr"]);
    assert.deepEqual(suggest(rookies, "ooze"), ["Cameron Boozer"]);
    assert.deepEqual(suggest(rookies, ""), []);
  });
});
