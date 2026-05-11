import React, { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingScreen } from '../components/LoadingScreen';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

// Lazy load components for performance optimization
// We point directly to components to avoid re-loading the entire index.ts file
const Dashboard = lazy(() => import('../components/Dashboard').then(m => ({ default: m.Dashboard })));
const Bookings = lazy(() => import('../components/Bookings').then(m => ({ default: m.Bookings })));
const Chat = lazy(() => import('../components/Chat').then(m => ({ default: m.Chat })));
const Availability = lazy(() => import('../components/Availability').then(m => ({ default: m.Availability })));
const Pricing = lazy(() => import('../components/Pricing').then(m => ({ default: m.Pricing })));
const Reviews = lazy(() => import('../components/Reviews').then(m => ({ default: m.Reviews })));
const KYC = lazy(() => import('../components/KYC').then(m => ({ default: m.KYC })));
const Settings = lazy(() => import('../components/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('../components/Profile').then(m => ({ default: m.Profile })));
const Notes = lazy(() => import('../components/Notes').then(m => ({ default: m.Notes })));
const Projects = lazy(() => import('../components/Projects').then(m => ({ default: m.Projects })));

export function AppRoutes() {
  const { currentPage } = useUIStore();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary>;
      case 'bookings':
        return <ErrorBoundary name="Bookings"><Bookings /></ErrorBoundary>;
      case 'chat':
        return <ErrorBoundary name="Chat"><Chat /></ErrorBoundary>;
      case 'availability':
        return <ErrorBoundary name="Availability"><Availability /></ErrorBoundary>;
      case 'pricing':
        return <ErrorBoundary name="Pricing"><Pricing /></ErrorBoundary>;
      case 'reviews':
        return <ErrorBoundary name="Reviews"><Reviews /></ErrorBoundary>;
      case 'kyc':
        return <ErrorBoundary name="KYC"><KYC /></ErrorBoundary>;
      case 'settings':
        return <ErrorBoundary name="Settings"><Settings /></ErrorBoundary>;
      case 'profile':
        return <ErrorBoundary name="Profile"><Profile /></ErrorBoundary>;
      case 'notes':
        return <ErrorBoundary name="Notes"><Notes /></ErrorBoundary>;
      case 'projects':
        return <ErrorBoundary name="Projects"><Projects /></ErrorBoundary>;
      default:
        return <ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary>;
    }
  };


  return (
    <DashboardLayout>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentPage}
          className="h-full"
          initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Suspense fallback={<LoadingScreen />}>
            {renderCurrentPage()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
}
