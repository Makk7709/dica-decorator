/**
 * @fileoverview Fenêtre de modification du quota de générations d'un compte
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AdminUser, displayName } from "@/lib/admin-users";

const PRESETS = [50, 100, 200, 500, 1000];
const MAX_QUOTA = 100_000;

interface UserQuotaDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (user: AdminUser, quotaLimit: number, resetUsed: boolean) => Promise<void>;
}

export const UserQuotaDialog = ({ user, onOpenChange, onSubmit }: UserQuotaDialogProps) => {
  const [value, setValue] = useState("");
  const [resetUsed, setResetUsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setValue(String(user.quota_limit));
      setResetUsed(false);
    }
  }, [user]);

  const limit = Number(value);
  const isValid = value !== "" && Number.isInteger(limit) && limit >= 0 && limit <= MAX_QUOTA;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValid) return;
    setIsSaving(true);
    try {
      await onSubmit(user, limit, resetUsed);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quota de générations</DialogTitle>
            <DialogDescription>
              {user && `${displayName(user)} — ${user.quota_used} générations utilisées sur ${user.quota_limit}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quota-limit">Nouvelle limite</Label>
              <Input
                id="quota-limit"
                type="number"
                min={0}
                max={MAX_QUOTA}
                step={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              {!isValid && (
                <p className="text-xs text-destructive">Entier entre 0 et {MAX_QUOTA.toLocaleString("fr-FR")}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESETS.map((p) => (
                  <Button key={p} type="button" size="sm" variant={limit === p ? "default" : "outline"}
                    onClick={() => setValue(String(p))}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox id="quota-reset" checked={resetUsed} onCheckedChange={(c) => setResetUsed(c === true)} className="mt-0.5" />
              <div>
                <Label htmlFor="quota-reset" className="cursor-pointer">Remettre le compteur à zéro</Label>
                <p className="text-xs text-muted-foreground">
                  Le client retrouve l'intégralité de son quota (utile pour un renouvellement).
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={!isValid || isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserQuotaDialog;
