-- Supprimer la contrainte CHECK sur la colonne category qui est obsolète
-- Maintenant nous utilisons le système de catalogues contextualisés
ALTER TABLE public.decors DROP CONSTRAINT IF EXISTS decors_category_check;