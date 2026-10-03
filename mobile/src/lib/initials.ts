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
