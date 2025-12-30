'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { getProjectById } from '@/lib/projectService';
import { getBuildByVersion, getBuildsByProject } from '@/lib/buildService';
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  Clock,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
  const params = useParams();
  const projectId = params.projectId as string;
  const searchParams = useSearchParams();
  const versionParam = searchParams.get('version');
  
  const { user, isLoading: authLoading } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);

  // Timeout for auth loading (prevent infinite loading)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn('Auth loading timeout on preview page - proceeding anyway');
        setAuthTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [authLoading]);
  const { t, direction } = useLanguage();
  const router = useRouter();
  
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isDownloading, setIsDownloading] = useState(false);

  // Auth check
  useEffect(() => {
    if ((!authLoading || authTimeout) && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, authLoading, authTimeout, router]);

  // Load project from Supabase
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ['project', projectId, user?.id],
    queryFn: async () => {
      if (!user || !projectId) throw new Error('User or project ID missing');
      const supabaseProject = await getProjectById(user.id, projectId);
      if (!supabaseProject) {
        throw new Error('Project not found');
      }
      return supabaseProject;
    },
    enabled: !!user && !!projectId,
    refetchOnMount: true,
  });

  // Load builds from Supabase
  const {
    data: builds = [],
    isLoading: buildsLoading,
  } = useQuery({
    queryKey: ['builds', projectId],
    queryFn: () => getBuildsByProject(projectId),
    enabled: !!projectId,
    refetchOnMount: true,
  });

  // Load specific build by version
  const {
    data: currentBuild,
    isLoading: buildLoading,
  } = useQuery({
    queryKey: ['build', projectId, selectedVersion],
    queryFn: () => getBuildByVersion(projectId, selectedVersion),
    enabled: !!projectId && !!selectedVersion,
    refetchOnMount: true,
  });

  // Set initial version from URL param or latest
  useEffect(() => {
    // Only process after builds finish loading
    if (buildsLoading) return;
    
    if (builds.length > 0) {
      const version = versionParam ? parseInt(versionParam) : builds[0].version;
      if (version && version !== selectedVersion) {
        setSelectedVersion(version);
      }
    } else if (builds.length === 0 && project) {
      // No builds found, redirect to build page
      router.push(`/build/${projectId}`);
    }
  }, [builds, versionParam, buildsLoading, projectId, router, project, selectedVersion]);

  // Redirect if project not found
  useEffect(() => {
    if (projectError && !projectLoading) {
      router.push('/dashboard');
    }
  }, [projectError, projectLoading, router]);

  const handleDownload = async () => {
    if (!currentBuild || !project) return;

    setIsDownloading(true);
    
    try {
      // Download ZIP from API
      const response = await fetch(`/api/download/${projectId}?version=${selectedVersion}`);
      
      if (!response.ok) {
        throw new Error('Failed to download project');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}-v${currentBuild.version}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: direction === 'rtl' ? 'تم التحميل' : 'Downloaded',
        description: direction === 'rtl' 
          ? 'تم تحميل المشروع بنجاح'
          : 'Project downloaded successfully',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: direction === 'rtl' 
          ? 'فشل في تحميل المشروع'
          : 'Failed to download project',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Show loading only if auth is loading and not timed out
  if (authLoading && !authTimeout && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading overlay if project/builds are still loading
  if (projectLoading || buildsLoading || buildLoading || !project) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </header>
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  if (!currentBuild || !currentBuild.preview_html) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {direction === 'rtl' ? 'الإصدار غير موجود' : 'Version not found'}
          </p>
          <Button onClick={() => router.push(`/build/${projectId}`)}>
            {t('preview.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <header className="h-auto sm:h-16 bg-background border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Link href={`/build/${projectId}`} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
          </Link>
          <Logo size="sm" />
          <div className="h-6 w-px bg-border" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{project.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
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
              {builds.map((build) => (
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
            <Link href={`/build/${projectId}`} className="flex items-center gap-2">
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
      <main className="flex-1 p-3 sm:p-6 flex items-start justify-center overflow-auto">
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
            srcDoc={currentBuild.preview_html || ''}
            title="Website Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
          />
        </div>
      </main>
    </div>
  );
}
