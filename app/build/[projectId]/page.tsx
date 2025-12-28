'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getProjectById } from '@/lib/projectService';
import { getBuildsByProject } from '@/lib/buildService';
import { getLatestDeploymentByProject, type Deployment } from '@/lib/deploymentService';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Sparkles, 
  Eye, 
  Clock,
  ChevronDown,
  User,
  Rocket,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  buildVersion?: number;
  timestamp: Date;
}

interface BuildResponse {
  success: boolean;
  projectId: string;
  version: number;
  files?: Record<string, string>;
  summary: string;
  languageMode?: 'arabic-only' | 'english-only' | 'bilingual';
  sections?: string[];
  previewHtml: string;
  createdAt?: string;
  // Edit-specific fields
  filesChanged?: string[];
  patches?: Array<{ path: string; diff: string; summary: string }>;
  errors?: string[];
}

export default function BuildChat() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, isLoading: authLoading } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);

  // Timeout for auth loading (prevent infinite loading)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn('Auth loading timeout on build page - proceeding anyway');
        setAuthTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [authLoading]);
  const { t, direction } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load latest deployment
  const {
    data: latestDeployment,
    isLoading: deploymentLoading,
    refetch: refetchDeployment,
  } = useQuery({
    queryKey: ['deployment', projectId],
    queryFn: () => getLatestDeploymentByProject(projectId),
    enabled: !!projectId,
    refetchOnMount: true,
  });

  // Reconstruct messages from builds
  useEffect(() => {
    if (builds.length > 0) {
      // Only update if builds actually changed (by comparing build IDs)
      const currentBuildIds = builds.map(b => b.id).join(',');
      const existingBuildIds = messages
        .filter(m => m.buildVersion)
        .map(m => `assistant-${m.buildVersion}`)
        .join(',');
      
      // Only reconstruct if builds changed
      if (currentBuildIds !== existingBuildIds) {
      const reconstructedMessages: ChatMessage[] = [];
      builds.forEach(build => {
        reconstructedMessages.push({
          id: `user-${build.id}`,
          role: 'user',
          content: build.prompt,
          timestamp: new Date(build.created_at),
        });
        reconstructedMessages.push({
          id: `assistant-${build.id}`,
          role: 'assistant',
          content: direction === 'rtl' 
            ? `تم إنشاء موقعك بنجاح! (الإصدار ${build.version})` 
            : `Your website has been generated! (Version ${build.version})`,
          buildVersion: build.version,
          timestamp: new Date(build.created_at),
        });
      });
      setMessages(reconstructedMessages);
        if (builds.length > 0 && selectedVersion !== builds[0].version) {
        setSelectedVersion(builds[0].version); // Latest version
      }
      }
    } else {
      // Clear messages if no builds
      if (messages.length > 0) {
        setMessages([]);
      }
      if (selectedVersion !== null) {
        setSelectedVersion(null);
      }
    }
  }, [builds]); // Remove direction from dependencies to prevent infinite loop

  // Redirect if project not found
  useEffect(() => {
    if (projectError && !projectLoading) {
      router.push('/dashboard');
    }
  }, [projectError, projectLoading, router]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating || !project) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputValue.trim();
    setInputValue('');
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Simulate progress (since we don't have real progress from API)
    let progressValue = 0;
    progressIntervalRef.current = setInterval(() => {
      progressValue += 10;
      if (progressValue >= 90) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setGenerationProgress(90);
        return;
      }
      setGenerationProgress(progressValue);
    }, 500);

    try {
      // Build history from previous messages
      const history = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Determine if this is an edit (has existing builds) or new generation
      const hasExistingBuilds = builds && builds.length > 0;
      const apiEndpoint = hasExistingBuilds ? '/api/edit' : '/api/generate';

      // Get session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      // Call API endpoint (edit if builds exist, generate if new)
      let response;
      try {
        response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          projectId: project.id,
          message: messageContent,
          history,
        }),
        });
      } catch (fetchError) {
        // Handle network failures
        if (fetchError instanceof TypeError) {
          throw new Error(direction === 'rtl'
            ? 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
            : 'Network error: Unable to connect to server. Please check your internet connection and try again.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        // Try to parse error response as JSON, fallback to text if it fails
        let errorMessage = 'Failed to generate website';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Handle project locked error specifically
          if (errorData.code === 'PROJECT_LOCKED' || response.status === 409) {
            toast({
              title: direction === 'rtl' ? 'المشروع قيد المعالجة' : 'Project Busy',
              description: direction === 'rtl' 
                ? 'المشروع قيد المعالجة حالياً. يرجى الانتظار حتى اكتمال العملية الحالية.'
                : 'The project is currently being processed. Please wait for the current operation to complete.',
              variant: 'destructive',
            });
            throw new Error(errorMessage);
          }
        } catch (parseError) {
          // If JSON parsing fails, try to get text response
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If text parsing also fails, use status-based message
            if (response.status === 429) {
              errorMessage = direction === 'rtl' 
                ? 'تم تجاوز الحد الأقصى للطلبات. يرجى الانتظار قليلاً والمحاولة مرة أخرى.'
                : 'Rate limit exceeded. Please wait a moment and try again.';
            } else if (response.status >= 500) {
              errorMessage = direction === 'rtl'
                ? 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.'
                : 'Server error. Please try again later.';
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      let buildResponse: BuildResponse;
      try {
        buildResponse = await response.json();
      } catch (parseError) {
        throw new Error(direction === 'rtl' 
          ? 'استجابة غير صالحة من الخادم'
          : 'Invalid response from server');
      }

      // Invalidate builds query to refetch
      queryClient.invalidateQueries({ queryKey: ['builds', projectId] });

      // Determine if this was an edit or generation
      const isEdit = hasExistingBuilds;
      const actionText = isEdit 
        ? (direction === 'rtl' ? 'تم التعديل' : 'Edited')
        : (direction === 'rtl' ? 'تم الإنشاء' : 'Generated');

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: isEdit
          ? (direction === 'rtl' 
              ? `تم تعديل موقعك بنجاح! (الإصدار ${buildResponse.version})` 
              : `Your website has been edited! (Version ${buildResponse.version})`)
          : (direction === 'rtl' 
              ? `تم إنشاء موقعك بنجاح! (الإصدار ${buildResponse.version})` 
              : `Your website has been generated! (Version ${buildResponse.version})`),
        buildVersion: buildResponse.version,
        timestamp: new Date(buildResponse.createdAt || new Date().toISOString()),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSelectedVersion(buildResponse.version);

      // Show success animation
      setShowSuccessAnimation(true);

      toast({
        title: actionText,
        description: isEdit
          ? (direction === 'rtl' 
              ? `تم تعديل الإصدار ${buildResponse.version} بنجاح` 
              : `Version ${buildResponse.version} edited successfully`)
          : (direction === 'rtl' 
              ? `تم إنشاء الإصدار ${buildResponse.version} بنجاح`
              : `Version ${buildResponse.version} created successfully`),
      });
      setGenerationProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setTimeout(() => setGenerationProgress(0), 1000);
    } catch (error) {
      console.error('Generation error:', error);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setGenerationProgress(0);
      
      // Improved error messages (A2)
      let errorTitle = direction === 'rtl' ? 'خطأ' : 'Error';
      let errorDescription = '';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          errorTitle = direction === 'rtl' ? 'خطأ في الاتصال' : 'Connection Error';
          errorDescription = direction === 'rtl'
            ? 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
            : 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (errorMsg.includes('locked') || errorMsg.includes('processing')) {
          errorTitle = direction === 'rtl' ? 'المشروع قيد المعالجة' : 'Project Busy';
          errorDescription = direction === 'rtl'
            ? 'المشروع قيد المعالجة حالياً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.'
            : 'The project is currently being processed. Please wait a moment and try again.';
        } else if (errorMsg.includes('timeout')) {
          errorTitle = direction === 'rtl' ? 'انتهت المهلة الزمنية' : 'Request Timeout';
          errorDescription = direction === 'rtl'
            ? 'استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى.'
            : 'The request took too long. Please try again.';
        } else if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
          errorTitle = direction === 'rtl' ? 'غير مصرح' : 'Unauthorized';
          errorDescription = direction === 'rtl'
            ? 'يجب عليك تسجيل الدخول أولاً.'
            : 'You must be logged in to perform this action.';
        } else {
          errorDescription = error.message;
        }
      } else {
        errorDescription = direction === 'rtl' ? 'فشل في إنشاء الموقع. يرجى المحاولة مرة أخرى.' : 'Failed to generate website. Please try again.';
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      inputRef.current?.focus();
    }
  };

  // Handle deployment to Netlify
  const handleDeploy = async (redeploy: boolean = false) => {
    if (!project || !selectedVersion) {
      toast({
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: direction === 'rtl' 
          ? 'يرجى تحديد إصدار للنشر'
          : 'Please select a version to deploy',
        variant: 'destructive',
      });
      return;
    }

    setIsDeploying(true);
    try {
      // Get session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      let response;
      try {
        response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          projectId: project.id,
          buildVersion: selectedVersion,
          redeploy,
          userId: user?.id,
        }),
        });
      } catch (fetchError) {
        // Handle network failures
        if (fetchError instanceof TypeError) {
          throw new Error(direction === 'rtl'
            ? 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
            : 'Network error: Unable to connect to server. Please check your internet connection and try again.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        // Try to parse error response as JSON, fallback to text
        let errorMessage = 'Failed to deploy';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          try {
            errorMessage = await response.text() || errorMessage;
          } catch {
            if (response.status === 429) {
              errorMessage = direction === 'rtl' 
                ? 'تم تجاوز الحد الأقصى للطلبات. يرجى الانتظار قليلاً.'
                : 'Rate limit exceeded. Please wait a moment.';
            } else if (response.status >= 500) {
              errorMessage = direction === 'rtl'
                ? 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.'
                : 'Server error. Please try again later.';
            }
          }
        }
        throw new Error(errorMessage);
      }

      // Parse successful response
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(direction === 'rtl' 
          ? 'استجابة غير صالحة من الخادم'
          : 'Invalid response from server');
      }
      
      // Refetch deployment
      await refetchDeployment();
      
      // Invalidate deployment query to refetch
      queryClient.invalidateQueries({ queryKey: ['deployment', projectId] });

      toast({
        title: direction === 'rtl' ? 'تم بدء النشر' : 'Deployment Started',
        description: direction === 'rtl'
          ? 'جاري نشر موقعك على Netlify...'
          : 'Deploying your site to Netlify...',
      });

      // Poll for deployment status
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max (deployments can take time)
      const pollInterval = setInterval(async () => {
        attempts++;
        
        // Refetch deployment from database via React Query
        const queryResult = await refetchDeployment();
        const latest = queryResult.data;
        
        console.log(`Polling deployment status (attempt ${attempts}/${maxAttempts}):`, latest);
        
        if (latest?.status === 'ready') {
          clearInterval(pollInterval);
          setShowSuccessAnimation(true);
          toast({
            title: direction === 'rtl' ? 'تم النشر بنجاح!' : 'Deployed Successfully!',
            description: direction === 'rtl'
              ? `موقعك الآن متاح على ${latest.url}`
              : `Your site is now live at ${latest.url}`,
          });
        } else if (latest?.status === 'error' || attempts >= maxAttempts) {
          clearInterval(pollInterval);
          toast({
            title: direction === 'rtl' ? 'فشل النشر' : 'Deployment Failed',
            description: direction === 'rtl'
              ? latest?.status === 'error' 
                ? 'حدث خطأ أثناء النشر. يرجى المحاولة مرة أخرى.'
                : 'استغرق النشر وقتاً طويلاً. يرجى التحقق من Netlify يدوياً.'
              : latest?.status === 'error'
                ? 'An error occurred during deployment. Please try again.'
                : 'Deployment is taking longer than expected. Please check Netlify manually.',
            variant: 'destructive',
          });
        }
      }, 2000); // Poll every 2 seconds instead of 1

      // Clear interval after max attempts
      setTimeout(() => clearInterval(pollInterval), maxAttempts * 1000);
    } catch (error) {
      console.error('Deployment error:', error);
      toast({
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: error instanceof Error 
          ? error.message 
          : (direction === 'rtl' ? 'فشل في النشر' : 'Failed to deploy'),
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
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

  // Show loading overlay if project is still loading
  if (projectLoading || buildsLoading || !project) {
    return (
      <div className="min-h-screen bg-gradient-soft flex flex-col pt-20">
        <div className="container mx-auto max-w-6xl px-6 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SuccessAnimation 
        show={showSuccessAnimation} 
        message={direction === 'rtl' ? 'تم بنجاح!' : 'Success!'}
        onComplete={() => setShowSuccessAnimation(false)}
      />
      <div className="min-h-screen bg-gradient-soft flex flex-col pt-20">
      {/* Header */}
      <header className="py-4 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-20 z-40">
        <div className="container mx-auto max-w-6xl flex items-center justify-between gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Link 
              href="/dashboard" 
              className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
            >
              <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">{project.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {builds.length} {t('dashboard.project.versions')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            {builds.length > 0 && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
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

                <Button variant="soft" asChild>
                  <Link href={`/preview/${project.id}?version=${selectedVersion}`} className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t('build.preview')}
                  </Link>
                </Button>

                {/* Deploy Button */}
                {latestDeployment?.status === 'ready' && latestDeployment.url ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDeploy(true)}
                      disabled={isDeploying}
                      className="flex items-center gap-2"
                    >
                      {isDeploying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {direction === 'rtl' ? 'جاري النشر...' : 'Deploying...'}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          {direction === 'rtl' ? 'إعادة النشر' : 'Redeploy'}
                        </>
                      )}
                    </Button>
                    <Button variant="default" asChild>
                      <a
                        href={latestDeployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {direction === 'rtl' ? 'عرض الموقع' : 'View Site'}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => handleDeploy(false)}
                    disabled={isDeploying || !selectedVersion}
                    className="flex items-center gap-2"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {direction === 'rtl' ? 'جاري النشر...' : 'Deploying...'}
                      </>
                    ) : latestDeployment?.status === 'building' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {direction === 'rtl' ? 'جاري النشر...' : 'Deploying...'}
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        {direction === 'rtl' ? 'نشر على Netlify' : 'Deploy to Netlify'}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
        <div 
          ref={chatContainerRef}
          className="space-y-4 sm:space-y-6 min-h-[calc(100vh-20rem)] sm:min-h-[calc(100vh-24rem)] max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-24rem)] overflow-y-auto pb-4"
        >
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">{t('build.title')}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {direction === 'rtl' 
                  ? 'صِف الموقع الذي تريد بناءه وسيقوم الذكاء الاصطناعي بإنشائه لك'
                  : 'Describe the website you want to build and our AI will generate it for you'
                }
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? (direction === 'rtl' ? 'flex-row-reverse' : 'flex-row') : (direction === 'rtl' ? 'flex-row-reverse' : 'flex-row')
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-soft text-primary"
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </div>

                {/* Message content */}
                <div className={cn(
                  "flex-1 max-w-xl",
                  message.role === 'user' && (direction === 'rtl' ? 'text-right' : 'text-left')
                )}>
                  <Card className={cn(
                    "px-4 py-3",
                    message.role === 'user' 
                      ? "bg-background"
                      : "bg-primary-soft border-primary/10"
                  )}>
                    <p className="text-sm">{message.content}</p>
                    
                    {message.buildVersion && (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t('preview.version')} {message.buildVersion}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="soft" asChild className="flex-1">
                            <Link href={`/preview/${project.id}?version=${message.buildVersion}`}>
                              <Eye className="h-3.5 w-3.5 me-1.5" />
                              {t('build.preview')}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            ))
          )}

          {isGenerating && (
            <div className={cn(
              "flex gap-3",
              direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
            )}>
              <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <Card className="px-4 py-4 bg-primary-soft border-primary/10 flex-1 max-w-xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-primary font-medium">
                      {direction === 'rtl' ? 'جاري الإنشاء...' : 'Generating your website...'}
                    </span>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {direction === 'rtl' 
                      ? 'يرجى الانتظار، هذا قد يستغرق دقيقة أو دقيقتين'
                      : 'Please wait, this may take a minute or two'
                    }
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border py-3 sm:py-4 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-2 sm:gap-3">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('build.placeholder')}
              disabled={isGenerating}
              className="flex-1 h-12"
            />
            <Button 
              variant="hero" 
              size="lg"
              onClick={handleSend}
              disabled={!inputValue.trim() || isGenerating}
              className="px-6"
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                  <span className="ms-2 hidden sm:inline">{t('build.send')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
