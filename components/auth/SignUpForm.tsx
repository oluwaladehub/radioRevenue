'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { Database } from '@/lib/database.types';

type UserRole = Database['public']['Tables']['users']['Row']['role'];

export function SignUpForm() {
  const [status, setStatus] = useState('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'host' as UserRole,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setStatus('starting');
    
    try {
      setStatus('validating');
      // Basic validation
      if (!formData.email || !formData.password || !formData.name) {
        throw new Error('Please fill in all required fields');
      }

      setStatus('signing-up');
      console.log('Starting signup process with:', {
        email: formData.email,
        name: formData.name,
        role: formData.role
      });

      const result = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );

      setStatus('completed');
      setSuccess(result.message);
      console.log('Signup completed successfully');
    } catch (error: any) {
      console.error('Detailed signup error:', error);
      setStatus('error');
      setError(
        error?.message || 
        error?.error_description || 
        'Error creating account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Status indicator */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-md">
          Status: {status} {loading && '...'}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="host">Radio Host</option>
          <option value="advertiser">Advertiser</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>

      <div className="text-center mt-4">
        <span className="text-sm text-gray-600">Already have an account? </span>
        <Link href="/auth/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
          Sign in
        </Link>
      </div>
    </form>
  );
}
