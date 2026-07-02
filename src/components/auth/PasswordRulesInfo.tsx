import { Check, X, Shield, Lock } from "lucide-react";

interface PasswordRulesInfoProps {
  password?: string;
  className?: string;
}

export const PasswordRulesInfo = ({ password = "", className = "" }: PasswordRulesInfoProps) => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const rules = [
    { label: "Au moins 8 caractères", valid: hasMinLength },
    { label: "Une majuscule", valid: hasUppercase },
    { label: "Une minuscule", valid: hasLowercase },
    { label: "Un chiffre", valid: hasDigit },
    { label: "Un caractère spécial", valid: hasSpecial },
  ];

  return (
    <div className={`space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4 text-primary" />
        <span>Règles de sécurité du mot de passe</span>
      </div>
      <ul className="space-y-2">
        {rules.map((rule) => (
          <li key={rule.label} className="flex items-center gap-2 text-xs">
            {rule.valid ? (
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            )}
            <span className={rule.valid ? "text-emerald-600" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>
          Utilisez un mot de passe unique pour Dica Decor. Ne jamais réutiliser un mot de passe
          déjà utilisé sur un autre site.
        </p>
      </div>
    </div>
  );
};
