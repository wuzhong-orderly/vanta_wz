import { canUseEmbeddedWallet } from '@/utils/https-detection';
import { getRuntimeConfig } from '@/utils/runtime-config';

export const HttpsRequiredWarning = () => {
  const privyAppId = getRuntimeConfig('VITE_PRIVY_APP_ID');
  
  if (!privyAppId || canUseEmbeddedWallet()) {
    return null;
  }

  const handleSwitchToHttps = () => {
    const httpsUrl = window.location.href.replace(/^http:/, 'https:');
    window.location.href = httpsUrl;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              HTTPS Required
            </h1>
            <p className="text-white/90 text-lg">
              Secure connection needed to continue
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4 text-gray-300">
              <p className="text-lg">
                This application requires a <span className="text-white font-semibold">secure HTTPS connection</span> for embedded wallet functionality.
              </p>
              
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-200">
                  <strong className="text-blue-100">GitHub Pages Deployment:</strong> SSL certificates can take up to 24 hours to be created after deployment. Please wait for the certificate to be ready, then use the HTTPS URL below.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSwitchToHttps}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold text-lg rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                🔒 Switch to HTTPS Now
              </button>
              
              <p className="text-center text-sm text-gray-500 mt-3">
                You will be redirected to: <span className="text-blue-400">{window.location.href.replace(/^http:/, 'https:')}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
