import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getProject, addBuildToProject, Project } from '@/lib/projectStore';
import { generateWebsite, BuildResult } from '@/lib/mockApi';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Sparkles, 
  Eye, 
  Download,
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
  buildResult?: BuildResult;
  timestamp: Date;
}

export default function BuildChat() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (loadedProject) {
        setProject(loadedProject);
        // Reconstruct messages from builds
        const reconstructedMessages: ChatMessage[] = [];
        loadedProject.builds.forEach(build => {
          reconstructedMessages.push({
            id: `user-${build.id}`,
            role: 'user',
            content: build.prompt,
            timestamp: build.timestamp,
          });
          reconstructedMessages.push({
            id: `assistant-${build.id}`,
            role: 'assistant',
            content: direction === 'rtl' 
              ? `تم إنشاء موقعك بنجاح! (الإصدار ${build.version})` 
              : `Your website has been generated! (Version ${build.version})`,
            buildResult: build,
            timestamp: build.timestamp,
          });
        });
        setMessages(reconstructedMessages);
        if (loadedProject.builds.length > 0) {
          setSelectedVersion(loadedProject.builds.length);
        }
      } else {
        navigate('/dashboard');
      }
    }
  }, [projectId, navigate, direction]);

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
    setInputValue('');
    setIsGenerating(true);

    try {
      const currentVersion = project.builds.length;
      const buildResult = await generateWebsite(userMessage.content, project.id, currentVersion);
      
      // Update project with new build
      const updatedProject = addBuildToProject(project.id, buildResult);
      if (updatedProject) {
        setProject(updatedProject);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: direction === 'rtl' 
          ? `تم إنشاء موقعك بنجاح! (الإصدار ${buildResult.version})` 
          : `Your website has been generated! (Version ${buildResult.version})`,
        buildResult,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSelectedVersion(buildResult.version);

      toast({
        title: direction === 'rtl' ? 'تم الإنشاء' : 'Generated',
        description: direction === 'rtl' 
          ? `تم إنشاء الإصدار ${buildResult.version} بنجاح`
          : `Version ${buildResult.version} created successfully`,
      });
    } catch (error) {
      toast({
        title: direction === 'rtl' ? 'خطأ' : 'Error',
        description: direction === 'rtl' ? 'فشل في إنشاء الموقع' : 'Failed to generate website',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      inputRef.current?.focus();
    }
  };

  const getCurrentBuild = (): BuildResult | undefined => {
    if (!project || !selectedVersion) return undefined;
    return project.builds.find(b => b.version === selectedVersion);
  };

  if (authLoading || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentBuild = getCurrentBuild();

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      <Navbar />

      {/* Header */}
      <header className="pt-20 pb-4 px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-16 z-40">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard" 
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className={`h-5 w-5 ${direction === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.builds.length} {t('dashboard.project.versions')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {project.builds.length > 0 && (
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

                <Button variant="soft" asChild>
                  <Link to={`/preview/${project.id}?version=${selectedVersion}`} className="flex items-center gap-2">
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
      <main className="flex-1 container mx-auto max-w-4xl px-6 py-8">
        <div 
          ref={chatContainerRef}
          className="space-y-6 min-h-[calc(100vh-20rem)] max-h-[calc(100vh-20rem)] overflow-y-auto pb-4"
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
                    
                    {message.buildResult && (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{message.buildResult.files.filter(f => f.type === 'file').length} {direction === 'rtl' ? 'ملف' : 'files'}</span>
                          <span>•</span>
                          <span>{t('preview.version')} {message.buildResult.version}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="soft" asChild className="flex-1">
                            <Link to={`/preview/${project.id}?version=${message.buildResult.version}`}>
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
