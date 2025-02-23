'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

const features = [
  {
    name: 'Sales and Revenue Tracking',
    description: 'Track your radio station\'s advertising sales and revenue in real-time with detailed analytics and reporting.',
    icon: '📊'
  },
  {
    name: 'Revenue Growth Analytics',
    description: 'Monitor revenue trends and growth patterns with advanced analytics tools designed specifically for radio stations.',
    icon: '📈'
  },
  {
    name: 'Performance Insights',
    description: 'Get actionable insights into your station\'s performance metrics and identify growth opportunities.',
    icon: '📊'
  },
  {
    title: 'Smart Revenue Tracking',
    description: 'Real-time analytics and reporting for all your advertising revenue streams.',
    icon: '📊'
  },
  {
    title: 'Automated Scheduling',
    description: 'AI-powered scheduling system to optimize your ad placements and avoid conflicts.',
    icon: '🎯'
  },
  {
    title: 'Invoice Management',
    description: 'Generate and send professional invoices automatically with payment tracking.',
    icon: '📝'
  },
  {
    title: 'Client Portal',
    description: 'Give your clients 24/7 access to their campaign performance and history.',
    icon: '🔐'
  },
  {
    title: 'Performance Analytics',
    description: 'Detailed insights into your station\'s performance and revenue growth.',
    icon: '📈'
  },
  {
    title: 'Mobile Access',
    description: 'Manage your radio station\'s revenue from anywhere with our mobile app.',
    icon: '📱'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">R</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  RadioRevenue
                </span>
              </Link>
            </div>
            <div className="hidden sm:flex sm:items-center sm:space-x-6">
              <Link 
                href="/auth/login"
                className="px-5 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors duration-200"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-80" />
          <div className="absolute inset-y-0 w-full h-full">
            <div className="h-full w-full bg-white" style={{ 
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundPosition: '0 0',
              backgroundSize: '60px 60px',
            }} />
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1 
              className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Transform Your Radio
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Revenue Stream
              </span>
            </motion.h1>
            <motion.p 
              className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Empower your radio station with our comprehensive solution for managing advertisements, 
              tracking revenue, and growing your business in the Nigerian market.
            </motion.p>
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Start Free Trial
                <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-slate-700 bg-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border border-slate-200"
              >
                See How It Works
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { label: 'Active Radio Stations', value: '100+' },
              { label: 'Revenue Generated', value: '₦500M+' },
              { label: 'Ads Managed', value: '50K+' },
              { label: 'Client Satisfaction', value: '98%' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h2 
              className="text-4xl font-bold text-slate-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Everything you need to succeed
            </motion.h2>
            <motion.p 
              className="mt-4 text-xl text-slate-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Powerful tools designed specifically for Nigerian radio stations
            </motion.p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name || feature.title}
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="h-full rounded-2xl bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{feature.icon}</span>
                    <div className="h-8 w-8 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors duration-200" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900">{feature.name || feature.title}</h3>
                  <p className="mt-4 text-slate-600">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600" />
        <div className="absolute inset-0 bg-slate-900/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white sm:text-5xl">
              Ready to transform your radio business?
            </h2>
            <p className="mt-6 text-xl text-blue-100 max-w-2xl mx-auto">
              Join the leading Nigerian radio stations already using RadioRevenue to streamline their operations.
            </p>
            <Link
              href="/auth/signup"
              className="mt-8 inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-blue-600 bg-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Start your free trial
              <ArrowRightIcon className="ml-2 -mr-1 h-6 w-6" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">R</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  RadioRevenue
                </span>
              </Link>
              <p className="mt-4 text-slate-600 max-w-md">
                Empowering Nigerian radio stations with modern tools for revenue management and growth.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Product</h3>
              <ul className="mt-4 space-y-4">
                {['Features', 'Pricing', 'Security', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-base text-slate-600 hover:text-slate-900">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Company</h3>
              <ul className="mt-4 space-y-4">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-base text-slate-600 hover:text-slate-900">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-200 pt-8">
            <p className="text-base text-slate-600 text-center">
              &copy; {new Date().getFullYear()} RadioRevenue. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
