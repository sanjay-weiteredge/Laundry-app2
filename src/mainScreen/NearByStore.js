import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getStoreData } from '../services/configService';
import colors from '../component/color';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const buildAddress = (addr) => {
  if (!addr) return '';
  const parts = [
    addr.addressLine,
    addr.addressLine2,
    addr.area,
    addr.city,
    addr.stateName || addr.state,
    addr.zip,
  ].filter(Boolean);
  return parts.join(', ');
};

const callPhone = (phone) => {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`);
};

const openDirections = (lat, lng) => {
  if (!lat || !lng) return;
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
};

/* ─────────────────────────────────────────
   Selected / Main Store Hero Card
───────────────────────────────────────── */
const MainStoreCard = ({ data }) => {
  const address = buildAddress(data.address);
  const isActive = data.state?.toUpperCase() === 'ACTIVE';
  const hasCoords = data.lat && data.lng;

  return (
    <View style={styles.heroCard}>
      {/* Brand / store name */}
      <View style={styles.heroHeader}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="storefront" size={26} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.heroStoreName}>
            {data.branding?.name || data.orgName || 'Store'}
          </Text>
          {!!data.partnerName && (
            <Text style={styles.heroPartner}>{data.partnerName}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#E6F7EC' : '#FFEAEA' }]}>
          <Text style={[styles.statusText, { color: isActive ? '#1E9E5A' : '#D9534F' }]}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Address */}
      {!!address && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.infoText}>{address}</Text>
        </View>
      )}

      {/* Phone */}
      {!!data.phoneNumber && (
        <TouchableOpacity style={styles.infoRow} onPress={() => callPhone(data.phoneNumber)}>
          <Ionicons name="call-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary, fontWeight: '500' }]}>
            {data.phoneNumber}
          </Text>
        </TouchableOpacity>
      )}

      {/* Email */}
      {!!data.address?.email && (
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.infoText}>{data.address.email}</Text>
        </View>
      )}

      {/* Order prefix */}
      {!!data.orderPrefix && (
        <View style={styles.infoRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.secondaryText} />
          <Text style={styles.infoText}>
            Order prefix: <Text style={{ fontWeight: '600' }}>{data.orderPrefix}</Text>
          </Text>
        </View>
      )}

      {/* Directions button */}
      {hasCoords && (
        <TouchableOpacity
          style={styles.directionsBtn}
          onPress={() => openDirections(data.lat, data.lng)}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={18} color="#fff" />
          <Text style={styles.directionsBtnText}>Get Directions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ─────────────────────────────────────────
   Branch row card (one per childOrg)
───────────────────────────────────────── */
const BranchCard = ({ branch }) => {
  const address = buildAddress(branch.address);
  const isActive = branch.state?.toUpperCase() === 'ACTIVE';

  return (
    <View style={styles.branchCard}>
      {/* Icon + name + badge */}
      <View style={styles.branchHeader}>
        <View style={styles.branchIconWrap}>
          <Ionicons name="business-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.branchName}>{branch.brandingName || branch.name}</Text>
          {!!branch.orderPrefix && (
            <Text style={styles.branchMeta}>Prefix: {branch.orderPrefix}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#E6F7EC' : '#FFEAEA' }]}>
          <Text style={[styles.statusText, { color: isActive ? '#1E9E5A' : '#D9534F' }]}>
            {isActive ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Address – only show if it has content */}
      {!!address && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.infoText, { fontSize: 12 }]}>{address}</Text>
        </View>
      )}
    </View>
  );
};

/* ─────────────────────────────────────────
   Main Screen
───────────────────────────────────────── */
const NearByStore = () => {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStoreDetails = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      const data = await getStoreData();
      setOrgData(data);
    } catch (err) {
      console.error('NearByStore fetch error:', err);
      setError(err?.message || 'Failed to load store details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStoreDetails();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStoreDetails(true);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchStoreDetails()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!orgData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.emptyText}>No store information available</Text>
        </View>
      </SafeAreaView>
    );
  }

  // childOrgs = all store branches from the API response
  const childOrgs = Array.isArray(orgData.childOrgs)
    ? orgData.childOrgs.filter((s) => s.state?.toUpperCase() === 'ACTIVE')
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={childOrgs}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        /* The currently selected store card goes at the top */
        ListHeaderComponent={
          <>
            <MainStoreCard data={orgData} />

            {/* Section label for branches */}
            {childOrgs.length > 0 && (
              <View style={styles.sectionHeader}>
                <Ionicons name="git-branch-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  All Branches ({childOrgs.length})
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <BranchCard branch={item} />}
        ListEmptyComponent={
          <View style={styles.emptyBranches}>
            <Text style={styles.emptyText}>No branches available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#555',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#F44336',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyBranches: {
    alignItems: 'center',
    paddingTop: 16,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  /* ── Section label ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  /* ── Status badge ── */
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  /* ── Info row ── */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  /* ── Directions button ── */
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
  },
  directionsBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  /* ── Hero / current store card ── */
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStoreName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  heroPartner: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  /* ── Branch card ── */
  branchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  branchMeta: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
  },
});

export default NearByStore;
