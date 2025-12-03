#!/bin/bash
echo "🚀 Redémarrage du serveur avec les variables d'environnement..."
source .env
export VITE_SUPABASE_URL
export VITE_SUPABASE_PUBLISHABLE_KEY
export VITE_SUPABASE_PROJECT_ID
npm run dev
