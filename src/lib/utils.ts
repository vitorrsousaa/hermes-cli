/**
 * Converts text to a URL-safe slug: lowercase, remove accents,
 * replace spaces/special chars with hyphens, truncate at 50 chars.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim hyphens
    .slice(0, 50);
}
