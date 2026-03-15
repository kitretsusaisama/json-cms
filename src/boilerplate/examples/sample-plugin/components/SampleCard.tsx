/**
 * Sample Card Component
 * A sample React component provided by the sample plugin
 */

import React from 'react';

export interface SampleCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  link?: {
    url: string;
    text: string;
  };
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
}

export default function SampleCard({
  title,
  description,
  imageUrl,
  link,
  variant = 'default',
  className = ''
}: SampleCardProps) {
  const baseClasses = 'bg-white rounded-lg shadow-md overflow-hidden';
  const variantClasses = {
    default: 'p-6',
    featured: 'p-8 border-2 border-blue-500',
    compact: 'p-4'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {imageUrl && (
        <div className="mb-4">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-48 object-cover rounded-md"
          />
        </div>
      )}
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-gray-600 mb-4">
            {description}
          </p>
        )}
        
        {link && (
          <a
            href={link.url}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {link.text}
            <svg
              className="ml-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// Component metadata for the registry
export const metadata = {
  name: 'Sample Card',
  description: 'A sample card component from the plugin system',
  category: 'content',
  tags: ['card', 'sample', 'plugin'],
  props: {
    title: {
      type: 'string',
      required: true,
      description: 'The card title'
    },
    description: {
      type: 'string',
      required: false,
      description: 'Optional card description'
    },
    imageUrl: {
      type: 'string',
      required: false,
      description: 'Optional image URL'
    },
    link: {
      type: 'object',
      required: false,
      description: 'Optional link object with url and text'
    },
    variant: {
      type: 'string',
      required: false,
      default: 'default',
      options: ['default', 'featured', 'compact'],
      description: 'Card variant style'
    }
  }
};