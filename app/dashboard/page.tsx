'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { listProjects, createProject, deleteProject } from '@/lib/projectService';
import { Plus, Folder, Clock, Trash2, Loader2, FolderOpen, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    }
  }
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [newProjectName, setNewProjectName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Timeout for auth loading (prevent infinite loading)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn('Auth loading timeout - proceeding anyway');
        setAuthTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [authLoading]);

  // Redirect if not logged in
  useEffect(() => {
    if ((!authLoading || authTimeout) && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, authLoading, authTimeout, router]);

  // Fetch projects using React Query
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => {
      if (!user) throw new Error('User not authenticated');
      return listProjects(user.id);
    },
    enabled: !!user && (!authLoading || authTimeout), // Enable query even if auth is loading after timeout
    refetchOnMount: true,
    retry: 2,
    retryDelay: 1000,
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('User not authenticated');
      return createProject(user.id, { name });
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      setNewProjectName('');
      setDialogOpen(false);
      
      setShowSuccessAnimation(true);
      toast({
        title: language === 'ar' ? 'تم إنشاء المشروع' : 'Project created',
        description: language === 'ar' ? 'يمكنك البدء في البناء الآن' : 'You can start building now',
      });

      // Navigate to the build page
      setTimeout(() => {
        router.push(`/build/${project.id}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل في إنشاء المشروع' : 'Failed to create project'),
        variant: 'destructive',
      });
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!user) throw new Error('User not authenticated');
      return deleteProject(user.id, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      toast({
        title: language === 'ar' ? 'تم حذف المشروع' : 'Project deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || (language === 'ar' ? 'فشل في حذف المشروع' : 'Failed to delete project'),
        variant: 'destructive',
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !user) return;
    createMutation.mutate(newProjectName.trim());
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المشروع؟' : 'Are you sure you want to delete this project?')) {
      deleteMutation.mutate(projectId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  // Show loading only if auth is loading and not timed out
  // Don't block on projectsLoading to allow navigation
  if (authLoading && !authTimeout && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we have a user but auth is still loading, show content anyway
  // This prevents the page from being stuck in loading state

  if (projectsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {language === 'ar' ? 'حدث خطأ في تحميل المشاريع' : 'Failed to load projects'}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['projects', user?.id] })}>
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SuccessAnimation 
        show={showSuccessAnimation} 
        message={language === 'ar' ? 'تم بنجاح!' : 'Success!'}
        onComplete={() => setShowSuccessAnimation(false)}
      />
      <div className="min-h-screen bg-gradient-mesh">
      <main className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <motion.div 
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground">
                {language === 'ar' ? 'أنشئ وأدر مشاريعك' : 'Create and manage your projects'}
              </p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="flex items-center gap-2 shadow-lg w-full sm:w-auto">
                  <Plus className="h-5 w-5" />
                  {t('dashboard.newProject')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('dashboard.newProject')}</DialogTitle>
                  <DialogDescription>
                    {language === 'ar' 
                      ? 'أدخل اسماً لمشروعك الجديد'
                      : 'Enter a name for your new project'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={language === 'ar' ? 'اسم المشروع' : 'Project name'}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    className="h-12"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'ar' ? 'إنشاء' : 'Create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Projects Grid */}
          {projectsLoading && projects.length === 0 ? (
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[1, 2, 3].map((i) => (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <Skeleton className="w-14 h-14 rounded-xl" />
                        <Skeleton className="w-8 h-8 rounded-lg" />
                      </div>
                      <Skeleton className="h-6 w-3/4 mt-4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="py-20 border-dashed">
                <CardContent className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <FolderOpen className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">
                    {language === 'ar' ? 'لا توجد مشاريع بعد' : 'No projects yet'}
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    {t('dashboard.empty')}
                  </p>
                  <Button variant="hero" onClick={() => setDialogOpen(true)} className="flex items-center gap-2 mx-auto shadow-lg">
                    <Sparkles className="h-5 w-5" />
                    {t('dashboard.newProject')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {projects.map((project) => (
                <motion.div key={project.id} variants={fadeInUp}>
                  <Card className="group overflow-hidden hover:shadow-elevated transition-all">
                    <Link href={`/build/${project.id}`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary-light/20 flex items-center justify-center group-hover:from-primary group-hover:to-primary-light transition-all duration-300">
                            <Folder className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <CardTitle className="mt-4 text-xl">{project.name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(project.updated_at)}
                          </span>
                          {/* TODO: Add builds count when builds table is integrated */}
                        </CardDescription>
                      </CardHeader>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
      </div>
    </>
  );
}
