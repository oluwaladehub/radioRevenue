'use client';

import { useState, useEffect, useRef } from 'react';

interface TimeWheelProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export function TimeWheel({ value, onChange, className = '' }: TimeWheelProps) {
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [period, setPeriod] = useState('AM');
  const [isOpen, setIsOpen] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [timeStr] = value.split(':');
      let hour = parseInt(timeStr);
      if (hour >= 12) {
        setPeriod('PM');
        if (hour > 12) hour -= 12;
      } else {
        setPeriod('AM');
        if (hour === 0) hour = 12;
      }
      setHours(hour.toString().padStart(2, '0'));
      setMinutes(value.split(':')[1] || '00');
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wheelRef.current && !wheelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTimeChange = (type: 'hours' | 'minutes' | 'period', newValue: string) => {
    let hour = parseInt(hours);
    let minute = parseInt(minutes);

    if (type === 'hours') {
      hour = parseInt(newValue);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      setHours(newValue);
    } else if (type === 'minutes') {
      minute = parseInt(newValue);
      setMinutes(newValue);
    } else {
      setPeriod(newValue);
      if (newValue === 'PM' && hour !== 12) hour += 12;
      if (newValue === 'AM' && hour === 12) hour = 0;
      else if (newValue === 'AM' && hour > 12) hour -= 12;
    }

    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
    
    // Close the wheel after a selection is made
    if (type === 'minutes') {
      setIsOpen(false);
    }
  };

  const generateOptions = (start: number, end: number, step: number = 1) => {
    const options = [];
    for (let i = start; i <= end; i += step) {
      options.push(i.toString().padStart(2, '0'));
    }
    return options;
  };

  const hours12 = generateOptions(1, 12);
  const minuteOptions = generateOptions(0, 59, 5);

  return (
    <div className={`relative ${className}`} ref={wheelRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-white border rounded-lg shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all hover:bg-gray-50 ${
          className.includes('error') ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="text-base">
            {hours}:{minutes} {period}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fadeIn">
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Hours */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Hour</label>
                <div className="overflow-auto max-h-48 rounded-lg border border-gray-200 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50">
                  {hours12.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleTimeChange('hours', hour)}
                      className={`w-full px-4 py-2.5 text-base text-left hover:bg-blue-50 transition-colors ${
                        hours === hour ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Minute</label>
                <div className="overflow-auto max-h-48 rounded-lg border border-gray-200 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50">
                  {minuteOptions.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleTimeChange('minutes', minute)}
                      className={`w-full px-4 py-2.5 text-base text-left hover:bg-blue-50 transition-colors ${
                        minutes === minute ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Period</label>
                <div className="grid grid-rows-2 gap-2">
                  {['AM', 'PM'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleTimeChange('period', p)}
                      className={`px-4 py-3 text-base rounded-lg border transition-all ${
                        period === p
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
