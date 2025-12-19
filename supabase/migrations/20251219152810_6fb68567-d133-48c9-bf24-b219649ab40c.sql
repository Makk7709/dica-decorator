-- Supprimer l'ancienne contrainte
ALTER TABLE decors DROP CONSTRAINT decors_category_check;

-- Ajouter la nouvelle contrainte avec "Compact déco details"
ALTER TABLE decors ADD CONSTRAINT decors_category_check 
CHECK (category = ANY (ARRAY['metal'::text, 'unis'::text, 'marbre'::text, 'bois'::text, 'deco'::text, 'Évasion'::text, 'Compact déco details'::text]));