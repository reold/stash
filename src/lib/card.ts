export const cardHelper = {
  parseColor: (card: number): string => {
    const color = (card & 0b11_0000) >> 4;

    if (color == 0b00) return "red";
    else if (color == 0b01) return "green";
    else if (color == 0b10) return "blue";
    else if (color == 0b11) return "yellow";
    else return "pink-500";
  },
  parseType: (card: number): string => {
    const type = (card & 0b11_00_0000) >> 6;

    if (type == 0b00) return "number";
    else if (type == 0b01) return "plus2";
    else if (type == 0b10) return "plus4";
    else if (type == 0b11) return "reverse";
    else return "number";
  },
  parseNumber: (card: number): number => {
    return card & 0b1111;
  },
};
