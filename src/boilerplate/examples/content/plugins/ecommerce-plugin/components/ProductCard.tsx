/**
 * Product Card Component
 * Displays product information with image, title, price, and actions
 */

import React from 'react';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    currency?: string;
    image?: {
      src: string;
      alt: string;
    };
    badge?: {
      text: string;
      variant: 'sale' | 'new' | 'bestseller' | 'limited';
    };
    rating?: {
      value: number;
      count: number;
    };
    inStock?: boolean;
    category?: string;
  };
  variant?: 'default' | 'compact' | 'featured' | 'list';
  showQuickAdd?: boolean;
  showWishlist?: boolean;
  showCompare?: boolean;
  className?: string;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
}

export default function ProductCard({
  product,
  variant = 'default',
  showQuickAdd = true,
  showWishlist = false,
  showCompare = false,
  className = '',
  onAddToCart,
  onAddToWishlist,
  onQuickView
}: ProductCardProps) {
  const {
    id,
    name,
    description,
    price,
    originalPrice,
    currency = 'USD',
    image,
    badge,
    rating,
    inStock = true,
    category
  } = product;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md';
  
  const variantClasses = {
    default: 'flex flex-col',
    compact: 'flex flex-col max-w-xs',
    featured: 'flex flex-col border-2 border-blue-500 shadow-lg',
    list: 'flex flex-row items-center'
  };

  const handleAddToCart = () => {
    if (onAddToCart && inStock) {
      onAddToCart(id);
    }
  };

  const handleAddToWishlist = () => {
    if (onAddToWishlist) {
      onAddToWishlist(id);
    }
  };

  const handleQuickView = () => {
    if (onQuickView) {
      onQuickView(id);
    }
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {/* Product Image */}
      <div className="relative group">
        {image && (
          <img
            src={image.src}
            alt={image.alt || name}
            className={`w-full object-cover ${
              variant === 'list' ? 'h-24 w-24' : 'h-48'
            }`}
          />
        )}
        
        {/* Badge */}
        {badge && (
          <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded ${
            badge.variant === 'sale' ? 'bg-red-500 text-white' :
            badge.variant === 'new' ? 'bg-green-500 text-white' :
            badge.variant === 'bestseller' ? 'bg-yellow-500 text-black' :
            'bg-purple-500 text-white'
          }`}>
            {badge.text}
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            {onQuickView && (
              <button
                onClick={handleQuickView}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                title="Quick View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}
            
            {showWishlist && (
              <button
                onClick={handleAddToWishlist}
                className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                title="Add to Wishlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Out of Stock Overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={`p-4 flex-1 ${variant === 'list' ? 'ml-4' : ''}`}>
        {/* Category */}
        {category && (
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {category}
          </div>
        )}

        {/* Product Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {name}
        </h3>

        {/* Description */}
        {description && variant !== 'compact' && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Rating */}
        {rating && (
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(rating.value) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              ({rating.count})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          
          {originalPrice && originalPrice > price && (
            <div className="text-sm font-semibold text-red-600">
              Save {Math.round(((originalPrice - price) / originalPrice) * 100)}%
            </div>
          )}
        </div>

        {/* Actions */}
        {showQuickAdd && (
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              inStock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        )}
      </div>
    </div>
  );
}

// Component metadata for the registry
export const metadata = {
  name: 'Product Card',
  description: 'Display product information with image, title, price, and actions',
  category: 'ecommerce',
  tags: ['product', 'card', 'ecommerce', 'shopping'],
  props: {
    product: {
      type: 'object',
      required: true,
      description: 'Product data object'
    },
    variant: {
      type: 'string',
      required: false,
      default: 'default',
      options: ['default', 'compact', 'featured', 'list'],
      description: 'Card variant style'
    },
    showQuickAdd: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Show quick add to cart button'
    },
    showWishlist: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Show wishlist button'
    },
    showCompare: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Show compare button'
    }
  }
};