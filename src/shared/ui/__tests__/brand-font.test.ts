/// <reference types="jest" />
import { brandFont, brandFontFamily } from "../brand-font";
test.each([[undefined, "Poppins-Regular"], ["400", "Poppins-Regular"], ["500", "Poppins-Medium"], ["600", "Poppins-SemiBold"], ["bold", "Poppins-Bold"], ["900", "Poppins-Bold"]])("maps font weight %s to a bundled family", (weight, family) => {
  expect(brandFont(weight)).toBe(family);
});
test("web font stack falls back to sans-serif for glyphs outside bundled Poppins, including peso", () => {
  expect(brandFontFamily("700", "web")).toBe("Poppins-Bold, system-ui, -apple-system, sans-serif");
  expect(brandFontFamily("700", "android")).toBe("Poppins-Bold");
});
