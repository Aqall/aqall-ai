'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getProjectById } from '@/lib/projectService';
import { getBuildsByProject } from '@/lib/buildService';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Sparkles, 
  Eye, 
  Clock,
  ChevronDown,
  User
} from 'lucide-react';
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
  const { t, direction } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, authLoading, router]);

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

      // Call API endpoint (edit if builds exist, generate if new)
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          message: messageContent,
          history,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || 'Failed to generate website';
        
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
        
        throw new Error(errorMessage);
      }

      const buildResponse: BuildResponse = await response.json();

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
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: error instanceof Error 
          ? error.message 
          : (direction === 'rtl' ? 'فشل في إنشاء الموقع' : 'Failed to generate website'),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      inputRef.current?.focus();
    }
  };

  // Show loading only if auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading overlay if project is still loading
  if (projectLoading || buildsLoading || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col pt-20">
      {/* Header */}
      <header className="py-4 px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-20 z-40">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {builds.length} {t('dashboard.project.versions')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto max-w-4xl px-6 py-6">
        <div 
          ref={chatContainerRef}
          className="space-y-6 min-h-[calc(100vh-24rem)] max-h-[calc(100vh-24rem)] overflow-y-auto pb-4"
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
              <Card className="px-4 py-3 bg-primary-soft border-primary/10">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-primary">{t('build.generating')}</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border py-4 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex gap-3">
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
  );
}
