export interface StoreTheme {
  primaryColor: string;
  font: "Inter" | "Geist" | "Bricolage Grotesque" | "Schibsted Grotesk" | "system-ui";
  layout: "grid" | "list";
  navbarStyle: "light" | "dark" | "gradient";
  gridColumns: 2 | 3 | 4;
  showCategories: boolean;
  hero: { headline: string; subtitle: string; imageUrl: string };
}

export const DEFAULT_THEME: StoreTheme = {
  primaryColor: "#B4401F",
  font: "Bricolage Grotesque",
  layout: "grid",
  navbarStyle: "light",
  gridColumns: 3,
  showCategories: true,
  hero: {
    headline: "Welcome to our store",
    subtitle: "Discover our latest products",
    imageUrl: "",
  },
};

const FONTS: StoreTheme["font"][] = [
  "Inter",
  "Geist",
  "Bricolage Grotesque",
  "Schibsted Grotesk",
  "system-ui",
];
const LAYOUTS: StoreTheme["layout"][] = ["grid", "list"];
const NAVBAR_STYLES: StoreTheme["navbarStyle"][] = ["light", "dark", "gradient"];
const GRID_COLUMNS: StoreTheme["gridColumns"][] = [2, 3, 4];

export function normalizeTheme(theme: Partial<StoreTheme> | null | undefined): StoreTheme {
  const source = theme && typeof theme === "object" ? theme : {};

  return {
    primaryColor:
      typeof source.primaryColor === "string" && source.primaryColor.trim()
        ? source.primaryColor
        : DEFAULT_THEME.primaryColor,
    font: FONTS.includes(source.font as StoreTheme["font"])
      ? (source.font as StoreTheme["font"])
      : DEFAULT_THEME.font,
    layout: LAYOUTS.includes(source.layout as StoreTheme["layout"])
      ? (source.layout as StoreTheme["layout"])
      : DEFAULT_THEME.layout,
    navbarStyle: NAVBAR_STYLES.includes(source.navbarStyle as StoreTheme["navbarStyle"])
      ? (source.navbarStyle as StoreTheme["navbarStyle"])
      : DEFAULT_THEME.navbarStyle,
    gridColumns: GRID_COLUMNS.includes(source.gridColumns as StoreTheme["gridColumns"])
      ? (source.gridColumns as StoreTheme["gridColumns"])
      : DEFAULT_THEME.gridColumns,
    showCategories:
      typeof source.showCategories === "boolean" ? source.showCategories : DEFAULT_THEME.showCategories,
    hero: {
      headline:
        typeof source.hero?.headline === "string" && source.hero.headline.trim()
          ? source.hero.headline
          : DEFAULT_THEME.hero.headline,
      subtitle:
        typeof source.hero?.subtitle === "string" && source.hero.subtitle.trim()
          ? source.hero.subtitle
          : DEFAULT_THEME.hero.subtitle,
      imageUrl:
        typeof source.hero?.imageUrl === "string" ? source.hero.imageUrl : DEFAULT_THEME.hero.imageUrl,
    },
  };
}
