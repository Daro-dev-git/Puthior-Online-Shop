import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { AppUser } from '../../types';
import { isValidEmail, normalizeEmail } from '../../utils/validators';
import { EmailAlertModal } from '../common/EmailAlertModal';
import {
  ShieldCheck,
  User,
  Plus,
  Trash2,
  Save,
  Users,
  Lock,
  Edit2,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  Store,
  Receipt,
  Sparkles,
  Mail,
  BellRing,
  Bell,
  Send,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    sizes,
    addSize,
    deleteSize,
    colors,
    addColor,
    deleteColor,
    priceCategories,
    currentUser,
    users,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    showToast,
    emailAlertRecipients,
    sendLowStockEmailAlert,
    kpis,
  } = useStore();

  // Store form state
  const [storeName, setStoreName] = useState(settings.StoreName);
  const [tagline, setTagline] = useState(settings.Tagline);
  const [phone, setPhone] = useState(settings.Phone);
  const [email, setEmail] = useState(settings.Email);
  const [address, setAddress] = useState(settings.Address);
  const [currency, setCurrency] = useState(settings.Currency);
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.LowStockThreshold);
  const [receiptFooter, setReceiptFooter] = useState(settings.ReceiptFooterMessage);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(settings.EmailAlertsEnabled ?? true);
  const [alertEmailRecipients, setAlertEmailRecipients] = useState(settings.AlertEmailRecipients || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showEmailAlertModal, setShowEmailAlertModal] = useState(false);

  // Sync settings when loaded or changed from cloud Firestore database
  useEffect(() => {
    if (settings) {
      setStoreName(settings.StoreName || '');
      setTagline(settings.Tagline || '');
      setPhone(settings.Phone || '');
      setEmail(settings.Email || '');
      setAddress(settings.Address || '');
      setCurrency(settings.Currency || '$');
      setLowStockThreshold(settings.LowStockThreshold || 5);
      setReceiptFooter(settings.ReceiptFooterMessage || '');
      setEmailAlertsEnabled(settings.EmailAlertsEnabled ?? true);
      setAlertEmailRecipients(settings.AlertEmailRecipients || '');
    }
  }, [settings]);

  // New size input
  const [newSizeValue, setNewSizeValue] = useState('');

  // New color input
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#EC4899');

  // Staff Account Creation modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newStaffNumber, setNewStaffNumber] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffReceiveAlerts, setNewStaffReceiveAlerts] = useState(true);
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'sales_staff'>('sales_staff');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit Staff Account modal state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editReceiveAlerts, setEditReceiveAlerts] = useState(true);
  const [editRole, setEditRole] = useState<'admin' | 'sales_staff'>('sales_staff');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // In-app Delete User Confirmation state (avoids blocked window.confirm)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateSettings({
        StoreName: storeName.trim(),
        Tagline: tagline.trim(),
        Phone: phone.trim(),
        Email: email.trim(),
        Address: address.trim(),
        Currency: currency,
        LowStockThreshold: lowStockThreshold,
        ReceiptFooterMessage: receiptFooter.trim(),
        EmailAlertsEnabled: emailAlertsEnabled,
        AlertEmailRecipients: alertEmailRecipients.trim(),
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddSizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeValue.trim()) return;
    const res = addSize(newSizeValue.trim());
    if (res.success) setNewSizeValue('');
  };

  const handleAddColorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim()) return;
    const res = addColor(newColorName.trim(), newColorHex);
    if (res.success) {
      setNewColorName('');
      setNewColorHex('#EC4899');
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditNumber(user.userNumber);
    setEditEmail(user.email || '');
    setEditReceiveAlerts(user.receiveStockAlerts ?? true);
    setEditRole(user.role);
    setEditStatus(user.status || 'active');
    setEditPassword(user.password);
    setShowEditPassword(false);
  };

  // Save changes to existing user
  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim() || !editNumber.trim() || !editPassword.trim()) {
      showToast('Please fill in Name, User Number, and Password', 'error');
      return;
    }

    if (editEmail.trim() && !isValidEmail(editEmail)) {
      showToast('Please enter a valid email address (e.g. staff@girldressshop.com)', 'error');
      return;
    }

    setIsSavingUser(true);
    try {
      const res = await updateUserAccount({
        ...editingUser,
        name: editName.trim(),
        userNumber: editNumber.trim(),
        email: editEmail.trim() ? normalizeEmail(editEmail) : undefined,
        receiveStockAlerts: editReceiveAlerts,
        role: editRole,
        status: editStatus,
        password: editPassword.trim(),
      });

      if (res.success) {
        setEditingUser(null);
      } else {
        showToast(res.error || 'Failed to update user', 'error');
      }
    } finally {
      setIsSavingUser(false);
    }
  };

  // Create new staff account
  const handleCreateStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffNumber.trim() || !newStaffName.trim() || !newStaffPassword.trim()) {
      showToast('Please fill in User Number, Name and Password', 'error');
      return;
    }

    if (newStaffEmail.trim() && !isValidEmail(newStaffEmail)) {
      showToast('Please enter a valid email address (e.g. staff@girldressshop.com)', 'error');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const res = await addUserAccount({
        userNumber: newStaffNumber.trim(),
        name: newStaffName.trim(),
        email: newStaffEmail.trim() ? normalizeEmail(newStaffEmail) : undefined,
        receiveStockAlerts: newStaffReceiveAlerts,
        role: newStaffRole,
        password: newStaffPassword.trim(),
        phone: newStaffNumber.trim(),
        status: 'active',
      });

      if (res.success) {
        setNewStaffNumber('');
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPassword('');
        setNewStaffReceiveAlerts(true);
        setShowAddUserModal(false);
      } else {
        showToast(res.error || 'Failed to create user', 'error');
      }
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Confirm delete user handler
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await deleteUserAccount(userToDelete.userId);
      if (res.success) {
        setUserToDelete(null);
      } else {
        showToast(res.error || 'Failed to delete user', 'error');
      }
    } finally {
      setIsDeletingUser(false);
    }
  };

  const isDeletingCurrentUser = userToDelete?.userId === currentUser?.userId;
  const isOnlyRemainingUser = users.length <= 1;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Admin Settings & Staff Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage authorized staff accounts, database persistence, size and color matrices, and store profile
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Cloud Database Active & Synced</span>
        </div>
      </div>

      {/* Staff & User Authentication Management */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-600" />
            <h2 className="text-sm font-bold text-stone-900">
              Staff & User Accounts (Multi-Role Cloud Access)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewStaffNumber('');
              setNewStaffName('');
              setNewStaffPassword('');
              setNewStaffRole('sales_staff');
              setShowAddUserModal(true);
            }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Staff Account</span>
          </button>
        </div>

        <p className="text-xs text-stone-500">
          Authorized personnel log in via their assigned <strong>User Number</strong> and <strong>Password</strong>.
          Admins can edit any staff details, reset passwords, change roles, or remove accounts.
        </p>

        {/* User Accounts Table */}
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold text-[10px] tracking-wider border-b border-stone-200">
              <tr>
                <th className="px-4 py-2.5">User Number</th>
                <th className="px-4 py-2.5">Full Name</th>
                <th className="px-4 py-2.5">Email & Alerts</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Password</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-stone-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono-numbers font-bold text-stone-900">
                    #{u.userNumber}
                  </td>
                  <td className="px-4 py-3 text-stone-800">
                    <span className="font-medium">{u.name}</span>
                    {currentUser?.userId === u.userId && (
                      <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">
                        Current Session
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.email ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-stone-800 text-[11px] flex items-center gap-1">
                          <Mail className="w-3 h-3 text-stone-400" />
                          <span>{u.email}</span>
                        </span>
                        {u.receiveStockAlerts !== false ? (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-semibold"
                            title="Subscribed to Low Stock Email Alerts"
                          >
                            <BellRing className="w-2.5 h-2.5 text-rose-600" />
                            <span>Alerts On</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400">Alerts Off</span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(u)}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline decoration-rose-300"
                        title="Add a valid email address to this user role for stock alert notifications"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Valid Email</span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {u.role === 'admin' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      <span>{u.role === 'admin' ? 'Administrator' : 'Sales Staff'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-400">
                    ••••••••
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {u.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(u)}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                        title="Edit user details and password"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(u)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Delete user account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Email Notification Alerts System (Multi-Role Email Delivery) */}
      <div className="bg-white p-5 rounded-xl border border-rose-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-stone-900">
                  Low Stock Email Alert Notifications
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                  <BellRing className="w-3 h-3" />
                  <span>{emailAlertRecipients.length} Active {emailAlertRecipients.length === 1 ? 'Recipient' : 'Recipients'}</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Automatically alerts authorized Administrator and Sales Staff accounts when dress variants fall at or below threshold (≤{settings.LowStockThreshold || 5} units).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmailAlertModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Preview & Send Alert</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Recipients Roster */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pink-600" />
                <span>Authorized User Roles with Valid Emails</span>
              </span>
              <span className="text-[11px] text-stone-500 font-mono-numbers">
                {users.filter((u) => u.email && isValidEmail(u.email)).length} / {users.length} users
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {users.map((u) => {
                const hasValid = u.email && isValidEmail(u.email);
                return (
                  <div
                    key={u.userId}
                    className="p-2.5 bg-white border border-stone-200 rounded-lg flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-stone-900">{u.name}</span>
                        <span className="font-mono text-stone-500 text-[10px]">#{u.userNumber}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Sales Staff'}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {hasValid ? (
                          <span className="font-mono text-stone-700 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-emerald-600" />
                            <span>{u.email}</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 italic flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>No valid email added</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {hasValid ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            u.receiveStockAlerts !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {u.receiveStockAlerts !== false ? 'Alerts ON' : 'Muted'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold cursor-pointer"
                        >
                          + Add Email
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-stone-500">
              Tip: Both <strong>Administrator</strong> and <strong>Sales Staff</strong> roles can be assigned valid emails to receive stock warnings and restock notices.
            </p>
          </div>

          {/* Alert Configuration & Dispatch Options */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">
                  Notification Dispatch Preferences
                </span>
                <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlertsEnabled}
                    onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold">Enable Stock Email Alerts</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Additional External Email Recipients (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. manager@domain.com, purchasing@domain.com"
                  value={alertEmailRecipients}
                  onChange={(e) => setAlertEmailRecipients(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Comma-separated emails for suppliers or external store owners.
                </p>
              </div>

              <div className="p-2.5 bg-white border border-stone-200 rounded-lg text-xs space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Current Low Stock Count:</span>
                  <span className="font-bold text-rose-600 font-mono-numbers">
                    {kpis.lowStockCount} items below threshold
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Defined Alert Threshold:</span>
                  <span className="font-bold font-mono-numbers">
                    ≤{settings.LowStockThreshold || 5} units
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-stone-200">
              <span className="text-[10px] text-stone-500">
                {settings.LastAlertEmailSent
                  ? `Last sent: ${new Date(settings.LastAlertEmailSent).toLocaleDateString()} at ${new Date(settings.LastAlertEmailSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'No alerts dispatched yet today'}
              </span>

              <button
                type="button"
                onClick={handleSaveStoreSettings}
                disabled={isSavingSettings}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingSettings ? 'Saving...' : 'Save Alert Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Staff Account Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Edit Staff Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  User Number / Staff ID (Required)
                </label>
                <input
                  type="text"
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Staff Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'sales_staff')}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="sales_staff">Sales Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Staff Email Address & Alert Notification Config */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Email Address (for Low Stock Notifications & Alerts)
                  </label>
                  {editEmail.trim() ? (
                    isValidEmail(editEmail) ? (
                      <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Valid Email</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                        <span>Invalid Format</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-stone-400">Optional but recommended</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="e.g. staff@girldressshop.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Both Administrator and Sales Staff roles can have a valid email to receive automatic low-stock notifications.
                </p>
              </div>

              {/* Receive Stock Alerts Checkbox */}
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editReceiveAlerts}
                    onChange={(e) => setEditReceiveAlerts(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Subscribe this user account to Low Stock Email Alerts</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 text-stone-600 hover:text-stone-900 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingUser ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Account Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Create New Staff Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Add a new authorized staff member or administrator. Credentials will be securely saved to the database.
            </p>

            <form onSubmit={handleCreateStaffAccount} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  User Number / Staff ID (Required)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1002, 1003"
                  value={newStaffNumber}
                  onChange={(e) => setNewStaffNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Staff Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jessica Miller"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Role</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as 'admin' | 'sales_staff')}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="sales_staff">Sales Staff (POS, Sales & Inventory movements)</option>
                  <option value="admin">Administrator (Full Access & Cost/Profit Reports)</option>
                </select>
              </div>

              {/* Staff Email Address & Alert Notification Config */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Email Address (for Low Stock Notifications & Alerts)
                  </label>
                  {newStaffEmail.trim() ? (
                    isValidEmail(newStaffEmail) ? (
                      <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Valid Email</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                        <span>Invalid Format</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-stone-400">Optional but recommended</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="e.g. jessica@girldressshop.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Both Administrator and Sales Staff roles can have a valid email to receive automatic low-stock notifications.
                </p>
              </div>

              {/* Receive Stock Alerts Checkbox */}
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStaffReceiveAlerts}
                    onChange={(e) => setNewStaffReceiveAlerts(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Subscribe this new account to Low Stock Email Alerts</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-2 text-stone-600 hover:text-stone-900 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete User Confirmation Modal (100% reliable, no blocked window.confirm) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Delete Staff Account
                </h3>
                <p className="text-xs text-stone-500">
                  Permanently remove user from the database
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">User Number:</span>
                <span className="font-mono font-bold text-stone-800">#{userToDelete.userNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Full Name:</span>
                <span className="font-semibold text-stone-800">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Role:</span>
                <span className="capitalize font-medium text-stone-800">
                  {userToDelete.role === 'admin' ? 'Administrator' : 'Sales Staff'}
                </span>
              </div>
            </div>

            {isDeletingCurrentUser && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Current Active Session</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  You are currently logged in with this account. If you delete it, your session will immediately terminate and you will be returned to the sign-in screen.
                </p>
              </div>
            )}

            {isOnlyRemainingUser && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <div className="font-bold">Cannot Delete Sole User</div>
                <p className="text-[11px]">
                  This is the only remaining account in the database. Please create another administrator account first before deleting this one.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-2 text-stone-600 hover:text-stone-900 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser || isOnlyRemainingUser}
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingUser ? 'Deleting from Cloud...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Master Info Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleSaveStoreSettings}
          className="lg:col-span-7 bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-stone-900">Store Profile & Receipt Details</h2>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Saved permanently in Firestore and printed on thermal customer receipts
              </p>
            </div>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingSettings ? 'Saving to Cloud...' : 'Save Store Info'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Store Name (Header / Brand)
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Girl Dress Shop"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Store Tagline / Slogan
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Couture & Casual Dresses for Girls"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Store Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 345-9876"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Store Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. contact@girldressshop.com"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Boutique Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 742 Boutique Blossom Ave, Suite 101, New York, NY"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white font-mono-numbers"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Receipt Footer Message & Return Policy
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="e.g. Thank you for shopping at Girl Dress Shop! Returns accepted within 14 days."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </form>

        {/* Live Thermal Receipt Preview */}
        <div className="lg:col-span-5 bg-stone-50 p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span>Live Receipt Header Preview</span>
              </div>
              <span className="text-[10px] text-stone-500">Auto-Formats</span>
            </div>

            {/* Thermal Slip Simulation */}
            <div className="mt-3 bg-white p-4 border border-stone-300 rounded-lg shadow-2xs font-sans text-stone-900 text-xs space-y-3">
              <div className="text-center pb-3 border-b border-dashed border-stone-300">
                <div className="font-bold text-base text-stone-900 leading-tight">
                  {storeName || 'Girl Dress Shop'}
                </div>
                {tagline && <div className="text-[11px] text-stone-500 mt-0.5">{tagline}</div>}
                {address && <div className="text-[11px] text-stone-600 mt-1">{address}</div>}
                {phone && <div className="text-[11px] text-stone-600">{phone}</div>}
                {email && <div className="text-[10px] text-stone-400">{email}</div>}
              </div>

              <div className="text-[11px] text-stone-500 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span>ORDER: #ORD-2026-0042</span>
                  <span>10:45 AM</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER: Staff #1001</span>
                  <span>CASH SALE</span>
                </div>
              </div>

              <div className="py-2 border-y border-dashed border-stone-300 text-[11px] space-y-1">
                <div className="flex justify-between font-medium">
                  <span>1x Princess Floral Gown (4Y)</span>
                  <span className="font-mono-numbers">{currency}35.00</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1">
                  <span>TOTAL DUE:</span>
                  <span className="font-mono-numbers">{currency}35.00</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-stone-500 italic pt-1">
                {receiptFooter || 'Thank you for your business!'}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-500 bg-white p-2.5 rounded-lg border border-stone-200/80 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Updates apply immediately across all printed customer receipts and barcodes.</span>
          </div>
        </div>
      </div>

      {/* Predefined Sizes Management */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Predefined Sizes (70–190)</h2>
          <span className="text-xs text-stone-500 font-mono-numbers">{sizes.length} active sizes</span>
        </div>
        <p className="text-xs text-stone-500">
          Used across the product matrix and sales transaction auto-selection:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {sizes.map((sz) => (
            <div
              key={sz.SizeID}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 border border-stone-300 rounded-lg text-xs font-mono-numbers font-semibold text-stone-800"
            >
              <span>{sz.SizeValue}</span>
              <button
                type="button"
                onClick={() => deleteSize(sz.SizeID)}
                className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove size"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddSizeSubmit} className="flex gap-2 pt-2 max-w-sm">
          <input
            type="text"
            placeholder="Add new size (e.g. 200, 210, M)"
            value={newSizeValue}
            onChange={(e) => setNewSizeValue(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            + Add Size
          </button>
        </form>
      </div>

      {/* Predefined 10 Colors Management */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Predefined Colors (10 Standard Colors)</h2>
          <span className="text-xs text-stone-500 font-mono-numbers">{colors.length} active colors</span>
        </div>
        <p className="text-xs text-stone-500">
          Predefined standard color palette for dress variants and auto-loading:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {colors.map((c) => (
            <div
              key={c.ColorID}
              className="flex items-center justify-between p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-stone-300 shrink-0"
                  style={{ backgroundColor: c.HexCode }}
                />
                <span className="font-semibold text-stone-800">{c.ColorName}</span>
              </div>
              <button
                type="button"
                onClick={() => deleteColor(c.ColorID)}
                className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove color"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddColorSubmit} className="flex gap-2 pt-2 max-w-md">
          <input
            type="color"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            className="w-10 h-8 p-0.5 border border-stone-300 rounded cursor-pointer"
            title="Pick color code"
          />
          <input
            type="text"
            placeholder="Color name (e.g. Lavender, Mint)"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            + Add Color
          </button>
        </form>
      </div>

      {/* Predefined Price Categories */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-stone-900">Price Categories</h2>
        <p className="text-xs text-stone-500">
          Used to filter customer shop collections and executive inventory reports:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {priceCategories.map((pc) => (
            <div key={pc.ID} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-center font-medium">
              <div className="font-bold text-stone-900">{pc.Name}</div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                {pc.MaxPrice !== null ? `$${pc.MinPrice} – $${pc.MaxPrice}` : `≥ $${pc.MinPrice}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Alert Preview & Dispatch Modal */}
      <EmailAlertModal
        isOpen={showEmailAlertModal}
        onClose={() => setShowEmailAlertModal(false)}
      />
    </div>
  );
};
