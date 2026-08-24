# Rendre effective la désactivation d'un compte par l'administrateur

## Constat (vérifié)

Le bouton « Désactiver » de la page Admin appelle la fonction `get-users-admin` qui **se contente d'inverser le champ `is_active` du profil**. Rien n'exploite ensuite cette valeur :

- aucune politique de sécurité base de données ne filtre sur `is_active` pour les données utilisateur (seuls les décors, catégories et catalogues l'utilisent) ;
- la protection des routes (`ProtectedRoute`) ne vérifie que « connecté » et « admin », jamais `is_active` ;
- aucune session n'est révoquée et le compte d'authentification n'est pas bloqué (`banned_until` vide pour tous).

Résultat : un compte « désactivé » continue de se connecter et d'utiliser l'app normalement. Le drapeau n'est aujourd'hui qu'un indicateur d'affichage.

## Ce qui va être fait

1. **Blocage réel côté authentification** — lors d'une désactivation, la fonction admin bloquera aussi le compte d'authentification et révoquera ses sessions en cours : l'utilisateur est déconnecté immédiatement et ne peut plus se reconnecter. La réactivation lève le blocage.
2. **Filet de sécurité côté base de données** — les écritures des tables métier (projets, photos, rendus, créations IA, favoris) seront conditionnées à un profil actif, afin qu'un jeton encore valide ne puisse pas créer de données.
3. **Message clair côté app** — si un compte désactivé garde une page ouverte, il est redirigé vers l'écran de connexion avec le message « Votre compte a été désactivé. Contactez l'administrateur. », au lieu d'un échec silencieux.
4. **Protection contre l'auto-blocage** — un administrateur ne pourra pas désactiver son propre compte.

## Détails techniques

- `supabase/functions/get-users-admin` (action `toggle_active`) : en plus du `update` sur `profiles`, appel de l'API admin d'authentification pour poser/retirer un bannissement et invalider les sessions (`ban_duration`, déconnexion globale). Refus si `userId` = appelant.
- Migration : fonction `SECURITY DEFINER` `public.is_profile_active(uuid)` (stable, `search_path` figé), utilisée dans les clauses `WITH CHECK` des politiques INSERT/UPDATE de `projects`, `project_photos`, `render_results`, `ai_creations`, `render_favorites`, `creative_favorites`. La lecture reste autorisée pour ne pas casser une éventuelle réactivation.
- `AuthContext` : lecture de `profiles.is_active` en même temps que le rôle ; si `false`, `signOut()` puis redirection `/auth` avec le message. `ProtectedRoute` s'appuie sur cet état.
- Page Admin : le libellé du bouton reflète l'état réel après retour de la fonction.

## Point à confirmer

Aucun compte n'est désactivé aujourd'hui, donc la mise en place ne coupe l'accès à personne. Si tu veux en plus une **liste noire d'emails** empêchant la recréation d'un compte après désactivation, dis-le : ce n'est pas inclus dans ce plan.
