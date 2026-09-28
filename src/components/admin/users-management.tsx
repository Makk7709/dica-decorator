/**
 * @fileoverview Gestion des comptes clients (onglet Utilisateurs de /admin)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CheckCircle, Download, Eye, Gauge, KeyRound, MailWarning, MoreHorizontal, Moon, Palette, RefreshCw,
  Search, Shield, ShieldCheck, Trash2, UserCheck, Users, UserX, IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  type AdminUser, type UserFilter, type UserSort, FILTER_LABELS, SORT_LABELS,
  displayName, quotaRatio, selectUsers, summarize, usersToCsv,
} from "@/lib/admin-users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserProjectsDialog } from "./user-projects-dialog";
import { UserQuotaDialog } from "./user-quota-dialog";
import { UserDetailSheet } from "./user-detail-sheet";

const PAGE_SIZE = 25;

interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

async function callAdmin<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("get-users-admin", { body: { action, ...payload } });
  if (error) {
    // Le message métier est dans le corps de la réponse HTTP (4xx/5xx).
    const context = (error as { context?: Response }).context;
    const body = await context?.json?.().catch(() => null);
    throw new Error(body?.error ?? error.message);
  }
  return data as T;
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

const relative = (iso: string | null) =>
  iso ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr }) : "Jamais";

const SUMMARY: Array<{ filter: UserFilter; icon: typeof Users; color: string }> = [
  { filter: "all", icon: Users, color: "text-primary" },
  { filter: "active", icon: UserCheck, color: "text-green-500" },
  { filter: "unconfirmed", icon: MailWarning, color: "text-orange-500" },
  { filter: "quota", icon: Gauge, color: "text-red-500" },
  { filter: "dormant", icon: Moon, color: "text-blue-500" },
  { filter: "disabled", icon: UserX, color: "text-muted-foreground" },
];

const QuotaCell = ({ user }: { user: AdminUser }) => {
  const ratio = Math.min(100, quotaRatio(user) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full", ratio >= 90 ? "bg-red-500" : ratio >= 70 ? "bg-orange-400" : "bg-green-500")}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{user.quota_used}/{user.quota_limit}</span>
    </div>
  );
};

export const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [sort, setSort] = useState<UserSort>("recent");
  const [page, setPage] = useState(0);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [quotaUser, setQuotaUser] = useState<AdminUser | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [projectsUser, setProjectsUser] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await callAdmin<{ users: AdminUser[] }>("list_users");
      setUsers(data.users ?? []);
    } catch (e) {
      toast.error(errorMessage(e, "Erreur lors du chargement des utilisateurs"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => setPage(0), [search, filter, sort]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [users]);
  const counts = useMemo(() => summarize(users, now), [users, now]);
  const visible = useMemo(() => selectUsers(users, { search, filter, sort, now }), [users, search, filter, sort, now]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageUsers = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const detailUser = users.find((u) => u.id === detailUserId) ?? null;

  const patchUser = (id: string, patch: Partial<AdminUser>) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const removeUser = (id: string) => setUsers((prev) => prev.filter((u) => u.id !== id));

  const run = async (fn: () => Promise<void>, fallback: string) => {
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e, fallback));
    }
  };

  // --- Actions --------------------------------------------------------------

  const toggleActive = (u: AdminUser) => {
    const doIt = () => run(async () => {
      const res = await callAdmin<{ is_active: boolean }>("toggle_active", { userId: u.id });
      patchUser(u.id, { is_active: res.is_active });
      toast.success(res.is_active ? "Compte réactivé" : "Compte désactivé : connexion bloquée");
    }, "Erreur lors de la mise à jour du compte");

    if (!u.is_active) return void doIt();
    setPendingConfirm({
      title: `Désactiver ${displayName(u)} ?`,
      description: "Le client sera déconnecté et ne pourra plus se connecter ni générer de rendus. Ses projets sont conservés et le compte peut être réactivé à tout moment.",
      confirmLabel: "Désactiver",
      destructive: true,
      run: doIt,
    });
  };

  const changeRole = (u: AdminUser) => {
    const role = u.role === "admin" ? "client" : "admin";
    setPendingConfirm({
      title: role === "admin" ? `Donner les droits administrateur à ${displayName(u)} ?` : `Retirer les droits administrateur de ${displayName(u)} ?`,
      description: role === "admin"
        ? "Cet utilisateur aura accès à toute l'administration : comptes clients, catalogue, analytics."
        : "Cet utilisateur redeviendra un client standard.",
      confirmLabel: role === "admin" ? "Passer administrateur" : "Repasser client",
      destructive: role === "admin",
      run: () => run(async () => {
        await callAdmin("update_role", { userId: u.id, role });
        patchUser(u.id, { role });
        toast.success(`Rôle mis à jour : ${role === "admin" ? "Administrateur" : "Client"}`);
      }, "Erreur lors de la mise à jour du rôle"),
    });
  };

  const deleteUser = (u: AdminUser) => {
    setPendingConfirm({
      title: `Supprimer définitivement ${displayName(u)} ?`,
      description: `Le compte ${u.email} et tous ses projets, photos et rendus seront supprimés. Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
      destructive: true,
      run: () => run(async () => {
        await callAdmin("delete_user", { userId: u.id });
        removeUser(u.id);
        setDetailUserId(null);
        toast.success(`Compte ${u.email} supprimé`);
      }, "Erreur lors de la suppression"),
    });
  };

  const toggleCobranding = (u: AdminUser) => run(async () => {
    const res = await callAdmin<{ cobranding_enabled: boolean }>("toggle_cobranding", { userId: u.id });
    patchUser(u.id, { cobranding_enabled: res.cobranding_enabled });
    toast.success(res.cobranding_enabled ? "Co-branding activé" : "Co-branding désactivé");
  }, "Erreur lors de la mise à jour du co-branding");

  const confirmEmail = (u: AdminUser) => run(async () => {
    await callAdmin("confirm_user", { userId: u.id });
    patchUser(u.id, { email_confirmed: true });
    toast.success(`Email confirmé pour ${u.email}`);
  }, "Erreur lors de la confirmation");

  const sendPasswordReset = (u: AdminUser) => run(async () => {
    const res = await callAdmin<{ googleOnly?: boolean }>("send_password_reset", { userId: u.id });
    toast.success(
      res.googleOnly
        ? "Lien envoyé. Attention : ce client s'est inscrit avec Google, il peut aussi simplement utiliser « Continuer avec Google »."
        : "Lien de réinitialisation envoyé au client.",
      { duration: 8000 },
    );
  }, "Impossible d'envoyer le lien de réinitialisation");

  const saveQuota = async (u: AdminUser, quotaLimit: number, resetUsed: boolean) => {
    try {
      const res = await callAdmin<{ quota_limit: number; quota_used: number }>("update_quota", {
        userId: u.id, quotaLimit, resetUsed,
      });
      patchUser(u.id, { quota_limit: res.quota_limit, quota_used: res.quota_used });
      toast.success(resetUsed ? "Quota mis à jour et compteur remis à zéro" : "Quota mis à jour");
    } catch (e) {
      toast.error(errorMessage(e, "Erreur lors de la mise à jour du quota"));
      throw e;
    }
  };

  const exportCsv = () => {
    const blob = new Blob([usersToCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dica-comptes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${visible.length} comptes exportés`);
  };

  const isSelf = (u: AdminUser) => u.id === currentUser?.id;

  const actionItems = (u: AdminUser) => (
    <>
      <DropdownMenuItem onClick={() => setDetailUserId(u.id)}>
        <IdCard className="mr-2 h-4 w-4" /> Voir la fiche
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setProjectsUser(u)}>
        <Eye className="mr-2 h-4 w-4" /> Voir les projets
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setQuotaUser(u)}>
        <Gauge className="mr-2 h-4 w-4" /> Modifier le quota
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => toggleCobranding(u)}>
        <Palette className="mr-2 h-4 w-4" /> {u.cobranding_enabled ? "Désactiver" : "Activer"} le co-branding
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => sendPasswordReset(u)}>
        <KeyRound className="mr-2 h-4 w-4" /> Envoyer un lien mot de passe
      </DropdownMenuItem>
      {!u.email_confirmed && (
        <DropdownMenuItem onClick={() => confirmEmail(u)}>
          <CheckCircle className="mr-2 h-4 w-4" /> Confirmer l'email manuellement
        </DropdownMenuItem>
      )}
      {!isSelf(u) && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => changeRole(u)}>
            {u.role === "admin"
              ? <><Shield className="mr-2 h-4 w-4" /> Repasser client</>
              : <><ShieldCheck className="mr-2 h-4 w-4" /> Passer administrateur</>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleActive(u)}>
            {u.is_active
              ? <><UserX className="mr-2 h-4 w-4" /> Désactiver le compte</>
              : <><UserCheck className="mr-2 h-4 w-4" /> Réactiver le compte</>}
          </DropdownMenuItem>
          {!u.is_active && (
            <DropdownMenuItem onClick={() => deleteUser(u)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer définitivement
            </DropdownMenuItem>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Gestion des comptes</h2>
          <p className="text-muted-foreground">Comptes clients, quotas de génération et accès</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!visible.length}>
            <Download className="mr-2 h-4 w-4" /> Exporter CSV
          </Button>
          <Button variant="outline" size="icon" onClick={loadUsers} disabled={isLoading} aria-label="Actualiser">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Synthèse (cliquable = filtre) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SUMMARY.map(({ filter: f, icon: Icon, color }) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-xl border bg-card p-4 text-left shadow-sm transition hover:shadow-md",
              filter === f && "ring-2 ring-primary",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{FILTER_LABELS[f]}</span>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="mt-2 text-2xl font-bold">{isLoading ? "–" : counts[f]}</p>
          </button>
        ))}
      </div>

      {/* Barre d'outils */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, société, téléphone, ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as UserFilter)}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(FILTER_LABELS) as UserFilter[]).map((f) => (
              <SelectItem key={f} value={f}>{FILTER_LABELS[f]} ({counts[f]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as UserSort)}>
          <SelectTrigger className="md:w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as UserSort[]).map((s) => (
              <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tableau */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">Aucun compte ne correspond à ces critères</p>
        )}
        {!isLoading && visible.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead className="text-right">Projets</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Inscrit</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageUsers.map((u) => (
                  <TableRow key={u.id} className={cn(!u.is_active && "opacity-60")}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => setDetailUserId(u.id)}>
                        <p className="font-medium hover:underline">{displayName(u)}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{u.company_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.is_active
                          ? <Badge variant="default">Actif</Badge>
                          : <Badge variant="secondary">Désactivé</Badge>}
                        {u.role === "admin" && (
                          <Badge className="bg-amber-500 hover:bg-amber-600"><ShieldCheck className="mr-1 h-3 w-3" />Admin</Badge>
                        )}
                        {!u.email_confirmed && <Badge variant="outline" className="border-orange-400 text-orange-600">Non confirmé</Badge>}
                        {u.providers.includes("google") && <Badge variant="outline">Google</Badge>}
                        {u.cobranding_enabled && <Badge variant="outline">Co-branding</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button type="button" onClick={() => setQuotaUser(u)} title="Modifier le quota">
                        <QuotaCell user={u} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{u.project_count}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{relative(u.last_sign_in_at)}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions pour ${u.email}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel className="truncate">{u.email}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {actionItems(u)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && visible.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visible.length)} sur {visible.length}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button size="sm" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserDetailSheet user={detailUser} onOpenChange={(open) => !open && setDetailUserId(null)}>
        {detailUser && (
          <>
            <Button size="sm" variant="outline" onClick={() => setQuotaUser(detailUser)}>
              <Gauge className="mr-2 h-4 w-4" /> Quota
            </Button>
            <Button size="sm" variant="outline" onClick={() => setProjectsUser(detailUser)}>
              <Eye className="mr-2 h-4 w-4" /> Projets
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendPasswordReset(detailUser)}>
              <KeyRound className="mr-2 h-4 w-4" /> Lien mot de passe
            </Button>
            {!isSelf(detailUser) && (
              <Button size="sm" variant={detailUser.is_active ? "outline" : "default"} onClick={() => toggleActive(detailUser)}>
                {detailUser.is_active ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {detailUser.is_active ? "Désactiver" : "Réactiver"}
              </Button>
            )}
          </>
        )}
      </UserDetailSheet>

      <UserQuotaDialog user={quotaUser} onOpenChange={(open) => !open && setQuotaUser(null)} onSubmit={saveQuota} />

      <AlertDialog open={!!pendingConfirm} onOpenChange={(open) => !open && setPendingConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingConfirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={cn(pendingConfirm?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={() => pendingConfirm?.run()}
            >
              {pendingConfirm?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {projectsUser && currentUser && (
        <UserProjectsDialog
          open={!!projectsUser}
          onOpenChange={(open) => !open && setProjectsUser(null)}
          targetUserId={projectsUser.id}
          targetUserEmail={projectsUser.email}
          adminUserId={currentUser.id}
        />
      )}
    </div>
  );
};

export default UsersManagement;
