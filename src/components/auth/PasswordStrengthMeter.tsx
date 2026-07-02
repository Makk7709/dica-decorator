import { useEffect, useState } from "react";
import { Check, X, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import {
  evaluatePassword,
  passwordScore,
  checkPwnedPassword,
  type PasswordCriteria,
} from "@/lib/password-strength";

interface Props {
  password: string;
  /** Called with true when the password meets all local criteria AND is not pwned. */
  onValidityChange?: (isValid: boolean, pwnedCount: number | null) => void;
}

const CRITERIA: Array<{ key: keyof PasswordCriteria; label: string }> = [
  { key: "length", label: "8 caractères minimum" },
  { key: "upper", label: "Une majuscule" },
  { key: "lower", label: "Une minuscule" },
  { key: "digit", label: "Un chiffre" },
  { key: "special", label: "Un caractère spécial" },
];

export function PasswordStrengthMeter({ password, onValidityChange }: Props) {
  const criteria = evaluatePassword(password);
  const score = passwordScore(criteria);
  const allMet = score === 5;

  const [pwnedCount, setPwnedCount] = useState<number | null>(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!password || !allMet) {
      setPwnedCount(0);
      setChecking(false);
      onValidityChange?.(false, 0);
      return;
    }
    const ctrl = new AbortController();
    setChecking(true);
    const timer = setTimeout(async () => {
      const count = await checkPwnedPassword(password, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setPwnedCount(count);
      setChecking(false);
      // If check failed (null) we still allow submission — server-side HIBP will catch it.
      const isValid = allMet && (count === 0 || count === null);
      onValidityChange?.(isValid, count);
    }, 400);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, allMet]);

  if (!password) return null;

  const barColor =
    score <= 2 ? "bg-destructive" : score <= 4 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${barColor}`}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className="text-muted-foreground tabular-nums">{score}/5</span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {CRITERIA.map(({ key, label }) => {
          const ok = criteria[key];
          return (
            <li
              key={key}
              className={`flex items-center gap-1.5 ${
                ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}
            >
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      {allMet && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
          {checking ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Vérification de sécurité…</span>
            </>
          ) : pwnedCount && pwnedCount > 0 ? (
            <>
              <ShieldAlert className="h-3 w-3 text-destructive" />
              <span className="text-destructive">
                Ce mot de passe apparaît dans une fuite de données connue. Choisissez-en un autre.
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">
                Mot de passe conforme et non compromis.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
