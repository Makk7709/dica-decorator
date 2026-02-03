/**
 * Composant pour l'import en masse de décors
 * Permet de charger un dossier complet d'images et de créer automatiquement les décors
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Loader2, CheckCircle, XCircle, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FileToUpload {
  file: File;
  name: string;
  referenceCode: string;
  selected: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

interface BulkDecorUploadProps {
  categories: Category[];
  onComplete: () => void;
}

/**
 * Extrait le code référence à partir du nom de fichier
 * Ex: "3040_BN_PF.jpg" -> { name: "3040 BN PF", referenceCode: "3040_BN_PF" }
 */
const parseFileName = (fileName: string): { name: string; referenceCode: string } => {
  // Retirer l'extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // Nettoyer le nom (remplacer underscores par espaces pour le nom affiché)
  const displayName = nameWithoutExt.replace(/_/g, " ").replace(/-/g, " ");
  
  // Le code référence garde les underscores
  const referenceCode = nameWithoutExt;
  
  return { name: displayName, referenceCode };
};

export const BulkDecorUpload = ({ categories, onComplete }: BulkDecorUploadProps) => {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const imageFiles = Array.from(selectedFiles).filter(file => 
      file.type.startsWith('image/')
    );

    const filesToUpload: FileToUpload[] = imageFiles.map(file => {
      const { name, referenceCode } = parseFileName(file.name);
      return {
        file,
        name,
        referenceCode,
        selected: true,
        status: 'pending' as const,
      };
    });

    setFiles(filesToUpload);
    setProgress(0);
    setUploadedCount(0);
  }, []);

  const toggleFileSelection = (index: number) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, selected: !f.selected } : f
    ));
  };

  const toggleAllFiles = (selected: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, selected })));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadSingleDecor = async (fileToUpload: FileToUpload): Promise<boolean> => {
    try {
      // 1. Upload image to storage
      const fileExt = fileToUpload.file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('decor-textures')
        .upload(fileName, fileToUpload.file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data } = supabase.storage
        .from('decor-textures')
        .getPublicUrl(fileName);

      // 3. Create decor entry
      const { error: insertError } = await supabase
        .from('decors')
        .insert({
          name: fileToUpload.name,
          reference_code: fileToUpload.referenceCode,
          category: selectedCategory,
          texture_image_url: data.publicUrl,
          usage_contexts: ['ascenseur'],
          is_active: true,
        });

      if (insertError) throw insertError;

      return true;
    } catch (error) {
      console.error(`Error uploading ${fileToUpload.name}:`, error);
      return false;
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedCategory) {
      toast.error("Sélectionnez une catégorie");
      return;
    }

    const selectedFiles = files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      toast.error("Sélectionnez au moins un fichier");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setUploadedCount(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (!files[i].selected) continue;

      // Update status to uploading
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' } : f
      ));

      const success = await uploadSingleDecor(files[i]);

      // Update status based on result
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { 
          ...f, 
          status: success ? 'success' : 'error',
          error: success ? undefined : 'Erreur lors de l\'upload'
        } : f
      ));

      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      setUploadedCount(successCount + errorCount);
      setProgress(((i + 1) / selectedFiles.length) * 100);
    }

    setIsUploading(false);

    if (errorCount === 0) {
      toast.success(`${successCount} décors importés avec succès`);
      onComplete();
    } else {
      toast.warning(`${successCount} réussis, ${errorCount} erreurs`);
    }
  };

  const selectedCount = files.filter(f => f.selected).length;
  const activeCategories = categories.filter(c => c.is_active);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import en masse
        </CardTitle>
        <CardDescription>
          Sélectionnez un dossier d'images pour créer automatiquement les décors. 
          Le nom du fichier sera utilisé comme référence (ex: 3040_BN_PF.jpg → référence "3040_BN_PF").
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label>Catégorie pour tous les décors *</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Input */}
        <div className="space-y-2">
          <Label>Sélectionner les images</Label>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild className="cursor-pointer">
              <label>
                <Upload className="mr-2 h-4 w-4" />
                Parcourir...
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesSelect}
                  className="hidden"
                  // @ts-expect-error - webkitdirectory is a valid attribute
                  webkitdirectory=""
                  directory=""
                />
              </label>
            </Button>
            <span className="text-sm text-muted-foreground">
              ou glissez-déposez un dossier
            </span>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  {selectedCount} / {files.length} fichiers sélectionnés
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllFiles(true)}
                  disabled={isUploading}
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllFiles(false)}
                  disabled={isUploading}
                >
                  Tout désélectionner
                </Button>
              </div>
            </div>

            <ScrollArea className="h-64 rounded-md border">
              <div className="p-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${
                      file.selected ? 'bg-accent/50 border-accent' : 'bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      checked={file.selected}
                      onCheckedChange={() => toggleFileSelection(index)}
                      disabled={isUploading || file.status === 'success'}
                    />
                    
                    {/* Preview */}
                    <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={URL.createObjectURL(file.file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Réf: {file.referenceCode}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {file.status === 'pending' && (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      {file.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {file.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {file.status === 'error' && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      
                      {!isUploading && file.status !== 'success' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {uploadedCount} / {selectedCount} fichiers traités
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleBulkUpload}
              disabled={isUploading || selectedCount === 0 || !selectedCategory}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer {selectedCount} décor{selectedCount > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
