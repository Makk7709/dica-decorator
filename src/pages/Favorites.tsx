/**
 * @fileoverview Page Favoris
 * 
 * Page dédiée à la visualisation et gestion des rendus favoris.
 * 
 * @author KOREV AI
 * @date Décembre 2024
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumLayout, ContentContainer } from '@/components/ui/premium-layout';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FavoritesGallery } from '@/components/favorites/favorites-gallery';

export default function Favorites() {
  const navigate = useNavigate();

  return (
    <PremiumLayout>
      {/* Header */}
      <div className="border-b">
        <ContentContainer className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Mes Favoris</h1>
                <p className="text-sm text-muted-foreground">
                  Retrouvez tous vos rendus préférés
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </ContentContainer>
      </div>

      {/* Galerie */}
      <ContentContainer className="py-6">
        <FavoritesGallery />
      </ContentContainer>
    </PremiumLayout>
  );
}
