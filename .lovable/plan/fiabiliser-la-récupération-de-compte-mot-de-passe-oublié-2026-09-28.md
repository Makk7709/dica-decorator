# Fiabiliser la récupération de compte (mot de passe oublié)

Un bouton « Mot de passe oublié ? » existe déjà sur la page de connexion, mais les clients s'y perdent. Objectif : un parcours clair, des e-mails à vos couleurs, et un moyen pour l'admin de dépanner un client.

## Ce qui change pour les clients
1. **E-mails à l'image DICA** : l'e-mail de réinitialisation (ainsi que confirmation d'inscription, lien magique, changement d'e-mail) part depuis votre domaine dicadecor.fr, en français, avec votre logo et vos couleurs, au lieu de l'e-mail générique actuel.
2. **Page dédiée « Nouveau mot de passe »** : le lien de l'e-mail ouvre une page simple pour choisir le nouveau mot de passe (avec l'indicateur de force déjà utilisé à l'inscription), puis redirige vers le tableau de bord. Message clair si le lien a expiré, avec un bouton pour en redemander un.
3. **Message de confirmation neutre** après la demande : « Si un compte existe pour cet e-mail, vous allez recevoir un lien » + rappel de vérifier les indésirables. Délai anti-spam de 60 s sur le bouton renvoyer.
4. **Comptes Google** : rappel visible sur l'écran « mot de passe oublié » : « Vous vous êtes inscrit avec Google ? Utilisez Continuer avec Google » (cas de Jean-Pierre Brousset).

## Ce qui change pour l'admin
5. Dans la liste des utilisateurs (page Admin), un bouton **« Envoyer un lien de réinitialisation »** par compte, qui déclenche l'e-mail pour le client.

## Détails techniques
- Générer les modèles d'e-mails d'authentification gérés (domaine notify.www.dicadecor.fr déjà configuré), les styler (couleurs de index.css, logo public/images/dica-logo.png via un bucket email-assets), textes en français, puis déployer auth-email-hook.
- Nouvelle route publique `/reset-password` (src/pages/ResetPassword.tsx) : détecte la session de récupération, appelle `updateUser({ password })` ; `resetPasswordForEmail` dans Auth.tsx redirige vers `${origin}/reset-password`. Retirer le mode récupération inline actuel de Auth.tsx.
- Bouton admin : action ajoutée à la fonction get-users-admin (vérification rôle admin côté serveur) qui appelle `resetPasswordForEmail` pour l'e-mail ciblé.
- Vérifier le plafond d'envoi d'e-mails d'authentification et l'augmenter si besoin.
