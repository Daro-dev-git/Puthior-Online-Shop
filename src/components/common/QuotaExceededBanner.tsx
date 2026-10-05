import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { AlertCircle, ExternalLink, RefreshCw, X, Database } from 'lucide-react';

export const QuotaExceededBanner: React.FC = () => {
  const { isQuotaExceeded, quotaUpgradeUrl } = useStore();
  const [dismissed, setDismissed] = useState(false);

  if (!isQuotaExceeded || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5 flex-wrap">
              <span>Firestore Daily Read Quota Exceeded (Free Tier Limit)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-mono">
                Spark Free Plan
              </span>
            </div>
            <p className="text-amber-800/90 mt-0.5 leading-relaxed">
              The free daily read unit limit has been reached for this Firestore database. Quota limits reset daily.
              <strong> The app is operating normally with local cached data</strong> so you can continue managing products, POS sales, and inventory without interruption.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <a
            href={quotaUpgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-2xs transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Upgrade / Enable Billing</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => window.location.reload()}
            title="Reload application"
            className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            title="Dismiss notice"
            className="p-1.5 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
