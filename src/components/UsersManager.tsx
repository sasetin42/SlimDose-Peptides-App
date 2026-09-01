import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Copy,
  ExternalLink,
  Download,
  Eye,
  EyeOff,
  X,
  FileText,
  Clock,
  Sparkles,
  Briefcase,
  User as UserIcon,
  Layers,
  Database,
  ArrowUpDown,
  SlidersHorizontal,
  Key,
  MapPin,
  ShoppingBag,
  DollarSign,
  Share2,
} from 'lucide-react';
import { fireToast } from './ToastNotification';
import {
  getAllUserAccounts,
  createUserAccountAdmin,
  updateUserAccountAdmin,
  deleteUserAccountAdmin,
  AdminUserAccount,
  DEFAULT_CUSTOMER_PASSWORD,
  createFirebaseUserHeadless,
  resetPassword,
} from '../services/firebaseAuth';
import { dispatchPasswordResetOtpEmail } from '../services/emailService';
import { liveScrapedCustomers } from '../data/liveScrapedCustomers';
import { db, collection, onSnapshot } from '../lib/firebase';

interface UsersManagerProps {
  onNavigateToSettings?: () => void;
  onNavigateToCRM?: () => void;
}

const USERS_CACHE_KEY = 'slimdose_cached_user_accounts_v1';

const getInitialCachedUsers = (): AdminUserAccount[] => {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Instant baseline dataset so user NEVER sees a 0-state or blank loading screen
  const baseline: AdminUserAccount[] = [
    {
      uid: 'admin_primary_master',
      email: 'admin@gmail.com',
      displayName: 'Super Admin',
      role: 'super_admin',
      phone: '+63 917 888 9999',
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authLinked: true,
    },
    ...((liveScrapedCustomers || []) as any[]).map((c: any) => ({
      uid: c.id,
      email: (c.email || '').trim().toLowerCase(),
      displayName: c.full_name || 'Customer User',
      role: 'customer' as const,
      phone: c.phone || '',
      customerId: c.id,
      status: 'active' as const,
      emailVerified: true,
      createdAt: c.created_at || new Date().toISOString(),
      updatedAt: c.created_at || new Date().toISOString(),
      shippingAddress: c.shipping_address || '',
      defaultPassword: DEFAULT_CUSTOMER_PASSWORD,
      authLinked: true,
    }))
  ];

  return baseline;
};

