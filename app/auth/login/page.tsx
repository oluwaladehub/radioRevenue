'use client';

import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const showSignupSuccess = searchParams.get('signup') === 'success';

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-white" style={{ 
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        backgroundPosition: '0 0',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="absolute top-0 left-0 p-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">R</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              RadioRevenue
            </span>
          </Link>
        </div>

        <motion.div 
          className="sm:mx-auto sm:w-full sm:max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Sign in to your account to continue
          </p>
        </motion.div>

        <motion.div 
          className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-white/70 backdrop-blur-lg py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-slate-200/50">
            {showSignupSuccess && (
              <motion.div 
                className="mb-6 bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Account created successfully! Please check your email to verify your account.
              </motion.div>
            )}
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
            >
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
