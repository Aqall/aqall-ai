import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getUserProjects, createProject, deleteProject, Project } from '@/lib/projectStore';
import { Plus, Folder, Clock, Layers, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { t, direction } = useLanguage();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?mode=login');
    }
  }, [user, authLoading, navigate]);

  // Load projects
  useEffect(() => {
    if (user) {
      const userProjects = getUserProjects(user.id);
      setProjects(userProjects);
    }
  }, [user]);

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !user) return;
    
    setIsCreating(true);
    const project = createProject(user.id, newProjectName.trim());
    setProjects(prev => [...prev, project]);
    setNewProjectName('');
    setDialogOpen(false);
    setIsCreating(false);
    
    toast({
      title: direction === 'rtl' ? 'تم إنشاء المشروع' : 'Project created',
      description: direction === 'rtl' ? 'يمكنك البدء في البناء الآن' : 'You can start building now',
    });

    // Navigate to the build page
    navigate(`/build/${project.id}`);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    toast({
      title: direction === 'rtl' ? 'تم حذف المشروع' : 'Project deleted',
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(direction === 'rtl' ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />

      <main className="pt-24 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t('dashboard.newProject')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('dashboard.newProject')}</DialogTitle>
                  <DialogDescription>
                    {direction === 'rtl' 
                      ? 'أدخل اسماً لمشروعك الجديد'
                      : 'Enter a name for your new project'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={direction === 'rtl' ? 'اسم المشروع' : 'Project name'}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {direction === 'rtl' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreating}>
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : (direction === 'rtl' ? 'إنشاء' : 'Create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <Card className="py-20">
              <CardContent className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {direction === 'rtl' ? 'لا توجد مشاريع' : 'No projects yet'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('dashboard.empty')}
                </p>
                <Button variant="hero" onClick={() => setDialogOpen(true)} className="flex items-center gap-2 mx-auto">
                  <Plus className="h-5 w-5" />
                  {t('dashboard.newProject')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} hover className="group">
                  <Link to={`/build/${project.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center group-hover:bg-primary transition-colors">
                          <Folder className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <CardTitle className="mt-4">{project.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDate(project.updatedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {project.builds.length} {t('dashboard.project.versions')}
                        </span>
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
