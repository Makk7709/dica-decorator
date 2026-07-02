// Password strength utilities + HIBP k-anonymity check (no password ever leaves the client in full)

export interface PasswordCriteria {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
}

export function evaluatePassword(pwd: string): PasswordCriteria {
  return {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    digit: /\d/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };
}

export function passwordScore(c: PasswordCriteria): number {
  return Object.values(c).filter(Boolean).length;
}

export function allCriteriaMet(c: PasswordCriteria): boolean {
  return passwordScore(c) === 5;
}

/**
 * Check the password against Have I Been Pwned using k-anonymity.
 * Only the first 5 chars of the SHA-1 hash are ever transmitted.
 * Returns the number of times the password appears in known breaches (0 = safe).
 * Returns null if the check could not be performed (offline / rate limited).
 */
export async function checkPwnedPassword(
  pwd: string,
  signal?: AbortSignal
): Promise<number | null> {
  if (!pwd) return 0;
  try {
    const enc = new TextEncoder().encode(pwd);
    const buf = await crypto.subtle.digest("SHA-1", enc);
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: { "Add-Padding": "true" },
      signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    for (const line of text.split("\n")) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix) {
        return Number.parseInt(countStr, 10) || 1;
      }
    }
    return 0;
  } catch {
    return null;
  }
}
