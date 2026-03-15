import { useState, useEffect } from "react";

// Helper functions for cookie management
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export function CookieConsentTwo() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = getCookie('cookie_consent');
    if (consent === null) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const handleAccept = () => {
    setCookie('cookie_consent', 'accepted', 30);
    setIsAnimating(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleReject = () => {
    setCookie('cookie_consent', 'rejected', 30);
    setIsAnimating(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleManage = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Premium backdrop with subtle grain effect */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-500"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
        }} />

      {/* Cookie banner */}
      <div
        className={`fixed  bottom-0 left-0 md:bottom-5 md:left-5 max-w-3xl z-50 transition-all duration-700 ease-out ${isVisible && !isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}
        role="banner"
        aria-label="Cookie consent"
        style={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Animated top accent - premium gradient */}
        <div
          className="h-px relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 40%, #ec4899 60%, #f59e0b 80%, transparent 100%)',
          }}
        >
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex-col md:flex-row items-center justify-between py-4 gap-6">
            {/* Left content with premium styling */}
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight mb-2">
                  Cookie Preferences
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  We use essential cookies for functionality and analytics to improve your experience.
                  <button
                    onClick={handleManage}
                    className="ml-2 text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium transition-all duration-200 hover:scale-105 inline-flex items-center gap-1"
                  >
                    Customize
                    <svg className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </p>
              </div>
            </div>

            {/* Premium action buttons - Only show when not expanded */}
            {!isExpanded && (
              <div className="flex-col md:flex-row items-center md:justify-end space-y-3 md:space-y-0 md:space-x-3 flex-shrink-0 py-5">
                <button
                  onClick={handleReject}
                  className="group relative w-full md:w-auto px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all duration-300 rounded-lg border border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-sm overflow-hidden"
                >
                  <span className="relative z-10">Reject all</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-700/0 via-gray-600/20 to-gray-700/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>

                <button
                  onClick={handleAccept}
                  className="group relative w-full md:w-auto px-6 py-2 text-sm font-semibold text-gray-800 transition-all duration-300 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #fdf6e3 0%, #fff8f0 50%, #f5efe6 100%)',
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <span className="relative z-10">Accept All</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>
              </div>
            )}
          </div>

          {/* Premium expanded content */}
          <div className={`overflow-hidden transition-all duration-500 ease-out ${isExpanded ? 'max-h-[calc(100vh-200px)] pb-6' : 'max-h-0'
            }`}>
            <div className="border-t border-gray-800 pt-4 mt-2">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  {
                    title: "Essential",
                    color: "emerald",
                    required: true
                  },
                  {
                    title: "Analytics",
                    color: "blue",
                    required: false
                  },
                  {
                    title: "Marketing",
                    color: "purple",
                    required: false
                  }
                ].map((category, index) => (
                  <div
                    key={category.title}
                    className="group relative p-4 bg-gray-900/50 hover:border-gray-700 rounded-md"
                    style={{
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${category.color === 'emerald' ? 'bg-emerald-500' :
                            category.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                          } shadow-lg`} style={{
                            boxShadow: `0 0 20px ${category.color === 'emerald' ? 'rgba(16, 185, 129, 0.5)' :
                                category.color === 'blue' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(139, 92, 246, 0.5)'
                              }`,
                          }} />
                        <h3 className="font-semibold text-white text-sm">
                          {category.title}
                        </h3>
                      </div>

                      <div className={`relative ${category.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          defaultChecked={category.required}
                          disabled={category.required}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full transition-all duration-300 ${category.required
                            ? 'bg-gray-600'
                            : 'bg-gray-700 group-hover:bg-gray-600'
                          }`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-all duration-300 translate-x-0.5 translate-y-0.5 ${category.required ? 'translate-x-5' : ''
                            }`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex flex-col md:flex-row md:justify-end gap-3 w-full">
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg transition-all duration-200 flex-1 sm:flex-none"
                  >
                    Reject All
                  </button>
                  <button
                    onClick={handleAccept}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 transform hover:scale-105 flex-1 sm:flex-none"
                  >
                    Accept Current Selection
                  </button>
                  <button
                    onClick={handleAccept}
                    className="px-4 py-2 text-xs font-semibold text-gray-800 rounded-lg transition-all duration-200 transform hover:scale-105 flex-1 sm:flex-none"
                    style={{
                      background: 'linear-gradient(135deg, #fdf6e3 0%, #fff8f0 50%, #f5efe6 100%)',
                      boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    Accept All Cookies
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Animated top accent - premium gradient */}
        <div
          className="h-px relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 40%, #ec4899 60%, #f59e0b 80%, transparent 100%)',
          }}
        >
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />
        </div>

      </div>


      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}

export default CookieConsentTwo;