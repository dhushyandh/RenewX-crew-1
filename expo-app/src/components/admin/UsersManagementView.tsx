import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { confirmAction } from '@/lib/confirmAction';
import { renewxColors, renewxFontFamily, renewxRadius } from '@/design-system';

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
  joinedTime: string;
  role: 'customer' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  avatar?: string;
  initials?: string;
  initialsBg?: string;
  initialsColor?: string;
  isBackendUser?: boolean;
}

type StatusFilter = 'all' | 'active' | 'blocked';
type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export default function UsersManagementView() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected User for Role Editing and Delete Modal
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'customer'>('customer');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive' | 'blocked'>('active');
  const [saving, setSaving] = useState(false);

  // Fetch users from backend
  const fetchLiveUsers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.users.getAll();
      const rawRows = Array.isArray(res) ? res : (res as any)?.data || [];

      if (rawRows.length > 0) {
        const mappedBackendUsers: AdminUserItem[] = rawRows.map((u: any, idx: number) => {
          const email = u.email || 'user@example.com';
          const name = u.full_name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          const initials = name.slice(0, 2).toUpperCase();
          const d = u.created_at ? new Date(u.created_at) : new Date();
          const joinedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const joinedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

          return {
            id: String(u.id || u._id || `backend_${idx}`),
            name,
            email,
            phone: u.phone || '',
            joinedDate,
            joinedTime,
            role: (u.role === 'admin' ? 'admin' : 'customer') as 'admin' | 'customer',
            status: (u.status || 'active') as 'active' | 'inactive' | 'blocked',
            avatar: u.avatar_url || undefined,
            initials,
            initialsBg: u.role === 'admin' ? '#FEF08A' : '#EDE9FE',
            initialsColor: u.role === 'admin' ? '#854D0E' : '#7C3AED',
            isBackendUser: true,
          };
        });

        setUsers(mappedBackendUsers);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveUsers();
  }, [fetchLiveUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLiveUsers(true);
  }, [fetchLiveUsers]);

  // Metric counts from real users
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const blockedCount = users.filter((u) => u.status === 'blocked').length;
  const newMonthCount = users.filter((u) => {
    const d = new Date(u.joinedDate);
    const now = new Date();
    return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? u.status === 'active'
          : u.status === 'blocked';

      return matchSearch && matchStatus;
    });

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });

    return result;
  }, [users, search, statusFilter, sortOption]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);

  // Open Edit / Action Modal
  const openActionModal = (user: AdminUserItem) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setSelectedStatus(user.status);
    setActionModalVisible(true);
  };

  // Save Role and Status
  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await api.users.updateRole(selectedUser.id, selectedRole, selectedStatus);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, role: selectedRole, status: selectedStatus }
            : u
        )
      );
      toast.success(
        `${selectedUser.name} updated to ${selectedRole === 'admin' ? 'Admin' : 'Customer'} (${selectedStatus})`,
        'User Permissions Updated'
      );
      setActionModalVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user role');
    } finally {
      setSaving(false);
    }
  };

  // Delete User Permanently
  const handleDeleteUser = () => {
    if (!selectedUser) return;
    const target = selectedUser;

    confirmAction(
      'Delete User Account',
      `Are you sure you want to permanently delete user "${target.name}" (${target.email})?\n\nThis will remove all associated profile data, orders, and credentials. This action cannot be undone.`,
      async () => {
        setSaving(true);
        try {
          await api.users.delete(target.id);
          setUsers((prev) => prev.filter((u) => u.id !== target.id));
          toast.info(`User ${target.name} has been permanently removed`, 'User Deleted');
          setActionModalVisible(false);
          setSelectedUser(null);
        } catch (err: any) {
          toast.error(err?.message || 'Failed to delete user');
        } finally {
          setSaving(false);
        }
      },
      'Delete User'
    );
  };

  const toggleSort = () => {
    setSortOption((prev) => {
      if (prev === 'newest') return 'name_asc';
      if (prev === 'name_asc') return 'name_desc';
      return 'newest';
    });
    toast.info(`Sorted by ${sortOption === 'newest' ? 'Name (A-Z)' : sortOption === 'name_asc' ? 'Name (Z-A)' : 'Newest'}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={renewxColors.green}
          />
        }
      >
        {/* 1. Page Title & Subtitle */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Users</Text>
          <Text style={styles.pageSubtitle}>
            Manage all registered users, view details and control access.
          </Text>
        </View>

        {/* 2. Top Metric Cards (4 Cards) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsRow}
        >
          {/* Card 1: Total Users */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people-outline" size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.statNumber}>{totalCount.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
          </View>

          {/* Card 2: Active Users */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="person-add-outline" size={20} color="#059669" />
            </View>
            <View>
              <Text style={styles.statNumber}>{activeCount.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
          </View>

          {/* Card 3: Blocked Users */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.statNumber}>{blockedCount.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Blocked Users</Text>
            </View>
          </View>

          {/* Card 4: New This Month */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="people-outline" size={20} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statNumber}>{newMonthCount.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>New This Month</Text>
            </View>
          </View>
        </ScrollView>

        {/* 3. Search and Filter Bar */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name, email or phone..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={(t) => {
                setSearch(t);
                setCurrentPage(1);
              }}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              // Cycle through filters
              setStatusFilter((prev) =>
                prev === 'all' ? 'active' : prev === 'active' ? 'blocked' : 'all'
              );
              setCurrentPage(1);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* 4. Status Filter Tabs & Sort Button */}
        <View style={styles.tabsSortRow}>
          <View style={styles.tabsGroup}>
            <TouchableOpacity
              style={[
                styles.tabPill,
                statusFilter === 'all' && styles.tabPillActive,
              ]}
              onPress={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabPillText,
                  statusFilter === 'all' && styles.tabPillTextActive,
                ]}
              >
                All ({totalCount.toLocaleString('en-IN')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill,
                statusFilter === 'active' && styles.tabPillActive,
              ]}
              onPress={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabPillText,
                  statusFilter === 'active' && styles.tabPillTextActive,
                ]}
              >
                Active ({activeCount.toLocaleString('en-IN')})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabPill,
                statusFilter === 'blocked' && styles.tabPillActive,
              ]}
              onPress={() => {
                setStatusFilter('blocked');
                setCurrentPage(1);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabPillText,
                  statusFilter === 'blocked' && styles.tabPillTextActive,
                ]}
              >
                Blocked ({blockedCount.toLocaleString('en-IN')})
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={toggleSort}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-vertical-outline" size={14} color="#0F172A" />
            <Text style={styles.sortBtnText}>Sort</Text>
          </TouchableOpacity>
        </View>

        {/* 5. User List */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0F172A" />
          </View>
        ) : (
          <View style={styles.usersList}>
            {paginatedUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                {/* Avatar Left */}
                <View style={styles.avatarContainer}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                  ) : (
                    <View
                      style={[
                        styles.avatarInitialsCircle,
                        { backgroundColor: user.initialsBg || '#C084FC' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarInitialsText,
                          { color: user.initialsColor || '#FFFFFF' },
                        ]}
                      >
                        {user.initials || 'U'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Col 1: Name, Email, Phone */}
                <View style={styles.colInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <Text style={styles.userPhone} numberOfLines={1}>
                    {user.phone}
                  </Text>
                </View>

                {/* Col 2: Joined Date & Time */}
                <View style={styles.colJoined}>
                  <Text style={styles.joinedLabel}>Joined</Text>
                  <Text style={styles.joinedDate} numberOfLines={1}>
                    {user.joinedDate}
                  </Text>
                  <Text style={styles.joinedTime} numberOfLines={1}>
                    {user.joinedTime}
                  </Text>
                </View>

                {/* Col 3: Role & Status Badges */}
                <View style={styles.colBadges}>
                  <View
                    style={[
                      styles.roleBadge,
                      user.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeCustomer,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        user.role === 'admin'
                          ? styles.roleBadgeTextAdmin
                          : styles.roleBadgeTextCustomer,
                      ]}
                    >
                      {user.role === 'admin' ? 'Admin' : 'Customer'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      user.status === 'active'
                        ? styles.statusBadgeActive
                        : user.status === 'blocked'
                        ? styles.statusBadgeBlocked
                        : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        user.status === 'active'
                          ? styles.statusBadgeTextActive
                          : user.status === 'blocked'
                          ? styles.statusBadgeTextBlocked
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {user.status === 'active'
                        ? 'Active'
                        : user.status === 'blocked'
                        ? 'Blocked'
                        : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Far Right: 3 Dots Menu Button */}
                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => openActionModal(user)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="ellipsis-vertical" size={17} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 6. Pagination Footer */}
        <View style={styles.paginationRow}>
          <Text style={styles.paginationInfoText}>
            Showing {Math.min(startIndex + 1, filteredUsers.length)} - {endIndex} of{' '}
            {totalCount.toLocaleString('en-IN')} users
          </Text>

          <View style={styles.pageBtnsGroup}>
            <TouchableOpacity
              style={[styles.pageArrowBtn, currentPage === 1 && { opacity: 0.4 }]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={14} color="#0F172A" />
            </TouchableOpacity>

            {[1, 2, 3].map((pageNumber) => {
              const isSelected = currentPage === pageNumber;
              return (
                <TouchableOpacity
                  key={pageNumber}
                  style={[styles.pageNumberBtn, isSelected && styles.pageNumberBtnActive]}
                  onPress={() => setCurrentPage(pageNumber)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pageNumberText,
                      isSelected && styles.pageNumberTextActive,
                    ]}
                  >
                    {pageNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.pageArrowBtn, currentPage >= totalPages && { opacity: 0.4 }]}
              disabled={currentPage >= totalPages}
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={14} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 7. Action & Edit Role / Delete Modal */}
      {selectedUser && (
        <Modal
          visible={actionModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActionModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalAvatarBox}>
                  {selectedUser.avatar ? (
                    <Image source={{ uri: selectedUser.avatar }} style={styles.modalAvatarImg} />
                  ) : (
                    <View
                      style={[
                        styles.modalAvatarCircle,
                        { backgroundColor: selectedUser.initialsBg || '#C084FC' },
                      ]}
                    >
                      <Text style={styles.modalAvatarInitials}>
                        {selectedUser.initials || 'U'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                  <Text style={styles.modalUserEmail} numberOfLines={1}>
                    {selectedUser.email}
                  </Text>
                  <Text style={styles.modalUserPhone}>{selectedUser.phone}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setActionModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Role Section */}
                <Text style={styles.modalSectionLabel}>EDIT USER ROLE</Text>

                <TouchableOpacity
                  style={[
                    styles.roleChoiceCard,
                    selectedRole === 'customer' && styles.roleChoiceCardSelected,
                  ]}
                  onPress={() => setSelectedRole('customer')}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === 'customer' && styles.radioCircleSelected,
                    ]}
                  >
                    {selectedRole === 'customer' && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleChoiceTitle}>Customer (Standard User)</Text>
                    <Text style={styles.roleChoiceSub}>
                      Normal shopper access to browse, order, and sell devices.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleChoiceCard,
                    selectedRole === 'admin' && styles.roleChoiceCardSelected,
                  ]}
                  onPress={() => setSelectedRole('admin')}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === 'admin' && styles.radioCircleSelected,
                    ]}
                  >
                    {selectedRole === 'admin' && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roleChoiceTitle}>Administrator (Full Access)</Text>
                    <Text style={styles.roleChoiceSub}>
                      Full administrative access to manage products, orders, users, and brands.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Status Section */}
                <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>ACCOUNT STATUS</Text>
                <View style={styles.statusChipsRow}>
                  {(['active', 'inactive', 'blocked'] as const).map((st) => {
                    const isSelected = selectedStatus === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusSelectChip,
                          isSelected && styles.statusSelectChipActive,
                          st === 'blocked' && isSelected && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
                        ]}
                        onPress={() => setSelectedStatus(st)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.statusSelectChipText,
                            isSelected && styles.statusSelectChipTextActive,
                            st === 'blocked' && isSelected && { color: '#DC2626' },
                          ]}
                        >
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Delete User Section */}
                <View style={styles.dangerZone}>
                  <Text style={styles.dangerZoneLabel}>DANGER ZONE</Text>
                  <TouchableOpacity
                    style={styles.deleteUserBtn}
                    onPress={handleDeleteUser}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    <Text style={styles.deleteUserBtnText}>Delete User Permanently</Text>
                  </TouchableOpacity>
                  <Text style={styles.dangerZoneHelp}>
                    Permanently deletes this user account and removes access immediately.
                  </Text>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActionModalVisible(false)}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveUser}
                  activeOpacity={0.85}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: renewxFontFamily.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },

  /* 4 Stat Cards */
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minWidth: 138,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  /* Search & Filter Row */
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontFamily: renewxFontFamily.regular,
    fontSize: 12.5,
    color: '#0F172A',
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tabs & Sort Row */
  tabsSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tabsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#EAB308',
  },
  tabPillText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Users List & Cards */
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usersList: {
    gap: 10,
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  avatarInitialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 15,
    fontWeight: '800',
  },
  colInfo: {
    flex: 1.4,
    justifyContent: 'center',
  },
  userName: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  userPhone: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  colJoined: {
    flex: 1.1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  joinedLabel: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 9.5,
    color: '#94A3B8',
  },
  joinedDate: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  joinedTime: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  colBadges: {
    alignItems: 'flex-start',
    gap: 4,
    paddingHorizontal: 4,
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 9999,
  },
  roleBadgeCustomer: {
    backgroundColor: '#EFF6FF',
  },
  roleBadgeAdmin: {
    backgroundColor: '#FEF3C7',
  },
  roleBadgeText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    fontWeight: '600',
  },
  roleBadgeTextCustomer: {
    color: '#2563EB',
  },
  roleBadgeTextAdmin: {
    color: '#D97706',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 9999,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeBlocked: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadgeTextActive: {
    color: '#16A34A',
  },
  statusBadgeTextInactive: {
    color: '#EA580C',
  },
  statusBadgeTextBlocked: {
    color: '#DC2626',
  },
  moreBtn: {
    padding: 6,
    marginLeft: 4,
  },

  /* Pagination Row */
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  paginationInfoText: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
  },
  pageBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberBtnActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#EAB308',
  },
  pageNumberText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  pageNumberTextActive: {
    color: '#000000',
    fontWeight: '800',
  },

  /* Action & Edit Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  modalAvatarBox: {
    marginRight: 2,
  },
  modalAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarInitials: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalUserName: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalUserEmail: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalUserPhone: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },

  modalBody: {
    padding: 16,
  },
  modalSectionLabel: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  roleChoiceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 10,
    marginBottom: 8,
  },
  roleChoiceCardSelected: {
    borderColor: '#EAB308',
    backgroundColor: '#FEF9C3',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: '#CA8A04',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#CA8A04',
  },
  roleChoiceTitle: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  roleChoiceSub: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },

  statusChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statusSelectChip: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  statusSelectChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  statusSelectChipText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusSelectChipTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },

  /* Danger Zone */
  dangerZone: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
    marginBottom: 8,
  },
  dangerZoneLabel: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  deleteUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 9,
    marginBottom: 6,
  },
  deleteUserBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  dangerZoneHelp: {
    fontFamily: renewxFontFamily.regular,
    fontSize: 10.5,
    color: '#991B1B',
    textAlign: 'center',
  },

  /* Modal Footer */
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  modalCancelBtnText: {
    fontFamily: renewxFontFamily.semibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#FFCC00',
  },
  modalSaveBtnText: {
    fontFamily: renewxFontFamily.bold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#000000',
  },
});
