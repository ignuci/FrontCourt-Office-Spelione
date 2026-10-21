import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { plural, sheetMessage } from "./lt.ts";

describe("plural", () => {
  const forms: [string, string, string] = ["klausimas", "klausimai", "klausimų"];
  it("uses the right Lithuanian form", () => {
    assert.equal(plural(1, forms), "1 klausimas");
    assert.equal(plural(2, forms), "2 klausimai");
    assert.equal(plural(9, forms), "9 klausimai");
    assert.equal(plural(10, forms), "10 klausimų");
    assert.equal(plural(11, forms), "11 klausimų");
    assert.equal(plural(15, forms), "15 klausimų");
    assert.equal(plural(21, forms), "21 klausimas");
    assert.equal(plural(22, forms), "22 klausimai");
    assert.equal(plural(0, forms), "0 klausimų");
  });
});

describe("sheetMessage", () => {
  it("translates the sheet's refusals", () => {
    assert.match(sheetMessage("Ruduo is locked — submissions are closed."), /užrakintas/);
    assert.match(sheetMessage("That name is not on the player list."), /sąraše/);
  });
});
