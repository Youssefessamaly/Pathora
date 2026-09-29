export type ParsedLocalDate = { iso: string; error: null } | { iso: null; error: string };

/**
 * Parses a day/month/year triplet (as typed into three separate inputs) into an ISO
 * YYYY-MM-DD string, or an error message. Mirrors the date-of-birth parsing already used
 * by intern onboarding, generalized for reuse and with an optional "not in the past" check.
 */
export function parseLocalDateParts(
  day: string,
  month: string,
  year: string,
  options?: { notInPast?: boolean },
): ParsedLocalDate {
  if (!day || !month || !year || year.length < 4) {
    return { iso: null, error: 'Enter a full date.' };
  }

  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);

  const candidate = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
  const isRealDate =
    candidate.getUTCFullYear() === yearNum &&
    candidate.getUTCMonth() === monthNum - 1 &&
    candidate.getUTCDate() === dayNum;

  if (!isRealDate) {
    return { iso: null, error: 'Enter a valid date.' };
  }

  if (options?.notInPast) {
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (candidate.getTime() < todayUtc) {
      return { iso: null, error: 'Date must not be in the past.' };
    }
  }

  const iso = `${yearNum.toString().padStart(4, '0')}-${monthNum.toString().padStart(2, '0')}-${dayNum
    .toString()
    .padStart(2, '0')}`;

  return { iso, error: null };
}

/** Splits an ISO YYYY-MM-DD string back into day/month/year parts for prefilling a form. */
export function splitIsoDate(iso: string | null | undefined): { day: string; month: string; year: string } {
  if (!iso) {
    return { day: '', month: '', year: '' };
  }
  const [year, month, day] = iso.split('-');
  return { day: day ?? '', month: month ?? '', year: year ?? '' };
}

/** Formats an ISO YYYY-MM-DD string for display, falling back to the raw string if parsing fails. */
export function formatDisplayDate(iso: string): string {
  try {
    const date = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return iso;
  }
}
