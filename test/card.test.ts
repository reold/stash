import { describe, expect, it } from "vitest";

import {
  CardColor,
  CardType,
  cardColor,
  cardColorName,
  cardColorValue,
  cardDisplayColor,
  cardLabel,
  cardNumber,
  cardType,
  encodeWildWithColor,
  isWild,
} from "$lib/card";

const RED_5 = 5;
const WILD = 0b10_00_1111;
const BLUE_PLUS2 = 0b01_10_0000;

describe("card encoding", () => {
  it("reads type, colour and number out of the bitfield", () => {
    expect(cardType(BLUE_PLUS2)).toBe(CardType.Plus2);
    expect(cardColor(BLUE_PLUS2)).toBe(CardColor.Blue);
    expect(cardNumber(BLUE_PLUS2)).toBe(0);

    expect(cardType(RED_5)).toBe(CardType.Number);
    expect(cardColor(RED_5)).toBe(CardColor.Red);
    expect(cardNumber(RED_5)).toBe(5);
  });

  it("labels cards the way they are printed on the card face", () => {
    expect(cardLabel(RED_5)).toBe("5");
    expect(cardLabel(BLUE_PLUS2)).toBe("+2");
    expect(cardLabel(0b11_11_0000)).toBe("rev");
    expect(cardLabel(WILD)).toBe("+4");
  });

  it("knows wilds", () => {
    expect(isWild(WILD)).toBe(true);
    expect(isWild(RED_5)).toBe(false);
  });

  it("encodes the colour a player picked for a wild", () => {
    const blue = encodeWildWithColor(WILD, CardColor.Blue);

    expect(blue).toBe(0b10_10_1111);
    expect(cardType(blue)).toBe(CardType.Plus4);
    expect(cardNumber(blue)).toBe(0b1111);
    expect(cardColor(blue)).toBe(CardColor.Blue);
  });

  it("does not repeat the old off-by-one arithmetic", () => {
    // the inline arithmetic used to be `card += colour << 4; card += 0b1111`,
    // which added the wild's number (already 0b1111) a second time: the colour
    // land ended up one slot off and picking yellow sent a *reverse* instead
    const old = (selection: number) => WILD + (selection << 4) + 0b1111;

    expect(cardColor(old(CardColor.Red))).toBe(CardColor.Green);
    expect(cardType(old(CardColor.Yellow))).toBe(CardType.Reverse);

    for (const selection of Object.values(CardColor)) {
      const encoded = encodeWildWithColor(WILD, selection);
      expect(cardType(encoded)).toBe(CardType.Plus4);
      expect(cardColor(encoded)).toBe(selection);
      expect(cardNumber(encoded)).toBe(0b1111);
    }
  });

  it("maps colour names both ways", () => {
    expect(cardColorName(CardColor.Yellow)).toBe("yellow");
    expect(cardColorValue("green")).toBe(CardColor.Green);
    expect(cardColorValue("chartreuse")).toBeUndefined();
    expect(cardColorName(9 as never)).toBe("nocolor");
  });

  it("draws wilds in the colour the deck marked them with", () => {
    expect(cardDisplayColor(BLUE_PLUS2)).toBe("blue");
    expect(cardDisplayColor(RED_5)).toBe("red");
    // wilds are stored with the number 15, so they keep their colour bits
    expect(cardDisplayColor(WILD)).toBe("red");
  });
});
