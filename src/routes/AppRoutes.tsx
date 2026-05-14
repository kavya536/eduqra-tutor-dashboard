import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useUIStore } from '../store/useUIStore';

// Direct imports for instant navigation
import { Dashboard } from '../components/Dashboard';
import { Bookings } from '../components/Bookings';
import { Chat } from '../components/Chat';
import { Availability } from '../components/Availability';
import { Pricing } from '../components/Pricing';
import { Reviews } from '../components/Reviews';
import { KYC } from '../components/KYC';
import Settings from '../components/Settings';
import { Profile } from '../components/Profile';
import { Notes } from '../components/Notes';
import { Projects } from '../components/Projects';
import Assignments from '../components/Assignments';

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
      case 'assignments':
        return <ErrorBoundary name="Assignments"><Assignments /></ErrorBoundary>;
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
          {renderCurrentPage()}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
}
