import { useState } from "react";

export function CookieConsentFour() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Cookie category preferences
  const [preferences, setPreferences] = useState({
    essential: true,    // Always true, can't be changed
    analytics: false,
    marketing: false,
    functional: false
  });

  const handleAccept = () => {
    // Accept all cookies
    setPreferences({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    });
    setIsAnimating(true);
    setTimeout(() => setIsVisible(false), 300);
    console.log('Accepted all cookies:', { essential: true, analytics: true, marketing: true, functional: true });
  };

  const handleReject = () => {
    // Only keep essential cookies
    setPreferences({
      essential: true,
      analytics: false,
      marketing: false,
      functional: false
    });
    setIsAnimating(true);
    setTimeout(() => setIsVisible(false), 300);
    console.log('Rejected optional cookies:', { essential: true, analytics: false, marketing: false, functional: false });
  };

  const handleSavePreferences = () => {
    setIsAnimating(true);
    setTimeout(() => setIsVisible(false), 300);
    console.log('Saved preferences:', preferences);
  };

  const togglePreference = (key: string) => {
    if (key === 'essential') return; // Can't toggle essential cookies
    
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof preferences]
    }));
  };

  const handleManage = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) return null;

  const cookieCategories = [
    {
      key: 'essential',
      title: "Essential",
      description: "Core functionality, security, and user authentication. Always active for proper site operation.",
      color: "emerald",
      icon: "🔒",
      required: true,
      enabled: preferences.essential
    },
    {
      key: 'functional',
      title: "Functional",
      description: "Enhanced features like chat widgets, videos, and interactive content for better user experience.",
      color: "blue",
      icon: "⚙️",
      required: false,
      enabled: preferences.functional
    },
    {
      key: 'analytics',
      title: "Analytics",
      description: "Usage patterns and performance metrics to improve our service and user experience.",
      color: "purple",
      icon: "📊",
      required: false,
      enabled: preferences.analytics
    },
    {
      key: 'marketing',
      title: "Marketing",
      description: "Personalized content and targeted advertising experiences based on your preferences.",
      color: "pink",
      icon: "🎯",
      required: false,
      enabled: preferences.marketing
    }
  ];

  return (
    <>
      {/* Ultra-premium backdrop with noise texture */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 transition-all duration-700" 
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.1) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
          `,
        }} 
      />
      
      {/* Premium cookie banner */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out ${
          isVisible && !isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
        role="banner"
        aria-label="Cookie consent"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(0, 0, 0, 0.95) 0%, 
              rgba(17, 17, 17, 0.95) 25%, 
              rgba(5, 5, 5, 0.95) 75%, 
              rgba(0, 0, 0, 0.95) 100%
            )
          `,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Animated gradient border */}
        <div 
          className="h-0.5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #8b5cf6 25%, #3b82f6 50%, #ec4899 75%, transparent 100%)',
            animation: 'gradientShift 4s ease-in-out infinite',
          }}
        >
          <div 
            className="absolute inset-0 opacity-60"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
              animation: 'shimmerSlow 3s ease-in-out infinite',
            }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between py-5 gap-8">
            {/* Enhanced left content */}
            <div className="flex items-center gap-5 flex-1 min-w-0">
              {/* Premium 3D cookie icon */}
              <div className="relative flex items-center justify-center">
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
                <div 
                  className="relative w-10 h-10 rounded-full border flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300"
                  style={{
                    background: 'linear-gradient(145deg, #1f1f1f, #0a0a0a)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    boxShadow: `
                      0 8px 32px rgba(0, 0, 0, 0.4),
                      inset 0 1px 2px rgba(255, 255, 255, 0.1),
                      inset 0 -1px 2px rgba(0, 0, 0, 0.5)
                    `,
                  }}
                >
                  <span className="text-lg filter drop-shadow-sm">🍪</span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Cookie Preferences
                  </h2>
                  <div 
                    className="px-3 py-1 text-xs font-semibold text-white rounded-full shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    Required
                  </div>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  We use cookies to enhance your browsing experience and analyze our traffic.
                  <button
                    onClick={handleManage}
                    className="ml-2 text-blue-400 hover:text-blue-300 underline underline-offset-2 font-semibold transition-all duration-200 hover:scale-105 inline-flex items-center gap-1.5 group"
                  >
                    Manage preferences
                    <svg 
                      className={`w-3.5 h-3.5 transition-all duration-300 group-hover:scale-110 ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </p>
              </div>
            </div>

            {/* Enhanced action buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleReject}
                className="group relative px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white transition-all duration-300 rounded-xl border overflow-hidden transform hover:scale-105"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  background: 'linear-gradient(145deg, rgba(30, 30, 30, 0.8), rgba(10, 10, 10, 0.8))',
                  backdropFilter: 'blur(10px)',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)',
                }}
              >
                <span className="relative z-10">Decline</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
              
              <button
                onClick={handleAccept}
                className="group relative px-6 py-2.5 text-sm font-bold text-white transition-all duration-300 rounded-xl overflow-hidden shadow-xl transform hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 25%, #ec4899 75%, #f59e0b 100%)',
                  boxShadow: `
                    0 8px 32px rgba(139, 92, 246, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 2px rgba(255, 255, 255, 0.2)
                  `,
                }}
              >
                <span className="relative z-10">Accept All</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
              
              <button
                onClick={() => setIsVisible(false)}
                className="group p-2.5 text-gray-400 hover:text-white transition-all duration-300 rounded-xl border border-transparent hover:border-white/10"
                style={{
                  background: 'linear-gradient(145deg, rgba(30, 30, 30, 0.6), rgba(10, 10, 10, 0.6))',
                  backdropFilter: 'blur(10px)',
                }}
                aria-label="Close banner"
              >
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Enhanced expanded content */}
          <div className={`overflow-hidden transition-all duration-700 ease-out ${
            isExpanded ? 'max-h-[600px] pb-8' : 'max-h-0'
          }`}>
            <div className="border-t border-white/5 pt-8 mt-2">
              <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                {cookieCategories.map((category, index) => (
                  <div 
                    key={category.key}
                    className="group relative p-6 rounded-2xl transition-all duration-500 hover:transform hover:scale-105 cursor-pointer"
                    style={{
                      background: `
                        linear-gradient(145deg, 
                          rgba(25, 25, 25, 0.8) 0%, 
                          rgba(15, 15, 15, 0.8) 100%
                        )
                      `,
                      border: `1px solid ${
                        category.enabled 
                          ? category.color === 'emerald' ? 'rgba(16, 185, 129, 0.3)' :
                            category.color === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                            category.color === 'purple' ? 'rgba(139, 92, 246, 0.3)' :
                            'rgba(236, 72, 153, 0.3)'
                          : 'rgba(255, 255, 255, 0.08)'
                      }`,
                      boxShadow: `
                        0 8px 32px rgba(0, 0, 0, 0.3),
                        inset 0 1px 2px rgba(255, 255, 255, 0.05),
                        ${category.enabled ? 
                          `0 0 20px ${
                            category.color === 'emerald' ? 'rgba(16, 185, 129, 0.1)' :
                            category.color === 'blue' ? 'rgba(59, 130, 246, 0.1)' :
                            category.color === 'purple' ? 'rgba(139, 92, 246, 0.1)' :
                            'rgba(236, 72, 153, 0.1)'
                          }` : '0 0 0 rgba(0,0,0,0)'
                        }
                      `,
                      backdropFilter: 'blur(20px)',
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
                    }}
                    onClick={() => togglePreference(category.key)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-xl">{category.icon}</div>
                        <div>
                          <h3 className="font-bold text-white text-base mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                            {category.title}
                          </h3>
                          {category.required && (
                            <span className="text-xs text-gray-500 font-medium">Always Active</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Premium toggle switch */}
                      <div className={`relative ${category.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div 
                          className={`w-12 h-6 rounded-full transition-all duration-300 shadow-inner ${
                            category.enabled 
                              ? category.color === 'emerald' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                category.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                category.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                                'bg-gradient-to-r from-pink-500 to-pink-600'
                              : 'bg-gray-700'
                          }`}
                          style={{
                            boxShadow: category.enabled ? 
                              `
                                inset 0 2px 4px rgba(0, 0, 0, 0.2),
                                0 0 12px ${
                                  category.color === 'emerald' ? 'rgba(16, 185, 129, 0.3)' :
                                  category.color === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                                  category.color === 'purple' ? 'rgba(139, 92, 246, 0.3)' :
                                  'rgba(236, 72, 153, 0.3)'
                                }
                              ` : 
                              'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <div 
                            className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300 translate-y-0.5 ${
                              category.enabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                            style={{
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-8 text-xs">
                  {[
                    { label: "Privacy Policy", href: "/privacy", icon: "🔒" },
                    { label: "Cookie Policy", href: "/cookies", icon: "🍪" },
                    { label: "Terms of Service", href: "/terms", icon: "📄" }
                  ].map((link) => (
                    <a 
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 text-gray-400 hover:text-blue-400 font-semibold transition-all duration-200 hover:scale-105 group"
                    >
                      <span className="group-hover:animate-bounce">{link.icon}</span>
                      <span className="underline underline-offset-2">{link.label}</span>
                    </a>
                  ))}
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={handleSavePreferences}
                    className="group relative px-6 py-3 text-sm font-semibold text-gray-300 hover:text-white transition-all duration-300 rounded-xl border overflow-hidden transform hover:scale-105"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      background: 'linear-gradient(145deg, rgba(40, 40, 40, 0.8), rgba(20, 20, 20, 0.8))',
                      backdropFilter: 'blur(10px)',
                      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span className="relative z-10">Save Preferences</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                  <button
                    onClick={handleAccept}
                    className="group relative px-6 py-3 text-sm font-bold text-white transition-all duration-300 rounded-xl overflow-hidden shadow-xl transform hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 25%, #ec4899 75%, #f59e0b 100%)',
                      boxShadow: `
                        0 8px 32px rgba(139, 92, 246, 0.4),
                        0 0 0 1px rgba(255, 255, 255, 0.1),
                        inset 0 1px 2px rgba(255, 255, 255, 0.2)
                      `,
                    }}
                  >
                    <span className="relative z-10">Accept All Cookies</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmerSlow {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}

export default CookieConsentFour;