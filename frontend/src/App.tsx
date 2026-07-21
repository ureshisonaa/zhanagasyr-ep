import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout/MainLayout';
import { useAuthStore } from './store/authStore';

/**
 * Lazy import страниц (Этап 12.2, Roadmap: "платформа остаётся быстрой
 * при росте данных") — каждая страница попадает в отдельный JS-чанк,
 * загружаемый только при переходе на неё, а не в единый бандл при первой
 * загрузке приложения. MainLayout/ProtectedRoute остаются обычным
 * импортом — это каркас, нужный на каждой защищённой странице сразу,
 * лениво грузить нечего выигрывать.
 */
const Login = lazy(() => import('./pages/Login/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() =>
  import('./pages/Dashboard/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const NewApplicationWizard = lazy(() =>
  import('./pages/Applications/NewApplicationWizard/NewApplicationWizard').then((m) => ({
    default: m.NewApplicationWizard,
  })),
);
const Workspace = lazy(() =>
  import('./pages/Applications/Workspace/Workspace').then((m) => ({ default: m.Workspace })),
);
const Universities = lazy(() =>
  import('./pages/Universities/Universities').then((m) => ({ default: m.Universities })),
);
const UniversityDetail = lazy(() =>
  import('./pages/Universities/UniversityDetail').then((m) => ({ default: m.UniversityDetail })),
);
const Calendar = lazy(() =>
  import('./pages/Calendar/Calendar').then((m) => ({ default: m.Calendar })),
);
const Settings = lazy(() =>
  import('./pages/Settings/Settings').then((m) => ({ default: m.Settings })),
);
const StudentsList = lazy(() =>
  import('./pages/Mentor/StudentsList').then((m) => ({ default: m.StudentsList })),
);
const StudentApplications = lazy(() =>
  import('./pages/Mentor/StudentApplications').then((m) => ({ default: m.StudentApplications })),
);
const ApplicationReview = lazy(() =>
  import('./pages/Mentor/ApplicationReview').then((m) => ({ default: m.ApplicationReview })),
);
const AdminPanel = lazy(() =>
  import('./pages/Admin/AdminPanel').then((m) => ({ default: m.AdminPanel })),
);

function RouteFallback(): JSX.Element {
  return <div className="px-6 py-10 text-sm text-ink-500">Загрузка...</div>;
}

function App(): JSX.Element {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/applications/new" element={<NewApplicationWizard />} />
              <Route path="/applications/:id" element={<Workspace />} />
              <Route path="/universities" element={<Universities />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/universities/:id" element={<UniversityDetail />} />
              <Route path="/settings" element={<Settings />} />

              <Route element={<ProtectedRoute allowedRoles={['Mentor', 'Admin', 'SuperAdmin']} />}>
                <Route path="/mentor/students" element={<StudentsList />} />
                <Route path="/mentor/students/:userId" element={<StudentApplications />} />
                <Route path="/mentor/applications/:id" element={<ApplicationReview />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} />}>
                <Route path="/admin" element={<AdminPanel />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
