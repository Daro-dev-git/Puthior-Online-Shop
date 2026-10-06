import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  Mail,
  Send,
  X,
  Copy,
  Check,
  ExternalLink,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Settings,
} from 'lucide-react';

interface EmailAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotes?: string;
}

export const EmailAlertModal: React.FC<EmailAlertModalProps> = ({ isOpen, onClose, initialNotes = '' }) => {
  const {
    kpis,
    settings,
    emailAlertRecipients,
    sendLowStockEmailAlert,
    lowStockItemsList,
    showToast,
    setCurrentView,
  } = useStore();

  const [customNotes, setCustomNotes] = useState(initialNotes);
  const [copied, setCopied] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  if (!isOpen) return null;

  const threshold = settings.LowStockThreshold || 5;
  const storeName = settings.StoreName || 'Girl Dress Shop';
  const alertCount = lowStockItemsList.length;

  const subject = `[Stock Alert] ${storeName}: ${alertCount} Products Below Threshold (≤${threshold} units)`;

  const handleCopy = () => {
    let text = `Subject: ${subject}\nTo: ${emailAlertRecipients.join(', ') || 'No recipients configured'}\n\n`;
    text += `INVENTORY RESTOCK ALERT - ${storeName.toUpperCase()}\n`;
    text += `Defined Alert Threshold: ${threshold} available units\n`;
    text += `Total Alert Items: ${alertCount} variant(s) requiring restock\n\n`;
    lowStockItemsList.forEach((item, idx) => {
      text += `${idx + 1}. [${item.productCode}] ${item.productName} (${item.size} / ${item.color}) - Stock: ${item.currentStock}/${item.threshold} - $${item.sellingPrice.toFixed(2)}\n`;
    });
    if (customNotes) {
      text += `\nADMIN NOTES: ${customNotes}\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Alert email summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDispatch = async (openMailClient = false) => {
    setIsDispatching(true);
    try {
      const res = await sendLowStockEmailAlert(customNotes);
      if (res.success && openMailClient && res.mailtoUrl) {
        window.location.href = res.mailtoUrl;
      }
      onClose();
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Low Stock Email Alert Notification
              </h3>
              <p className="text-xs text-stone-500">
                Dispatches alert notification to authorized administrators and staff email addresses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Recipient Address Overview */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-600" />
                <span>Alert Recipients ({emailAlertRecipients.length})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentView('settings');
                }}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Manage Valid User Emails →</span>
              </button>
            </div>

            {emailAlertRecipients.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  No alert emails configured yet. Go to <strong>Settings → Staff Accounts</strong> to add valid emails for your user roles.
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {emailAlertRecipients.map((em, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-stone-300 font-mono text-[11px] text-stone-800 shadow-2xs"
                  >
                    <span>{em}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Email Subject Line</label>
            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg font-mono text-stone-900 text-xs font-medium">
              {subject}
            </div>
          </div>

          {/* Email Body Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-stone-700">Formatted Email Content</label>
              <span className="text-[11px] text-stone-400">
                {alertCount} items currently below threshold (≤{threshold} units)
              </span>
            </div>
            <div className="p-3 bg-stone-900 text-stone-200 rounded-xl font-mono text-[11px] space-y-2 max-h-52 overflow-y-auto border border-stone-800 select-all">
              <div className="text-pink-400 font-bold">
                *** INVENTORY RESTOCK ALERT - {storeName.toUpperCase()} ***
              </div>
              <div className="text-stone-400">
                Threshold: ≤{threshold} available units | Alert Variants: {alertCount}
              </div>
              <div className="border-t border-stone-800 my-1 pt-1 space-y-1.5">
                {lowStockItemsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-stone-300">
                    <div>
                      <span className="text-white font-bold">{item.productCode}</span> {item.productName}
                      <span className="text-stone-500"> ({item.size}/{item.color})</span>
                    </div>
                    <div className="text-right">
                      <span className={item.currentStock === 0 ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
                        {item.currentStock === 0 ? '0 (OUT OF STOCK)' : `${item.currentStock} left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Administrator Notes Input */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Add Custom Notes for Warehouse / Purchasing Staff (Optional)
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Please expedite reordering size 90 and 100 before the weekend rush."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {settings.LastAlertEmailSent
                ? `Last sent: ${new Date(settings.LastAlertEmailSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'No alerts dispatched yet today'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              disabled={isDispatching || alertCount === 0}
              onClick={() => handleDispatch(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isDispatching ? 'Sending...' : 'Open Email Client (mailto:)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
