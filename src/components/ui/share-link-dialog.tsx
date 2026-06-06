/**
 * @fileoverview ShareLinkDialog - Dialog de partage de projet par lien
 * Génération de liens sécurisés avec expiration et protection par mot de passe
 */

import React, { useState, useCallback, useEffect } from 'react';
import {Link2, Copy, Check, Loader2, Calendar, Lock, Unlock, Eye, Download, Share2, Trash2} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {ShareLinkService, ShareLinkData, ExpirationPreset, ShareLinkPermissions} from '@/services/share-link.service';

// ============================================================================
// Types
// ============================================================================

export interface ShareLinkDialogProps {
  /** ID du projet */
  projectId: string;
  /** Titre du projet */
  projectTitle: string;
  /** ID de l'utilisateur */
  userId: string;
  /** Liens existants */
  existingLinks?: ShareLinkData[];
  /** Callback quand un lien est créé */
  onLinkCreated?: (link: ShareLinkData) => void;
  /** Callback quand un lien est révoqué */
  onLinkRevoked?: (linkId: string) => void;
  /** Classe CSS */
  className?: string;
  /** Variante du bouton */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Afficher le texte */
  showLabel?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = 'Copier' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  }, [text]);

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          Copié !
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
};

const LinkCard: React.FC<{
  link: ShareLinkData;
  onRevoke: () => void;
  service: ShareLinkService;
}> = ({ link, onRevoke, service }) => {
  const stats = service.getStats(link.token);
  const isExpired = link.expiresAt && link.expiresAt < new Date();

  return (
    <div className={cn(
      'rounded-lg border p-4 space-y-3',
      !link.isActive && 'opacity-50 bg-muted',
      isExpired && 'border-destructive/50'
    )}>
      {/* URL */}
      <div className="flex items-center gap-2">
        <Input
          value={link.url}
          readOnly
          className="font-mono text-sm"
        />
        <CopyButton text={link.url} label="" />
      </div>

      {/* Status & Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          {/* Views */}
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {stats.totalViews} vues
          </span>
          
          {/* Expiration */}
          {link.expiresAt ? (
            <span className={cn(
              'flex items-center gap-1',
              isExpired && 'text-destructive'
            )}>
              <Calendar className="h-3.5 w-3.5" />
              {isExpired ? 'Expiré' : `${stats.daysUntilExpiry}j restants`}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Pas d'expiration
            </span>
          )}

          {/* Password */}
          {link.isPasswordProtected && (
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              Protégé
            </span>
          )}
        </div>

        {/* Actions */}
        {link.isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Permissions */}
      <div className="flex gap-2">
        {link.permissions.canView && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Voir
          </span>
        )}
        {link.permissions.canDownload && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Télécharger
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ShareLinkDialog: React.FC<Readonly<ShareLinkDialogProps>> = ({
  projectId,
  projectTitle,
  userId,
  existingLinks = [],
  onLinkCreated,
  onLinkRevoked,
  className,
  variant = 'outline',
  showLabel = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [service] = useState(() => new ShareLinkService());
  const [links, setLinks] = useState<ShareLinkData[]>(existingLinks);
  const [activeTab, setActiveTab] = useState('create');

  // Form state
  const [expiration, setExpiration] = useState<ExpirationPreset>('7d');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<ShareLinkPermissions>({
    canView: true,
    canDownload: true,
    canComment: false,
    canShare: false,
  });

  // Initialize links only once
  useEffect(() => {
    if (existingLinks.length > 0 && links.length === 0) {
      setLinks(existingLinks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingLinks]);

  const handleCreateLink = useCallback(async () => {
    setIsCreating(true);

    try {
      const link = service.createShareLink({
        projectId,
        createdBy: userId,
        expirationPreset: expiration,
        password: usePassword && password.length >= 6 ? password : undefined,
        permissions,
        metadata: {
          projectTitle,
        },
      });

      setLinks(prev => [link, ...prev]);
      onLinkCreated?.(link);

      toast.success('Lien de partage créé !', {
        description: 'Le lien a été copié dans votre presse-papiers.',
      });

      // Auto-copy
      await navigator.clipboard.writeText(link.url);

      // Reset form
      setPassword('');
      setUsePassword(false);
      setActiveTab('manage');

    } catch (error) {
      toast.error('Erreur lors de la création', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setIsCreating(false);
    }
  }, [service, projectId, userId, expiration, usePassword, password, permissions, projectTitle, onLinkCreated]);

  const handleRevokeLink = useCallback((link: ShareLinkData) => {
    service.revokeLink(link, userId, 'Révoqué par l\'utilisateur');
    setLinks(prev => prev.map(l => l.token === link.token ? { ...l, isActive: false } : l));
    onLinkRevoked?.(link.token);
    toast.success('Lien révoqué');
  }, [service, userId, onLinkRevoked]);

  const activeLinks = links.filter(l => l.isActive);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={cn('gap-2', className)}>
          <Share2 className="h-4 w-4" />
          {showLabel && <span>Partager</span>}
          {activeLinks.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs">
              {activeLinks.length}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Partager le projet
          </DialogTitle>
          <DialogDescription>
            Créez un lien de partage pour "{projectTitle}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Nouveau lien</TabsTrigger>
            <TabsTrigger value="manage" className="relative">
              Liens actifs
              {activeLinks.length > 0 && (
                <span className="ml-2 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                  {activeLinks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Expiration */}
            <div className="grid gap-2">
              <Label>Expiration</Label>
              <Select
                value={expiration}
                onValueChange={(v) => setExpiration(v as ExpirationPreset)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 heures</SelectItem>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="90d">90 jours</SelectItem>
                  <SelectItem value="never">Pas d'expiration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password Protection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="usePassword" className="flex items-center gap-2">
                  {usePassword ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  Protection par mot de passe
                </Label>
                <Switch
                  id="usePassword"
                  checked={usePassword}
                  onCheckedChange={setUsePassword}
                />
              </div>
              {usePassword && (
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className={cn(password.length > 0 && password.length < 6 && 'border-destructive')}
                />
              )}
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>Autorisations</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label htmlFor="canView" className="flex items-center gap-2 cursor-pointer">
                    <Eye className="h-4 w-4" />
                    Voir
                  </Label>
                  <Switch
                    id="canView"
                    checked={permissions.canView}
                    onCheckedChange={(v) => setPermissions(p => ({ ...p, canView: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <Label htmlFor="canDownload" className="flex items-center gap-2 cursor-pointer">
                    <Download className="h-4 w-4" />
                    Télécharger
                  </Label>
                  <Switch
                    id="canDownload"
                    checked={permissions.canDownload}
                    onCheckedChange={(v) => setPermissions(p => ({ ...p, canDownload: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Create Button */}
            <Button
              onClick={handleCreateLink}
              disabled={isCreating || (usePassword && password.length < 6)}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Créer le lien
                </>
              )}
            </Button>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage" className="mt-4">
            {links.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Aucun lien de partage créé</p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab('create')}
                  className="mt-2"
                >
                  Créer un lien
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {links.map((link) => (
                  <LinkCard
                    key={link.token}
                    link={link}
                    service={service}
                    onRevoke={() => handleRevokeLink(link)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;

