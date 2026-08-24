# Activer la confirmation d'email à l'inscription

## Constat (vérifié en production)

Les comptes sont créés **déjà confirmés** : pour les 10 derniers comptes, `email_confirmed_at` est identique à la date de création (à 8 ms près) et `confirmation_sent_at` est vide. Aucun email de confirmation n'a donc été envoyé — l'auto-confirmation est active côté backend, alors que `supabase/config.toml` déclare l'intention inverse (`enable_confirmations = true`). Le fichier local n'est pas ce qui pilote l'instance : c'est la configuration Auth déployée qui décide.

Conséquence de sécurité : n'importe qui peut créer un compte actif avec l'adresse d'un tiers.

## Ce qui va être fait

1. **Désactiver l'auto-confirmation** dans la configuration Auth de l'instance. À partir de là, chaque inscription envoie un email de confirmation et le compte reste inactif jusqu'au clic sur le lien.
2. **Adapter l'écran d'inscription** (`src/pages/Auth.tsx` / `src/lib/supabase.ts`) : après un `signUp`, la session est `null`. L'app doit afficher un message clair « Vérifiez votre boîte mail pour confirmer votre inscription » au lieu de considérer l'utilisateur comme connecté, et gérer le cas « email non confirmé » à la connexion avec un message explicite plutôt qu'une erreur brute.
3. **Vérifier le lien de retour** : `emailRedirectTo` pointe déjà vers l'origine du site ; on s'assure que le domaine de production est bien celui utilisé.

## À trancher avec toi

- Les **89 comptes existants** ont été confirmés automatiquement. Deux options : les laisser tels quels (ils fonctionnent), ou exiger une re-vérification pour les comptes jamais connectés. Par défaut : on ne touche à rien d'existant.
- Les emails de confirmation partiront avec l'expéditeur intégré par défaut. Si tu veux qu'ils arrivent depuis ton domaine avec le design DICA, il faut en plus mettre en place les **modèles d'emails d'authentification** — chantier séparé, à faire dans un second temps.

## Détails techniques

- Changement de configuration Auth : `auto_confirm_email = false`, en conservant les règles de mot de passe et la protection HIBP existantes.
- Aucune migration de base de données, aucune donnée utilisateur modifiée.
- Le flux `signUp()` renverra `data.session === null` : la logique de redirection post-inscription doit être remplacée par un état « en attente de confirmation ».
- Point de vigilance : si le débit d'emails d'authentification est limité, une vague d'inscriptions simultanées peut déclencher une erreur 429 ; on relèvera la limite horaire si nécessaire.
