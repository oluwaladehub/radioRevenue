'use client';

import { useState, useEffect } from 'react';
import { clientsAPI } from '@/lib/api/index';
import { toast } from 'react-hot-toast';
import type { Database } from '@/lib/database.types';
import { useAuth } from '@/context/AuthContext';
import { TimeWheel } from '@/components/common/TimeWheel';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

type Client = Database['public']['Tables']['clients']['Row'];

interface JobFormData {
  title: string;
  client_id: string;
  client_name?: string;
  client_contact_person?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  duration: string;
  air_time: string;
  rate: number;
  schedule_dates: Date[];
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface JobFormProps {
  initialData?: JobFormData;
  onSubmit: (data: JobFormData) => void;
  onCancel: () => void;
}

const defaultFormData: JobFormData = {
  title: '',
  client_id: '',
  client_name: '',
  client_contact_person: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  duration: '',
  air_time: '',
  rate: 0,
  schedule_dates: [],
  description: '',
  status: 'scheduled',
};

const inputBaseClass = "mt-2 block w-full rounded-lg border-gray-300 shadow-sm sm:text-base py-3 px-4 focus:border-blue-500 focus:ring-blue-500 transition-colors";
const inputErrorClass = "border-red-300 focus:border-red-500 focus:ring-red-500";

export function JobForm({ initialData, onSubmit, onCancel }: JobFormProps) {
  const [formData, setFormData] = useState<JobFormData>(initialData || defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewClientFields, setShowNewClientFields] = useState(false);
  const { user } = useAuth();

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // If the field is client_name, search for clients
    if (field === 'client_name' && value.trim()) {
      searchClients(value);
      setShowNewClientFields(true);
    } else if (field === 'client_name') {
      setSuggestions([]);
      setShowSuggestions(false);
      setShowNewClientFields(false);
      // Clear client_id when client_name is cleared
      setFormData(prev => ({
        ...prev,
        client_id: '',
        client_contact_person: '',
        client_email: '',
        client_phone: '',
        client_address: ''
      }));
    }
  };

