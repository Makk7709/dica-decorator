
# Confirmer manuellement le compte amine.mohamed@korev-ai.com

## Probleme
L'email de confirmation n'a jamais ete recu par l'utilisateur. Sans confirmation, la connexion est bloquee avec l'erreur "Email not confirmed". Le systeme d'envoi d'emails de Lovable Cloud a bien traite la demande (statut 200), mais l'email n'est jamais arrive.

## Solution
Ajouter une action "confirm_user" dans la fonction backend `get-users-admin` pour permettre a l'admin de confirmer manuellement un compte, puis ajouter un bouton correspondant dans l'interface admin.

## Etapes

### 1. Ajouter l'action `confirm_user` dans la fonction backend
Ajouter un nouveau bloc dans `supabase/functions/get-users-admin/index.ts` qui utilise `supabaseAdmin.auth.admin.updateUserById()` pour mettre a jour le champ `email_confirm` a `true`.

### 2. Ajouter un bouton "Confirmer email" dans l'interface admin
Dans `src/pages/Admin.tsx` :
- Ajouter une fonction `handleConfirmUser` qui appelle la fonction backend avec `action: "confirm_user"`
- Ajouter un bouton "Confirmer" visible pour chaque utilisateur dans la liste

### 3. Confirmer immediatement le compte amine.mohamed@korev-ai.com
Executer une requete pour confirmer ce compte directement afin de debloquer l'acces sans attendre le deploiement du bouton.

## Details techniques

**Fonction backend** - nouveau bloc :
```typescript
if (action === "confirm_user") {
  const { userId } = body;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true
  });
  if (error) throw error;
  return Response({ success: true });
}
```

**Frontend** - nouveau handler + bouton avec icone `CheckCircle` a cote du bouton "Desactiver" pour chaque utilisateur.
