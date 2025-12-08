import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const { direction } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          {direction === 'rtl' 
            ? 'عذراً! الصفحة غير موجودة'
            : 'Oops! Page not found'
          }
        </p>
        <Button variant="hero" asChild>
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            {direction === 'rtl' ? 'العودة للرئيسية' : 'Back to Home'}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