  const searchClients = async (query: string) => {
    try {
      setLoading(true);
      if (!user) return;
      
      const clients = await clientsAPI.listClients(user.id);
      const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(query.toLowerCase())
      );
      
      setSuggestions(filteredClients);
      setShowSuggestions(filteredClients.length > 0);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast.error('Failed to search clients');
    } finally {
      setLoading(false);
    }
  };

  const selectClient = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      client_name: client.name,
      client_id: client.id,
      client_contact_person: client.contact_person || '',
      client_email: client.email || '',
      client_phone: client.phone || '',
      client_address: client.address || ''
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setShowNewClientFields(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.client_name?.trim()) {
      newErrors.client_name = 'Client name is required';
    }
    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    }
    if (!formData.air_time.trim()) {
      newErrors.air_time = 'Air time is required';
    }
    if (!formData.rate) {
      newErrors.rate = 'Rate is required';
    }
    if (formData.schedule_dates.length === 0) {
      newErrors.schedule_dates = 'At least one date must be selected';
    }
    if (formData.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.client_email)) {
      newErrors.client_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create a job');
      return;
    }

    const jobToastId = 'jobSubmit';
    try {
      setIsSaving(true);
      let finalClientId = formData.client_id;

      // If no client_id but we have a client_name, create a new client
      if (!finalClientId && formData.client_name) {
        try {
          toast.loading('Creating new client...', { id: jobToastId });
          const newClient = await clientsAPI.createClient({
            name: formData.client_name,
            contact_person: formData.client_contact_person || null,
            email: formData.client_email || null,
            phone: formData.client_phone || null,
            address: formData.client_address || null,
            created_by: user.id
          });
          finalClientId = newClient.id;
        } catch (error) {
          console.error('Error creating new client:', error);
          toast.error('Failed to create new client', { id: jobToastId });
          setIsSaving(false);
          return;
        }
      }

      // Convert rate to number and ensure data matches database schema
      const submissionData = {
        ...formData,
        client_id: finalClientId,
        rate: typeof formData.rate === 'string' ? parseFloat(formData.rate) : formData.rate,
      };
      
      // Remove client fields as they're not needed in the database
      delete submissionData.client_name;
      delete submissionData.client_contact_person;
      delete submissionData.client_email;
      delete submissionData.client_phone;
      delete submissionData.client_address;

      toast.loading('Creating job...', { id: jobToastId });
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to create job. Please try again.', { id: jobToastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        {/* Left Column - Job Details */}
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-3">Job Details</h2>
          
          {/* Title field */}
          <div>
            <label htmlFor="title" className="block text-base font-medium text-gray-700">
              Job Title
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`${inputBaseClass} ${errors.title ? inputErrorClass : ''}`}
              placeholder="Enter job title..."
            />
            {errors.title && (
              <p className="mt-2 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Duration and Air Time fields */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="duration" className="block text-base font-medium text-gray-700">
                Duration
              </label>
              <input
                type="text"
                id="duration"
                placeholder="e.g., 30 sec"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className={`${inputBaseClass} ${errors.duration ? inputErrorClass : ''}`}
              />
              {errors.duration && (
                <p className="mt-2 text-sm text-red-600">{errors.duration}</p>
              )}
            </div>

            <div>
              <label htmlFor="air_time" className="block text-base font-medium text-gray-700">
                Air Time
              </label>
              <TimeWheel
                value={formData.air_time}
                onChange={(time) => handleInputChange('air_time', time)}
                className={errors.air_time ? 'error' : ''}
              />
              {errors.air_time && (
                <p className="mt-2 text-sm text-red-600">{errors.air_time}</p>
              )}
            </div>
          </div>

          {/* Rate field */}
          <div>
            <label htmlFor="rate" className="block text-base font-medium text-gray-700">
              Rate (₦)
            </label>
            <div className="relative mt-2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-base">₦</span>
              </div>
              <input
                type="number"
                id="rate"
                value={formData.rate}
                onChange={(e) => handleInputChange('rate', e.target.value)}
                className={`${inputBaseClass} pl-8 ${errors.rate ? inputErrorClass : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors.rate && (
              <p className="mt-2 text-sm text-red-600">{errors.rate}</p>
            )}
          </div>

          {/* Schedule Dates */}
          <div className="col-span-6">
            <label htmlFor="schedule_dates" className="block text-sm font-medium text-gray-700">
              Schedule Dates
            </label>
            <div className="mt-2">
              <DatePicker
                selected={null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const newDates = [...formData.schedule_dates];
                    const dateIndex = newDates.findIndex(
                      (d) => d.getTime() === date.getTime()
                    );
                    if (dateIndex === -1) {
                      newDates.push(date);
                    } else {
                      newDates.splice(dateIndex, 1);
                    }
                    handleInputChange('schedule_dates', newDates);
                  }
                }}
                className={`${inputBaseClass} ${errors.schedule_dates ? inputErrorClass : ''}`}
                dateFormat="MMMM d, yyyy"
                minDate={new Date()}
                placeholderText="Click to select dates"
                inline
                isClearable={false}
                highlightDates={formData.schedule_dates}
                dayClassName={(date) => {
                  return formData.schedule_dates.some(
                    (d) => d.getTime() === date.getTime()
                  )
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : '';
                }}
              />
            </div>
            {errors.schedule_dates && (
              <p className="mt-1 text-sm text-red-600">{errors.schedule_dates}</p>
            )}
            {formData.schedule_dates.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Dates:</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.schedule_dates.map((date, index) => (
                    <div
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                    >
                      {format(date, 'MMM d, yyyy')}
                      <button
                        type="button"
                        onClick={() => {
                          const newDates = formData.schedule_dates.filter((_, i) => i !== index);
                          handleInputChange('schedule_dates', newDates);
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description field */}
          <div>
            <label htmlFor="description" className="block text-base font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`${inputBaseClass}`}
              placeholder="Add any additional details about the job..."
            />
          </div>
        </div>

        {/* Right Column - Client Details */}
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-3">Client Information</h2>
          
          {/* Client Name with Suggestions */}
          <div className="relative">
            <label htmlFor="client" className="block text-base font-medium text-gray-700">
              Client Name
            </label>
            <input
              type="text"
              id="client"
              value={formData.client_name}
              onChange={(e) => handleInputChange('client_name', e.target.value)}
              onFocus={() => formData.client_name && setShowSuggestions(true)}
              className={`${inputBaseClass} ${errors.client_name ? inputErrorClass : ''}`}
              placeholder="Type client name..."
            />
            {errors.client_name && (
              <p className="mt-2 text-sm text-red-600">{errors.client_name}</p>
            )}
            
            {/* Client suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                <ul className="max-h-60 overflow-auto py-1 divide-y divide-gray-100">
                  {suggestions.map((client) => (
                    <li
                      key={client.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => selectClient(client)}
                    >
                      <div className="font-medium text-gray-900">{client.name}</div>
                      {client.contact_person && (
                        <div className="text-sm text-gray-500 mt-1">{client.contact_person}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Additional Client Fields */}
          {showNewClientFields && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label htmlFor="client_contact_person" className="block text-base font-medium text-gray-700">
                  Contact Person
                </label>
                <input
                  type="text"
                  id="client_contact_person"
                  value={formData.client_contact_person}
                  onChange={(e) => handleInputChange('client_contact_person', e.target.value)}
                  className={inputBaseClass}
                  placeholder="Enter contact person name..."
                />
              </div>

              <div>
                <label htmlFor="client_email" className="block text-base font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="client_email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  className={`${inputBaseClass} ${errors.client_email ? inputErrorClass : ''}`}
                  placeholder="Enter email address..."
                />
                {errors.client_email && (
                  <p className="mt-2 text-sm text-red-600">{errors.client_email}</p>
                )}
              </div>

              <div>
                <label htmlFor="client_phone" className="block text-base font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  id="client_phone"
                  value={formData.client_phone}
                  onChange={(e) => handleInputChange('client_phone', e.target.value)}
                  className={inputBaseClass}
                  placeholder="Enter phone number..."
                />
              </div>

              <div>
                <label htmlFor="client_address" className="block text-base font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="client_address"
                  rows={3}
                  value={formData.client_address}
                  onChange={(e) => handleInputChange('client_address', e.target.value)}
                  className={inputBaseClass}
                  placeholder="Enter full address..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit and Cancel buttons */}
      <div className="flex justify-end space-x-4 mt-12 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className={`px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
            isSaving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? 'Saving...' : 'Save Job'}
        </button>
      </div>
    </form>
  );
}
