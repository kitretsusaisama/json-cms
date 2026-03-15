import { useState } from "react";

export function CookieConsentThree() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAccept = () => {
    setIsVisible(false);
    // Handle accept logic here
  };

  const handleReject = () => {
    setIsVisible(false);
    // Handle reject logic here
  };

  const handleManage = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-40 transition-opacity duration-300" />
      
      {/* Cookie banner */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 border-b border-orange-200/50 shadow-lg transition-all duration-500 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
        role="banner"
        aria-label="Cookie consent"
      >
        {/* Animated top accent line */}
        <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600 animate-pulse" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-4">
            {/* Left content */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-orange-600">
                <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-sm">🍪</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium leading-tight">
                  We use cookies to enhance your experience and analyze usage.
                  <button
                    onClick={handleManage}
                    className="ml-1 text-orange-600 hover:text-orange-700 underline underline-offset-2 font-medium transition-colors duration-200"
                  >
                    Learn more
                  </button>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleReject}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-md transition-all duration-200 border border-transparent hover:border-gray-200"
              >
                Decline
              </button>
              
              <button
                onClick={handleAccept}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
              >
                Accept All
              </button>
              
              <button
                onClick={() => setIsVisible(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-md transition-all duration-200 ml-1"
                aria-label="Close banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded content */}
          <div className={`overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? 'max-h-96 pb-4' : 'max-h-0'
          }`}>
            <div className="border-t border-orange-200/50 pt-4 mt-1">
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Essential Cookies
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Required for core site functionality, security, and user authentication. These cannot be disabled.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Analytics Cookies
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Help us understand how visitors interact with our website by collecting anonymous information.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-orange-200/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs">
                  <a 
                    href="/privacy" 
                    className="text-orange-600 hover:text-orange-700 underline underline-offset-2 font-medium transition-colors duration-200"
                  >
                    Privacy Policy
                  </a>
                  <a 
                    href="/cookies" 
                    className="text-orange-600 hover:text-orange-700 underline underline-offset-2 font-medium transition-colors duration-200"
                  >
                    Cookie Policy
                  </a>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-all duration-200"
                  >
                    Reject Non-Essential
                  </button>
                  <button
                    onClick={handleAccept}
                    className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-md shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
                  >
                    Accept All Cookies
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CookieConsentThree;