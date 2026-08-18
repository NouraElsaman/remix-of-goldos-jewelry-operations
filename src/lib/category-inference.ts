export type ItemCategoryKey = "ring" | "necklace" | "bracelet" | "set" | "other";

export const ITEM_CATEGORY_LABELS: Record<ItemCategoryKey, { ar: string; en: string }> = {
  ring: { ar: "خواتم", en: "Ring" },
  necklace: { ar: "سلاسل", en: "Necklace" },
  bracelet: { ar: "أساور", en: "Bracelet" },
  set: { ar: "أطقم", en: "Set" },
  other: { ar: "أخرى", en: "Other" },
};

export function normalizeItemCategoryKey(rawCategory?: string | null): ItemCategoryKey | null {
  if (!rawCategory) return null;

  const value = rawCategory.toString().trim().toLowerCase();
  if (!value) return null;

  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0640]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\-_/]+/g, " ")
    .trim();

  const aliases: Record<string, ItemCategoryKey> = {
    ring: "ring",
    rings: "ring",
    خاتم: "ring",
    خواتم: "ring",
    bracelet: "bracelet",
    bracelets: "bracelet",
    سوار: "bracelet",
    اساور: "bracelet",
    اسورة: "bracelet",
    أسوار: "bracelet",
    necklace: "necklace",
    necklaces: "necklace",
    سلسلة: "necklace",
    سلاسل: "necklace",
    قلادة: "necklace",
    قلائد: "necklace",
    set: "set",
    sets: "set",
    طقم: "set",
    اطقم: "set",
    اقم: "set",
    other: "other",
    اخرى: "other",
    أخرى: "other",
    othercategory: "other",
  };

  return aliases[normalized] ?? null;
}

export function inferItemCategoryFromName(itemName?: string | null): ItemCategoryKey {
  if (!itemName) return "other";

  const value = itemName
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/(خاتم|خواتم|ring|rings|band)/.test(value)) return "ring";
  if (/(سلسلة|سلاسل|قلادة|قلائد|necklace|necklaces|chain)/.test(value)) return "necklace";
  if (/(سوار|أسوار|أساور|اساور|bracelet|bracelets|armlet)/.test(value)) return "bracelet";
  if (/(طقم|أطقم|اطقم|set|sets|collection|bundle)/.test(value)) return "set";

  return "other";
}

export function formatCategoryName(category: string | null | undefined, locale: "ar" | "en") {
  const normalized = normalizeItemCategoryKey(category) ?? inferItemCategoryFromName(category ?? undefined);
  return ITEM_CATEGORY_LABELS[normalized][locale];
}
