import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { getProject, Project } from '@/lib/projectStore';
import { downloadProjectAsZip, BuildResult } from '@/lib/mockApi';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  Clock,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/Logo';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const viewportSizes: Record<ViewportSize, { width: string; icon: React.ElementType }> = {
  desktop: { width: '100%', icon: Monitor },
  tablet: { width: '768px', icon: Tablet },
  mobile: { width: '375px', icon: Smartphone },
};

export default function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const versionParam = searchParams.get('version');
  
  const { user, isLoading: authLoading } = useAuth();
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isDownloading, setIsDownloading] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  // Load project
  useEffect(() => {
    if (projectId) {
      const loadedProject = getProject(projectId);
      if (loadedProject && loadedProject.builds.length > 0) {
        setProject(loadedProject);
        const version = versionParam ? parseInt(versionParam) : loadedProject.builds.length;
        setSelectedVersion(version);
      } else {
        navigate('/dashboard');
      }
    }
  }, [projectId, versionParam, navigate]);

  const getCurrentBuild = (): BuildResult | undefined => {
    if (!project) return undefined;
    return project.builds.find(b => b.version === selectedVersion);
  };

  const handleDownload = () => {
    const build = getCurrentBuild();
    if (!build || !project) return;

    setIsDownloading(true);
    
    // Simulate download delay
    setTimeout(() => {
      downloadProjectAsZip(build.files, project.name);
      setIsDownloading(false);
      toast({
        title: direction === 'rtl' ? 'تم التحميل' : 'Downloaded',
        description: direction === 'rtl' 
          ? 'تم تحميل المشروع بنجاح'
          : 'Project downloaded successfully',
      });
    }, 500);
  };

  if (authLoading || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentBuild = getCurrentBuild();

  if (!currentBuild) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {direction === 'rtl' ? 'الإصدار غير موجود' : 'Version not found'}
          </p>
          <Button onClick={() => navigate(`/build/${projectId}`)}>
            {t('preview.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to={`/build/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
          </Link>
          <Logo size="sm" />
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">{project.name}</h1>
            <p className="text-xs text-muted-foreground">
              {t('preview.version')} {selectedVersion}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Viewport toggles */}
          <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
            {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => {
              const Icon = viewportSizes[size].icon;
              return (
                <button
                  key={size}
                  onClick={() => setViewport(size)}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewport === size 
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Version selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('preview.version')} {selectedVersion}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {project.builds.map((build) => (
                <DropdownMenuItem 
                  key={build.id}
                  onClick={() => setSelectedVersion(build.version)}
                  className={cn(
                    selectedVersion === build.version && "bg-primary-soft"
                  )}
                >
                  {t('preview.version')} {build.version}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="soft" size="sm" asChild>
            <Link to={`/build/${projectId}`} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('preview.back')}
            </Link>
          </Button>

          <Button 
            variant="hero" 
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t('preview.download')}
          </Button>
        </div>
      </header>

      {/* Preview Area */}
      <main className="flex-1 p-6 flex items-start justify-center overflow-auto">
        <div 
          className={cn(
            "bg-background rounded-xl shadow-elevated overflow-hidden transition-all duration-300",
            viewport === 'desktop' ? "w-full h-[calc(100vh-8rem)]" : "h-[700px]"
          )}
          style={{ 
            width: viewportSizes[viewport].width,
            maxWidth: '100%',
          }}
        >
          <iframe
            srcDoc={currentBuild.previewHtml}
            title="Website Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      </main>
    </div>
  );
}