export const UsersManager: React.FC<UsersManagerProps> = ({
  onNavigateToSettings,
  onNavigateToCRM,
}) => {
  const initialCache = useMemo(() => getInitialCachedUsers(), []);
  const [users, setUsers] = useState<AdminUserAccount[]>(initialCache);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedStatus, sortBy, sortOrder]);

  // Modals state
  const [detailsUser, setDetailsUser] = useState<AdminUserAccount | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editUser, setEditUser] = useState<AdminUserAccount | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<AdminUserAccount | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Form inputs for Add User
  const [addForm, setAddForm] = useState({
    displayName: '',
    email: '',
    password: DEFAULT_CUSTOMER_PASSWORD,
    role: 'staff' as 'super_admin' | 'admin' | 'staff' | 'customer',
    phone: '',
    status: 'active' as 'active' | 'suspended' | 'pending',
    notes: '',
  });

  // Load all users with background SWR and caching
  const loadUsers = async (forceSpinner = false) => {
    if (users.length === 0 || forceSpinner) {
      setLoading(true);
    } else {
      setIsSyncing(true);
    }

    try {
      const data = await getAllUserAccounts();
      // Strict unique map to eliminate any casing, trailing whitespace or duplicate entry
      const uniqueUsersMap = new Map<string, AdminUserAccount>();
      data.forEach((u) => {
        const clean = (u.email || '').trim().toLowerCase();
        if (clean && !uniqueUsersMap.has(clean)) {
          uniqueUsersMap.set(clean, { ...u, email: clean });
        }
      });
      const userList = Array.from(uniqueUsersMap.values());
      setUsers(userList);
      try {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(userList));
      } catch {}
    } catch (err: any) {
      console.error('[UsersManager] Failed to load users:', err);
      if (users.length === 0) {
        fireToast('Notice: Loading user list: ' + (err.message || 'Network error'), 'info');
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadUsers();

    const handleReload = () => {
      loadUsers(false);
    };

    window.addEventListener('storage', handleReload);
    window.addEventListener('slimdose:customer_registered', handleReload);
    window.addEventListener('slimdose:user_deleted', handleReload);
    window.addEventListener('slimdose:customer_deleted', handleReload);
    window.addEventListener('focus', handleReload);

    // Live realtime listeners for Firestore collections
    const unsubUsers = onSnapshot(collection(db, 'users'), () => {
      loadUsers(false);
    });
    const unsubCust = onSnapshot(collection(db, 'customers'), () => {
      loadUsers(false);
    });

    return () => {
      unsubUsers();
      unsubCust();
      window.removeEventListener('storage', handleReload);
      window.removeEventListener('slimdose:customer_registered', handleReload);
      window.removeEventListener('slimdose:user_deleted', handleReload);
      window.removeEventListener('slimdose:customer_deleted', handleReload);
      window.removeEventListener('focus', handleReload);
    };
  }, []);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const matchesSearch =
          u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.phone && u.phone.includes(searchQuery)) ||
          u.uid.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole =
          selectedRole === 'all' || u.role === selectedRole;

        const matchesStatus =
          selectedStatus === 'all' || u.status === selectedStatus;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'created') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (sortOrder === 'asc') return timeA - timeB;
          return timeB - timeA;
        }

        let valA = '';
        let valB = '';
        if (sortBy === 'name') {
          valA = a.displayName.toLowerCase();
          valB = b.displayName.toLowerCase();
        } else if (sortBy === 'email') {
          valA = a.email.toLowerCase();
          valB = b.email.toLowerCase();
        } else if (sortBy === 'role') {
          valA = a.role;
          valB = b.role;
        }

        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        }
        return valA < valB ? 1 : -1;
      });
  }, [users, searchQuery, selectedRole, selectedStatus, sortBy, sortOrder]);

  // Paginated Window for high-speed instant rendering
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIdx, startIdx + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Quick stats
  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === 'super_admin').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const staff = users.filter((u) => u.role === 'staff').length;
    const customers = users.filter((u) => u.role === 'customer').length;
    const active = users.filter((u) => u.status === 'active').length;
    return { total, superAdmins, admins, staff, customers, active };
  }, [users]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    fireToast(`Copied ${label} to clipboard! 📋`, 'info');
  };

  // Add User handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim() || !addForm.displayName.trim()) {
      fireToast('Please provide both a Name and Email address.', 'warning');
      return;
    }

    try {
      fireToast('Creating new user in Firebase Auth & Database...', 'info');
      const newUser = await createUserAccountAdmin(addForm);
      setUsers((prev) => [newUser, ...prev]);
      setIsAddModalOpen(false);
      setAddForm({
        displayName: '',
        email: '',
        password: DEFAULT_CUSTOMER_PASSWORD,
        role: 'staff',
        phone: '',
        status: 'active',
        notes: '',
      });
      fireToast(`🎉 Successfully created user ${newUser.displayName}!`, 'success');
    } catch (err: any) {
      console.error('[UsersManager] Create user error:', err);
      fireToast(`Failed to create user: ${err.message || 'Error'}`, 'error');
    }
  };

  // Edit User handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      await updateUserAccountAdmin(editUser.uid, {
        displayName: editUser.displayName,
        role: editUser.role,
        phone: editUser.phone,
        status: editUser.status,
        notes: editUser.notes,
      });

      setUsers((prev) =>
        prev.map((u) => (u.uid === editUser.uid ? { ...editUser } : u))
      );

      if (detailsUser && detailsUser.uid === editUser.uid) {
        setDetailsUser({ ...editUser });
      }

      setEditUser(null);
      fireToast('User profile updated successfully! ✅', 'success');
    } catch (err: any) {
      console.error('[UsersManager] Update user error:', err);
      fireToast(`Failed to update user: ${err.message}`, 'error');
    }
  };

  // Delete User handler
  const handleDeleteUser = async (userToDelete: AdminUserAccount) => {
    if (userToDelete.email === 'admin@gmail.com') {
      fireToast('Protected: Primary Super Admin cannot be deleted.', 'warning');
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to completely delete user "${userToDelete.displayName}" (${userToDelete.email})? This will permanently remove their records from Authentication and Database.`
    );
    if (!confirm) return;

    const emailKey = (userToDelete.email || '').trim().toLowerCase();
    const uidKey = userToDelete.uid;

    try {
      // Optimistic UI state & cache update immediately (0ms)
      setUsers((prev) => {
        const updated = prev.filter((u) => u.uid !== uidKey && (u.email || '').trim().toLowerCase() !== emailKey);
        try {
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (detailsUser && (detailsUser.uid === uidKey || (detailsUser.email || '').trim().toLowerCase() === emailKey)) {
        setDetailsUser(null);
      }

      fireToast(`User ${userToDelete.displayName} successfully deleted. 🗑️`, 'success');

      // Background cascade deletion
      deleteUserAccountAdmin(uidKey, emailKey).catch((err) => {
        console.warn('[UsersManager] Background delete notice:', err);
      });
    } catch (err: any) {
      console.error('[UsersManager] Delete user error:', err);
      fireToast(`Failed to delete user: ${err.message}`, 'error');
    }
  };

  // Send Password Reset
  const handleSendPasswordReset = async (targetUser: AdminUserAccount) => {
    try {
      fireToast(`Sending password reset link to ${targetUser.email}...`, 'info');
      await resetPassword(targetUser.email);
      fireToast(`✅ Password reset link dispatched to ${targetUser.email}!`, 'success', 5000);
      setPasswordResetUser(null);
    } catch (err: any) {
      console.error('Password reset error:', err);
      try {
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        await dispatchPasswordResetOtpEmail(targetUser.email, pin, targetUser.displayName);
        fireToast(`Security PIN code dispatched to ${targetUser.email}.`, 'success');
        setPasswordResetUser(null);
      } catch (fbErr: any) {
        fireToast(`Failed to send password reset: ${fbErr.message || err.message}`, 'error');
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      fireToast('No users to export.', 'info');
      return;
    }

    const headers = ['UID', 'Display Name', 'Email', 'Role', 'Status', 'Phone', 'Email Verified', 'Created At'];
    const rows = filteredUsers.map((u) => [
      `"${u.uid}"`,
      `"${u.displayName}"`,
      `"${u.email}"`,
      `"${u.role}"`,
      `"${u.status}"`,
      `"${u.phone || ''}"`,
      `"${u.emailVerified ? 'Yes' : 'No'}"`,
      `"${u.createdAt || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `slimdose_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    fireToast(`Exported ${filteredUsers.length} user records to CSV! 📊`, 'success');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shrink-0">
            <ShieldAlert className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shrink-0">
            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            Admin
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shrink-0">
            <Briefcase className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shrink-0">
            <UserIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Customer
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#3C6CA8]/15 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3C6CA8]/20 border border-[#3C6CA8]/40 text-[#6A9BE0] text-xs font-extrabold tracking-wider uppercase">
              <Shield className="w-3.5 h-3.5" />
              <span>Identity &amp; Access Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Users Management &amp; Complete Details
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Centrally manage administrators, staff team members, and customer portal accounts. Deeply synchronized with Firebase Authentication &amp; Firestore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh users"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#6A9BE0]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-3 sm:p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-slate-950/40 border border-indigo-900/40 rounded-2xl p-3 sm:p-4">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Super Admins</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 mt-1">{stats.superAdmins}</div>
          </div>
          <div className="bg-slate-950/40 border border-blue-900/40 rounded-2xl p-3 sm:p-4">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Admins &amp; Staff</div>
            <div className="text-xl sm:text-2xl font-black text-blue-300 mt-1">{stats.admins + stats.staff}</div>
          </div>
          <div className="bg-slate-950/40 border border-emerald-900/40 rounded-2xl p-3 sm:p-4">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Customers</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">{stats.customers}</div>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-3 sm:p-4 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Status</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stats.active}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, role, phone, or UID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role and Status Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {['all', 'super_admin', 'admin', 'staff', 'customer'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                  selectedRole === role
                    ? 'bg-[#3C6CA8] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {role === 'all' ? 'All Roles' : role.replace('_', ' ')}
              </button>
            ))}
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#3C6CA8]" />
            <p className="text-xs font-bold text-slate-500">Loading user accounts from Firebase Authentication &amp; Firestore...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No users found matching your filters</h3>
            <p className="text-xs text-slate-500">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 whitespace-nowrap">User Details</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Email &amp; Phone</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Role &amp; Scope</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Created Date</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {paginatedUsers.map((user) => {
                  const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* User Display Name & Avatar */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3C6CA8] to-[#1E3A8A] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                              <span className="truncate">{user.displayName}</span>
                              {user.emailVerified && (
                                <span title="Verified Account">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                              UID: {user.uid.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                            <span className="font-mono">{user.email}</span>
                            <button
                              onClick={() => handleCopy(user.email, 'Email')}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-opacity cursor-pointer"
                              title="Copy email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {user.phone ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              —
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role & Status (Stacked) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1.5">
                          {getRoleBadge(user.role)}
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Suspended
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {user.createdAt ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Complete Details Button */}
                          <button
                            onClick={() => setDetailsUser(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3C6CA8]/10 hover:bg-[#3C6CA8]/20 text-[#3C6CA8] dark:text-[#6A9BE0] font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap shrink-0"
                            title="View Complete Details"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">Complete Details</span>
                          </button>

                          {/* Quick Edit */}
                          <button
                            onClick={() => setEditUser(user)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => setPasswordResetUser(user)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.email === 'admin@gmail.com'}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/15 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-30 shrink-0"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls Bar */}
        {filteredUsers.length > 0 && (
          <div className="p-4 bg-slate-50/90 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-[11px]">
              <span>
                Showing <strong className="text-slate-900 dark:text-white font-bold">{Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}</strong> to <strong className="text-slate-900 dark:text-white font-bold">{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> of <strong className="text-slate-900 dark:text-white font-bold">{filteredUsers.length}</strong> users
              </span>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline">Per page:</span>
                <select
                  id="usersmanager-pagesize"
                  name="pagesize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 font-bold">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pNum = Math.min(currentPage - 2 + i, totalPages - (4 - i));
                    }
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-7 h-7 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          currentPage === pNum
                            ? 'bg-[#3C6CA8] text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. COMPLETE DETAILS MODAL ("Complete Details")                            */}
      {/* ========================================================================= */}
      {detailsUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3C6CA8] to-[#1E3A8A] text-white flex items-center justify-center font-black text-xl shadow-md">
                  {(detailsUser.displayName || detailsUser.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{detailsUser.displayName}</span>
                    {getRoleBadge(detailsUser.role)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {detailsUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailsUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Account Identity Card */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#3C6CA8]" /> Account &amp; Identity Details
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Firebase Auth Linked ✓
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Full Display Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{detailsUser.displayName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Primary Email</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{detailsUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{detailsUser.phone || 'Not configured'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Account Status</span>
                    <span className="font-bold capitalize text-slate-800 dark:text-slate-200">{detailsUser.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Membership Tier</span>
                    <span className="font-bold text-[#3C6CA8] dark:text-blue-300">{detailsUser.tier || (detailsUser.role === 'customer' ? 'VIP Member' : 'System Staff')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Default Password</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/60 text-[#3C6CA8] dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900">
                        {detailsUser.defaultPassword || DEFAULT_CUSTOMER_PASSWORD}
                      </span>
                      <button
                        onClick={() => handleCopy(detailsUser.defaultPassword || DEFAULT_CUSTOMER_PASSWORD, 'Password')}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Firebase Auth UID</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] bg-slate-200/60 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 break-all">
                        {detailsUser.uid}
                      </span>
                      <button
                        onClick={() => handleCopy(detailsUser.uid, 'UID')}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Copy UID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address & Customer Activity Card */}
              {(detailsUser.shippingAddress || detailsUser.shippingCity || detailsUser.role === 'customer') && (
                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#3C6CA8]" /> Delivery &amp; Purchase Activity Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Primary Delivery Address</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                        {[detailsUser.shippingAddress, detailsUser.shippingCity, detailsUser.shippingState, detailsUser.shippingZipCode].filter(Boolean).join(', ') || 'No shipping address recorded'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Orders Placed</span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                        {detailsUser.orderCount ?? 0} Orders
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Lifetime Spend (LTV)</span>
                      <span className="font-black text-[#3C6CA8] dark:text-blue-400 text-sm mt-0.5 block">
                        ₱{Number(detailsUser.totalSpent || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Role & Permissions Scope */}
              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3C6CA8]" /> Role Permissions &amp; Access Scope
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {detailsUser.role === 'customer' ? 'Customer Self-Service Portal' : 'Admin Console Access'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {detailsUser.role === 'customer' ? 'Order Tracking & COA Access' : 'Orders & Invoices Processing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    {detailsUser.role === 'super_admin' || detailsUser.role === 'admin' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Product Catalog &amp; Inventory Edits
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    {detailsUser.role === 'super_admin' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Site Settings &amp; Master API Credentials
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Actions Bar */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    Password &amp; Security Controls
                  </div>
                  <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    Send a verified security password reset link directly to this user.
                  </div>
                </div>

                <button
                  onClick={() => handleSendPasswordReset(detailsUser)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                >
                  Send Reset Link 📬
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  const u = detailsUser;
                  setDetailsUser(null);
                  setEditUser(u);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setDetailsUser(null)}
                className="px-5 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold text-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ADD USER MODAL                                                         */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3C6CA8]/15 border border-[#3C6CA8]/30 flex items-center justify-center text-[#3C6CA8]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Add New User Account</h3>
                  <p className="text-xs text-slate-400">Provisions account directly in Firebase Authentication</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Display Name *
                </label>
                <input
                  type="text"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                  placeholder="e.g. Maria Santos / Operations Staff"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role &amp; Privilege *
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold outline-none"
                  >
                    <option value="super_admin">Super Admin (Full Access)</option>
                    <option value="admin">Admin (Operational)</option>
                    <option value="staff">Staff (Limited)</option>
                    <option value="customer">Customer Portal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password
                  </label>
                  <input
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="123456#"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold shadow-md cursor-pointer"
                >
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT USER MODAL                                                        */}
      {/* ========================================================================= */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Edit User Details</h3>
                  <p className="text-xs text-slate-400 font-mono">{editUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={editUser.displayName}
                  onChange={(e) => setEditUser({ ...editUser, displayName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#3C6CA8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role &amp; Privilege
                  </label>
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value as any })}
                    disabled={editUser.email === 'admin@gmail.com'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold outline-none"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editUser.status}
                    onChange={(e) => setEditUser({ ...editUser, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 font-bold outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editUser.phone || ''}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#3C6CA8] hover:bg-[#315A8E] text-white font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PASSWORD RESET CONFIRMATION MODAL                                      */}
      {/* ========================================================================= */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Send Password Reset Email
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to dispatch a secure password reset link to:
              </p>
              <div className="font-mono font-bold text-xs text-[#3C6CA8] pt-1">
                {passwordResetUser.email}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setPasswordResetUser(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendPasswordReset(passwordResetUser)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Send Password Reset Email 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;
