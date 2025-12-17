/**
 * Dropdown pour l'export d'images en plusieurs formats
 * 
 * @author KOREV AI
 * @date Décembre 2025
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Loader2, FileImage, Image, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  ImageExportService,
  ImageExportFormat,
  ImageExportOptions,
} from '@/services/image-export.service';

interface ImageExportDropdownProps {
  imageUrl: string;
  filename?: string;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

const FORMAT_ICONS: Record<ImageExportFormat, typeof FileImage> = {
  png: FileImage,
  jpeg: Image,
  webp: ImageIcon,
};

export function ImageExportDropdown({
  imageUrl,
  filename,
  variant = 'secondary',
  size = 'sm',
  className = '',
  showLabel = true,
}: ImageExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ImageExportFormat | null>(null);

  const formats = ImageExportService.getAvailableFormats();

  const handleExport = async (format: ImageExportFormat) => {
    if (isExporting) return;

    setIsExporting(true);
    setExportingFormat(format);

    try {
      const options: ImageExportOptions = {
        format,
        quality: ImageExportService.getRecommendedQuality(format),
        filename: filename || `dica-render-${Date.now()}`,
      };

      await ImageExportService.downloadImage(imageUrl, options);

      const formatInfo = ImageExportService.getFormatInfo(format);
      toast.success(`Image exportée en ${formatInfo.name} !`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Erreur d'export: ${error.message}`);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          ) : (
            <Download className="h-4 w-4 text-current" />
          )}
          {showLabel && (
            <span className="ml-2 text-current font-medium">
              {isExporting ? 'Export...' : 'Télécharger'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Choisir le format d'export
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formats.map((format) => {
          const Icon = FORMAT_ICONS[format.value];
          const isCurrentlyExporting = exportingFormat === format.value;

            return (
              <DropdownMenuItem
                key={format.value}
                onSelect={(e) => {
                  // Radix DropdownMenu utilise onSelect (pas onClick) ;
                  // preventDefault évite certains comportements qui annulent l'action.
                  e.preventDefault();
                  void handleExport(format.value);
                }}
                disabled={isExporting}
                className="cursor-pointer flex items-start gap-3 py-2"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCurrentlyExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{format.description}</span>
                    <span className="text-primary font-medium">~{format.estimatedSize}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Version compacte pour les menus dropdown existants
 */
export function ImageExportMenuItems({
  imageUrl,
  filename,
  onExportStart,
  onExportEnd,
}: {
  imageUrl: string;
  filename?: string;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}) {
  const [exportingFormat, setExportingFormat] = useState<ImageExportFormat | null>(null);
  const formats = ImageExportService.getAvailableFormats();

  const handleExport = async (format: ImageExportFormat) => {
    if (exportingFormat) return;

    setExportingFormat(format);
    onExportStart?.();

    try {
      const options: ImageExportOptions = {
        format,
        quality: ImageExportService.getRecommendedQuality(format),
        filename: filename || `dica-render-${Date.now()}`,
      };

      await ImageExportService.downloadImage(imageUrl, options);

      const formatInfo = ImageExportService.getFormatInfo(format);
      toast.success(`Image exportée en ${formatInfo.name} !`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Erreur d'export: ${error.message}`);
    } finally {
      setExportingFormat(null);
      onExportEnd?.();
    }
  };

  return (
    <>
      {formats.map((format) => {
        const Icon = FORMAT_ICONS[format.value];
        const isCurrentlyExporting = exportingFormat === format.value;

        return (
            <DropdownMenuItem
              key={format.value}
              onSelect={(e) => {
                e.preventDefault();
                void handleExport(format.value);
              }}
              disabled={!!exportingFormat}
              className="cursor-pointer"
            >
              {isCurrentlyExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              <span className="flex-1">{format.label.split('—')[0].trim()}</span>
              <span className="text-xs text-muted-foreground ml-2">~{format.estimatedSize}</span>
            </DropdownMenuItem>
        );
      })}
    </>
  );
}

