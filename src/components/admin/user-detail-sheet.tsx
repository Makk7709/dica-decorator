/**
 * @fileoverview Fiche détaillée d'un compte client
 */

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type AdminUser, displayName, quotaRatio } from "@/lib/admin-users";

interface UserDetailSheetProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

const formatDate = (iso: string | null) =>
  iso
    ? `${new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} (${formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr })})`
    : "Jamais";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value || "—"}</span>
  </div>
);

export const UserDetailSheet = ({ user, onOpenChange, children }: UserDetailSheetProps) => (
  <Sheet open={!!user} onOpenChange={onOpenChange}>
    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
      {user && (
        <>
          <SheetHeader>
            <SheetTitle>{displayName(user)}</SheetTitle>
            <SheetDescription>{user.email}</SheetDescription>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant={user.is_active ? "default" : "secondary"}>{user.is_active ? "Actif" : "Désactivé"}</Badge>
              <Badge variant="outline">{user.role === "admin" ? "Administrateur" : "Client"}</Badge>
              {!user.email_confirmed && <Badge variant="destructive">Email non confirmé</Badge>}
              {user.providers.includes("google") && <Badge variant="outline">Google</Badge>}
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <section>
              <h4 className="mb-1 text-sm font-semibold">Coordonnées</h4>
              <Row label="Société" value={user.company_name} />
              <Row label="Téléphone" value={user.phone} />
              <Row label="Ville" value={user.city} />
            </section>

            <Separator />

            <section>
              <h4 className="mb-1 text-sm font-semibold">Activité</h4>
              <Row label="Inscrit le" value={formatDate(user.created_at)} />
              <Row label="Dernière connexion" value={formatDate(user.last_sign_in_at)} />
              <Row label="Projets" value={String(user.project_count)} />
              <Row label="Co-branding PDF" value={user.cobranding_enabled ? "Activé" : "Désactivé"} />
            </section>

            <Separator />

            <section>
              <h4 className="mb-2 text-sm font-semibold">Quota de générations</h4>
              <Progress value={Math.min(100, quotaRatio(user) * 100)} />
              <p className="mt-2 text-sm text-muted-foreground">
                {user.quota_used} utilisées sur {user.quota_limit} ·{" "}
                {Math.max(0, user.quota_limit - user.quota_used)} restantes
              </p>
            </section>

            {children && (
              <>
                <Separator />
                <section className="flex flex-wrap gap-2">{children}</section>
              </>
            )}
          </div>
        </>
      )}
    </SheetContent>
  </Sheet>
);

export default UserDetailSheet;
