# Commande vocale en direct pour l'assistant créatif

## Ce que le client verra
- Un bouton micro « Parler à l'assistant » sur la page de l'assistant créatif.
- Un court message explique pourquoi l'accès au micro est demandé, puis la conversation vocale démarre : le client parle et l'assistant répond à voix haute. Le client peut lui couper la parole à tout moment.
- Pendant l'échange, la transcription (client + assistant) s'affiche dans le chat.
- Un bouton « Raccrocher » termine l'appel.

## Ce que l'assistant vocal sait faire
- Proposer des combinaisons de décors (par ex. sol + murs d'ascenseur, façades + plan de travail) en citant uniquement de vraies références du catalogue DICA (les 236 décors).
- Aider à monter un projet : il pose des questions ciblées (métier, usage, intérieur/extérieur, contraintes, dimensions, quantité, usinage, personnalisation, délais) avant de recommander quoi que ce soit.
- Donner des infos produits : HPL mince, postformable, compact, bandes de chant, stratifié numérique, solutions ascenseur, van, CHR.
- Orienter entre DICA France (matière, décors, conseil) et Compactop (usinage, pièces finies, plateaux CHR), selon les règles du texte que vous avez fourni.

## Garde-fous
- Il reste strictement sur DICA France, Compactop et le panneau stratifié/compact, et refuse poliment tout autre sujet.
- Normes françaises et européennes : il ne cite jamais de norme, certification, classement feu, épaisseur, prix, délai ou disponibilité qu'il ne peut pas vérifier. Il dit clairement qu'il ne sait pas et renvoie vers la fiche produit ou un conseiller DICA.
- Il ne lance pas de génération d'image : il donne des conseils, et le client génère ensuite ses rendus dans l'assistant comme aujourd'hui.
- Il faut être connecté pour l'utiliser, et chaque appel est plafonné en durée pour maîtriser les coûts.

## Ce dont j'ai besoin de vous
- Une **clé API OpenAI** (compte OpenAI avec paiement actif). Je vous l'enverrai demander via un formulaire sécurisé, elle ne sera jamais visible sur le site.
- Coût indicatif : quelques dizaines de centimes par minute de conversation, facturés sur votre compte OpenAI.

## Détails techniques
- Nouvelle fonction serveur `realtime-session` (JWT requis) : vérifie l'utilisateur actif, crée une session éphémère OpenAI Realtime (`gpt-realtime`, voix FR) avec les instructions système (texte DICA/Compactop fourni + règles normes/refus), et renvoie uniquement le jeton éphémère. Secret `OPENAI_API_KEY` côté serveur.
- Côté navigateur : connexion WebRTC directe à OpenAI avec le jeton éphémère (micro en entrée, audio en sortie, canal de données pour les transcriptions et les appels d'outils).
- Outil `search_decors` (requête, catégorie, contexte d'usage) exécuté dans le navigateur sur le catalogue déjà chargé (`useDecors`) : il renvoie nom, référence et catégorie, pour que les combinaisons reposent sur de vraies références.
- Nouveau composant `VoiceAssistant` intégré à `Creative.tsx`, avec une durée maximale de session (par ex. 10 min) et coupure propre.
- Autoriser `api.openai.com` dans la CSP (`connect-src` couvre déjà `https:`, à vérifier pour WebRTC/média).
- Consigner la règle dans `AGENTS.md`.
