/** First letter of first + last name, falling back to the first letter of an email. */
export function initialsFor(firstName: string | null, lastName: string | null, email?: string): string {
  const first = firstName?.trim()?.charAt(0) ?? '';
  const last = lastName?.trim()?.charAt(0) ?? '';
  const combined = `${first}${last}`.toUpperCase();
  if (combined) {
    return combined;
  }
  return (email?.trim()?.charAt(0) ?? '?').toUpperCase();
}

/** Up to two initials from a single combined display name (e.g. "Mariam Adel" -> "MA").
 *  For call sites that only have a server-combined full name (not separate first/last
 *  fields) — see CompanyApplicationListItem.applicantName. */
export function initialsForName(name: string | null): string {
  if (!name) {
    return '?';
  }
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0));
  const combined = letters.join('').toUpperCase();
  return combined || '?';
}
