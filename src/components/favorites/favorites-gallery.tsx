/**
 * @fileoverview Galerie de favoris avec visualisation Pinterest
 * 
 * Composant premium pour afficher les rendus favoris avec:
 * - Layout masonry type Pinterest
 * - Filtres avancés
 * - Actions en masse
 * - Statistiques
 * 
 * @author KOREV AI
 * @date Décembre 2024
 */

import { useState, useEffect, useMemo } from 'react';
import { Heart, Download, Trash2, Grid3x3, LayoutGrid, Filter, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FavoritesService, FavoriteRender, FavoritesFilter } from '@/services/favorites.service';

// ============================================================================
// Types
// ============================================================================

interface FavoritesGalleryProps {
  projectId?: string; // Si fourni, filtre uniquement ce projet
  onClose?: () => void;
}

// ============================================================================
// Composant Principal
// ============================================================================

export function FavoritesGallery({ projectId, onClose }: Readonly<FavoritesGalleryProps>) {
  const { user } = useAuth();

  // État
  const [favorites, setFavorites] = useState<FavoriteRender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FavoritesFilter>({ projectId });
  const [layout, setLayout] = useState<'masonry' | 'grid'>('masonry');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Statistiques
  const stats = useMemo(() => {
    return {
      total: favorites.length,
      decor: favorites.filter(f => f.render.decorId).length,
      creative: favorites.filter(f => f.render.isCreativeImport).length,
      selected: selectedIds.size,
    };
  }, [favorites, selectedIds]);

  // Charger les favoris
  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  const loadFavorites = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const service = new FavoritesService(supabase);
      const result = await service.getFavoritesWithFilter(user.id, filter);

      if (result.success) {
        setFavorites(result.data || []);
      } else {
        toast.error(result.error || 'Erreur lors du chargement des favoris');
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  // Sélection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(favorites.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Suppression
  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const service = new FavoritesService(supabase);
      const result = await service.bulkRemoveFavorites(user!.id, Array.from(selectedIds));

      if (result.success) {
        toast.success(`${selectedIds.size} favori(s) supprimé(s)`);
        setShowDeleteDialog(false);
        setSelectedIds(new Set());
        loadFavorites();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting favorites:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Téléchargement des images sélectionnées
  const handleDownloadSelected = async () => {
    const selectedFavorites = favorites.filter(f => selectedIds.has(f.id));
    
    for (const fav of selectedFavorites) {
      try {
        const response = await fetch(fav.render.resultImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fav.render.project.title}-${fav.render.decor?.referenceCode || 'render'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
    
    toast.success(`${selectedFavorites.length} image(s) téléchargée(s)`);
  };

  // Filtres
  const applyTypeFilter = (type: 'all' | 'decor' | 'creative') => {
    setFilter(prev => ({ ...prev, type }));
    loadFavorites();
  };

  // Render loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des favoris...</p>
        </div>
      </div>
    );
  }

  // Render empty
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-4">
        <Heart className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun favori</h3>
        <p className="text-muted-foreground max-w-sm">
          Commencez à marquer vos rendus préférés comme favoris pour les retrouver ici.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec statistiques et filtres */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 space-y-4">
        {/* Statistiques */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              Mes Favoris
            </h2>
            <div className="flex gap-3 mt-2">
              <Badge variant="secondary">
                {stats.total} favori{stats.total > 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline">{stats.decor} décor</Badge>
              <Badge variant="outline">{stats.creative} créatif</Badge>
              {stats.selected > 0 && (
                <Badge className="bg-primary">{stats.selected} sélectionné{stats.selected > 1 ? 's' : ''}</Badge>
              )}
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Barre d'actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélection */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={selectedIds.size === favorites.length}
            >
              <Check className="h-4 w-4 mr-1" />
              Tout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              disabled={selectedIds.size === 0}
            >
              <X className="h-4 w-4 mr-1" />
              Aucun
            </Button>
          </div>

          {/* Filtres type */}
          <Select value={filter.type || 'all'} onValueChange={(v: 'all' | 'decor' | 'creative') => applyTypeFilter(v)}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="decor">Décor uniquement</SelectItem>
              <SelectItem value="creative">Créatif uniquement</SelectItem>
            </SelectContent>
          </Select>

          {/* Layout */}
          <Button
            variant={layout === 'masonry' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLayout('masonry')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={layout === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLayout('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSelected}
            disabled={selectedIds.size === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger ({selectedIds.size})
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={selectedIds.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Galerie */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className={
            layout === 'masonry'
              ? 'columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4'
              : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
          }
        >
          {favorites.map((fav) => (
            <FavoriteCard
              key={fav.id}
              favorite={fav}
              isSelected={selectedIds.has(fav.id)}
              onToggleSelect={() => toggleSelect(fav.id)}
            />
          ))}
        </div>
      </div>

      {/* Dialog de suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer les favoris ?</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedIds.size} favori{selectedIds.size > 1 ? 's' : ''} ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Composant Carte Favorite
// ============================================================================

interface FavoriteCardProps {
  favorite: FavoriteRender;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function FavoriteCard({ favorite, isSelected, onToggleSelect }: Readonly<FavoriteCardProps>) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected ? 'border-primary shadow-lg' : 'border-transparent hover:border-border'
      }`}
      onClick={onToggleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <img
        src={favorite.render.resultImageUrl}
        alt={favorite.render.project.title}
        className="w-full h-auto object-cover"
      />

      {/* Badge favori */}
      <div className="absolute top-2 left-2">
        <Heart className="h-5 w-5 text-red-500 fill-red-500 drop-shadow-lg" />
      </div>

      {/* Checkbox sélection */}
      <div
        className={`absolute top-2 right-2 transition-opacity ${
          isSelected || isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
            isSelected
              ? 'bg-primary border-primary'
              : 'bg-white/90 border-white'
          }`}
        >
          {isSelected && <Check className="h-4 w-4 text-white" />}
        </div>
      </div>

      {/* Overlay avec infos */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="text-white text-sm">
          <div className="font-semibold truncate">{favorite.render.project.title}</div>
          {favorite.render.decor && (
            <div className="text-xs opacity-90 truncate">
              {favorite.render.decor.name}
            </div>
          )}
          {favorite.render.isCreativeImport && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Assistant IA
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default FavoritesGallery;
