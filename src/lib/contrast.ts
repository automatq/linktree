/**
 * Returns "white" or "black" depending on which has better contrast
 * against the given hex color. Uses WCAG relative luminance formula.
 */
export function contrastText(hex: string): "#ffffff" | "#000000" {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  // sRGB -> linear
  const lr = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
  const lg = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
  const lb = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  return luminance > 0.179 ? "#000000" : "#ffffff";
}
