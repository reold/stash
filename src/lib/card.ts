/**
 * Card encoding.
 *
 * A card is a single number: `[7:6]` type, `[5:4]` colour, `[3:0]` number.
 * Everything that touches those bits lives here — components never do bit math.
 */

export const CardColor = {
  Red: 0b00,
  Green: 0b01,
  Blue: 0b10,
  Yellow: 0b11,
} as const;
export type CardColorValue = (typeof CardColor)[keyof typeof CardColor];

export const CardType = {
  Number: 0b00,
  Plus2: 0b01,
  Plus4: 0b10,
  Reverse: 0b11,
} as const;
export type CardTypeValue = (typeof CardType)[keyof typeof CardType];

/** What the server is asked to do with `POST /<game>/action`. */
export const ActionType = {
  /** play a card, `card` holds the encoded card */
  Play: 0,
  /** pull a card from the stash */
  Take: 1,
  /** pay off the cards you owe */
  Settle: 2,
} as const;

const TYPE_SHIFT = 6;
const COLOR_SHIFT = 4;
const NUMBER_MASK = 0b1111;
const FIELD_MASK = 0b11;

export const cardType = (card: number): CardTypeValue =>
  ((card >> TYPE_SHIFT) & FIELD_MASK) as CardTypeValue;

export const cardColor = (card: number): CardColorValue =>
  ((card >> COLOR_SHIFT) & FIELD_MASK) as CardColorValue;

export const cardNumber = (card: number): number => card & NUMBER_MASK;

/** A +4 wild: the server sends the type and the highest number, colour unset. */
export const isWild = (card: number): boolean => cardType(card) === CardType.Plus4;

/**
 * Wilds travel back to the server carrying the colour the player picked:
 * `(type << 6) | (colour << 4) | 1111`.
 */
export const encodeWildWithColor = (card: number, color: CardColorValue): number =>
  (cardType(card) << TYPE_SHIFT) | (color << COLOR_SHIFT) | NUMBER_MASK;

const COLOR_NAMES = ["red", "green", "blue", "yellow"] as const;
const COLOR_VALUES = Object.values(CardColor);

export const cardColorName = (color: CardColorValue): string =>
  COLOR_NAMES[color] ?? "nocolor";

export const cardColorValue = (name: string): CardColorValue | undefined => {
  const index = COLOR_NAMES.indexOf(name as (typeof COLOR_NAMES)[number]);
  return index === -1 ? undefined : COLOR_VALUES[index];
};

const LABELS: Record<CardTypeValue, string> = {
  [CardType.Number]: "",
  [CardType.Plus2]: "+2",
  [CardType.Plus4]: "+4",
  [CardType.Reverse]: "rev",
};

/** What is printed on the card face. */
export const cardLabel = (card: number): string => {
  const type = cardType(card);
  return type === CardType.Number ? String(cardNumber(card)) : LABELS[type];
};

/**
 * The colour a card is drawn in. Wilds are marked in the deck as a +4 with the
 * number 15, and keep whichever colour bits they arrived with (the colour the
 * player picked is only known to the server), hence the 15 special case.
 */
export const cardDisplayColor = (card: number): string => {
  if (cardNumber(card) === NUMBER_MASK || !isWild(card)) {
    return cardColorName(cardColor(card));
  }
  return "nocolor";
};
