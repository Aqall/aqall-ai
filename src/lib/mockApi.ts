// TODO: Connect real OpenAI pipeline in Cursor
// This is a mock API that simulates website generation

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'file' | 'folder';
}

export interface BuildResult {
  id: string;
  version: number;
  prompt: string;
  files: GeneratedFile[];
  timestamp: Date;
  previewHtml: string;
}

// Mock delay to simulate API call
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate mock React website structure based on prompt
export async function generateWebsite(prompt: string, projectId: string, currentVersion: number): Promise<BuildResult> {
  // Simulate API latency
  await delay(2000 + Math.random() * 1500);

  const isArabic = /[\u0600-\u06FF]/.test(prompt);
  const direction = isArabic ? 'rtl' : 'ltr';
  
  // Extract keywords from prompt to customize the mock
  const hasRestaurant = prompt.toLowerCase().includes('restaurant') || prompt.includes('مطعم');
  const hasPortfolio = prompt.toLowerCase().includes('portfolio') || prompt.includes('معرض');
  const hasStore = prompt.toLowerCase().includes('store') || prompt.toLowerCase().includes('shop') || prompt.includes('متجر');
  const hasLanding = prompt.toLowerCase().includes('landing') || prompt.includes('هبوط');

  let siteName = 'MyWebsite';
  let primaryColor = '#374F52';
  let heroTitle = isArabic ? 'مرحباً بكم' : 'Welcome';
  let heroSubtitle = isArabic ? 'موقعكم الجديد جاهز' : 'Your new website is ready';

  if (hasRestaurant) {
    siteName = isArabic ? 'المطعم الفاخر' : 'Fine Dining';
    heroTitle = isArabic ? 'مذاق لا يُنسى' : 'Unforgettable Taste';
    heroSubtitle = isArabic ? 'اكتشف أطباقنا المميزة' : 'Discover our signature dishes';
    primaryColor = '#8B4513';
  } else if (hasPortfolio) {
    siteName = isArabic ? 'أعمالي' : 'My Portfolio';
    heroTitle = isArabic ? 'مبدع | مطور | مصمم' : 'Creator | Developer | Designer';
    heroSubtitle = isArabic ? 'أنشئ تجارب رقمية مميزة' : 'Crafting digital experiences';
    primaryColor = '#2D3748';
  } else if (hasStore) {
    siteName = isArabic ? 'متجرنا' : 'Our Store';
    heroTitle = isArabic ? 'تسوق بسهولة' : 'Shop with Ease';
    heroSubtitle = isArabic ? 'أفضل المنتجات بأفضل الأسعار' : 'Best products at best prices';
    primaryColor = '#059669';
  } else if (hasLanding) {
    siteName = isArabic ? 'منتجنا' : 'Our Product';
    heroTitle = isArabic ? 'الحل الأمثل لأعمالك' : 'The Perfect Solution';
    heroSubtitle = isArabic ? 'ابدأ اليوم مجاناً' : 'Start free today';
    primaryColor = '#6366F1';
  }

  const files: GeneratedFile[] = [
    {
      path: 'package.json',
      type: 'file',
      content: JSON.stringify({
        name: siteName.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.0.0',
          vite: '^5.0.0',
          tailwindcss: '^3.4.0',
        },
      }, null, 2),
    },
    {
      path: 'src',
      type: 'folder',
      content: '',
    },
    {
      path: 'src/App.tsx',
      type: 'file',
      content: `import React from 'react';
import './index.css';

function App() {
  return (
    <div dir="${direction}" className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold" style={{ color: '${primaryColor}' }}>
            ${siteName}
          </h1>
          <div className="flex gap-6">
            <a href="#" className="hover:opacity-70">${isArabic ? 'الرئيسية' : 'Home'}</a>
            <a href="#" className="hover:opacity-70">${isArabic ? 'عنا' : 'About'}</a>
            <a href="#" className="hover:opacity-70">${isArabic ? 'تواصل' : 'Contact'}</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6" style={{ color: '${primaryColor}' }}>
            ${heroTitle}
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            ${heroSubtitle}
          </p>
          <button 
            className="px-8 py-3 rounded-lg text-white font-medium hover:opacity-90 transition"
            style={{ background: '${primaryColor}' }}
          >
            ${isArabic ? 'ابدأ الآن' : 'Get Started'}
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center mb-12" style={{ color: '${primaryColor}' }}>
            ${isArabic ? 'لماذا نحن؟' : 'Why Choose Us?'}
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white p-6 rounded-xl shadow-sm">
                <div 
                  className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white"
                  style={{ background: '${primaryColor}' }}
                >
                  {num}
                </div>
                <h4 className="text-xl font-semibold mb-2">
                  ${isArabic ? 'ميزة ' : 'Feature '}{num}
                </h4>
                <p className="text-gray-600">
                  ${isArabic ? 'وصف الميزة يأتي هنا. نص تجريبي لعرض المحتوى.' : 'Feature description goes here. Sample text to show content.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ background: '${primaryColor}' }}>
        <div className="container mx-auto px-6 text-center text-white">
          <p className="opacity-80">
            © 2024 ${siteName}. ${isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;`,
    },
    {
      path: 'src/index.css',
      type: 'file',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ${isArabic ? "'Cairo', " : ""}'Inter', system-ui, sans-serif;
}`,
    },
    {
      path: 'src/main.tsx',
      type: 'file',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    },
    {
      path: 'index.html',
      type: 'file',
      content: `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${siteName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: 'tailwind.config.js',
      type: 'file',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
    },
    {
      path: 'vite.config.ts',
      type: 'file',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
    },
    {
      path: 'README.md',
      type: 'file',
      content: `# ${siteName}

${isArabic ? 'تم إنشاء هذا المشروع بواسطة عقّل - منشئ المواقع بالذكاء الاصطناعي.' : 'This project was generated by Aqall - the AI website builder.'}

## ${isArabic ? 'كيفية التشغيل' : 'Getting Started'}

\`\`\`bash
npm install
npm run dev
\`\`\`

${isArabic ? 'افتح المتصفح على' : 'Open your browser at'} http://localhost:5173
`,
    },
  ];

  // Generate feature items for preview
  const featureItems = [1, 2, 3].map(num => `
    <div class="bg-white p-6 rounded-xl shadow-sm">
      <div class="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white" style="background: ${primaryColor}">${num}</div>
      <h4 class="text-xl font-semibold mb-2">${isArabic ? 'ميزة ' + num : 'Feature ' + num}</h4>
      <p class="text-gray-600">${isArabic ? 'وصف الميزة يأتي هنا. نص تجريبي لعرض المحتوى.' : 'Feature description goes here. Sample text to show content.'}</p>
    </div>
  `).join('');

  // Generate preview HTML
  const previewHtml = `
    <!DOCTYPE html>
    <html lang="${isArabic ? 'ar' : 'en'}" dir="${direction}">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${siteName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: ${isArabic ? "'Cairo', " : ""}'Inter', system-ui, sans-serif; }
      </style>
    </head>
    <body>
      <div class="min-h-screen bg-white">
        <nav class="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
          <div class="container mx-auto px-6 py-4 flex justify-between items-center">
            <h1 class="text-xl font-bold" style="color: ${primaryColor}">${siteName}</h1>
            <div class="flex gap-6">
              <a href="#" class="hover:opacity-70">${isArabic ? 'الرئيسية' : 'Home'}</a>
              <a href="#" class="hover:opacity-70">${isArabic ? 'عنا' : 'About'}</a>
              <a href="#" class="hover:opacity-70">${isArabic ? 'تواصل' : 'Contact'}</a>
            </div>
          </div>
        </nav>
        <section class="pt-32 pb-20 px-6">
          <div class="container mx-auto text-center">
            <h2 class="text-5xl font-bold mb-6" style="color: ${primaryColor}">${heroTitle}</h2>
            <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">${heroSubtitle}</p>
            <button class="px-8 py-3 rounded-lg text-white font-medium hover:opacity-90 transition" style="background: ${primaryColor}">
              ${isArabic ? 'ابدأ الآن' : 'Get Started'}
            </button>
          </div>
        </section>
        <section class="py-20 bg-gray-50">
          <div class="container mx-auto px-6">
            <h3 class="text-3xl font-bold text-center mb-12" style="color: ${primaryColor}">
              ${isArabic ? 'لماذا نحن؟' : 'Why Choose Us?'}
            </h3>
            <div class="grid md:grid-cols-3 gap-8">
              ${featureItems}
            </div>
          </div>
        </section>
        <footer class="py-12" style="background: ${primaryColor}">
          <div class="container mx-auto px-6 text-center text-white">
            <p class="opacity-80">© 2024 ${siteName}. ${isArabic ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.</p>
          </div>
        </footer>
      </div>
    </body>
    </html>
  `;

  return {
    id: `build-${Date.now()}`,
    version: currentVersion + 1,
    prompt,
    files,
    timestamp: new Date(),
    previewHtml,
  };
}

// Mock ZIP download
export function downloadProjectAsZip(files: GeneratedFile[], projectName: string) {
  // TODO: Implement real ZIP generation with JSZip
  // For now, create a simple JSON representation
  const zipContent = {
    projectName,
    files: files.map(f => ({
      path: f.path,
      type: f.type,
      content: f.type === 'file' ? f.content : null,
    })),
    generatedAt: new Date().toISOString(),
    generatedBy: 'Aqall - AI Website Builder',
  };

  const blob = new Blob([JSON.stringify(zipContent, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-project.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
