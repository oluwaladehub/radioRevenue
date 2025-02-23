'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Jobs', href: '/dashboard/jobs', icon: '📝' },
  { name: 'Schedule', href: '/dashboard/schedule', icon: '📅' },
  { name: 'Invoices', href: '/dashboard/invoices', icon: '📄' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    setIsDialogOpen(true);
  };

  const confirmSignOut = async () => {
    await signOut();
    setIsDialogOpen(false);
  };

  const cancelSignOut = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      {/* Confirmation Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <h2 className="text-lg font-semibold">Confirm Sign Out</h2>
            <p>Are you sure you want to sign out?</p>
            <div className="flex justify-end mt-4">
              <button onClick={cancelSignOut} className="mr-2 px-4 py-2 bg-gray-300 rounded">Cancel</button>
              <button onClick={confirmSignOut} className="px-4 py-2 bg-red-600 text-white rounded">Sign Out</button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center space-x-2 transition-transform hover:scale-105">
                <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-lg font-bold">R</span>
                </div>
                <span className="text-xl font-bold">RadioRevenue</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center space-x-2">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                >
                  <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-medium">{user?.name?.[0] || 'U'}</span>
                  </div>
                  <span className="hidden md:block">{user?.name}</span>
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 text-gray-700 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link href="/dashboard/settings" className="block px-4 py-2 text-sm hover:bg-gray-50">Settings</Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden bg-white/5 backdrop-blur-sm animate-slideDown">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="flex items-center space-x-2">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Main content */}
        <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </>
  );
};

export default DashboardLayout;
