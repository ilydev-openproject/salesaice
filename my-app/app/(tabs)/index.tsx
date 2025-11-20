import { StyleSheet, ActivityIndicator, Image, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '../context/AppContext';
import React, { useMemo, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay, addDays } from 'date-fns'; // Import helper date-fns
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const { loading, kunjunganList, orderList, targets, loadData, produkList } = useAppContext();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddVisitModalVisible, setIsAddVisitModalVisible] = useState(false);
  const { monthly, daily, targetDetails } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const kunjunganBulanIni = kunjunganList.filter((kunjungan) => {
      if (!kunjungan.createdAt) return false;
      const visitDate = new Date(kunjungan.createdAt);
      return visitDate >= monthStart && visitDate <= monthEnd;
    });

    const orderBulanIni = orderList.filter((order) => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate >= monthStart && orderDate <= monthEnd;
    });

    const totalBoxTerjualBulanIni = orderBulanIni.reduce(
      (sum, item) => sum + (item.items?.reduce((qty, subItem) => qty + subItem.qtyBox, 0) || 0),
      0
    );

    const TARGET_BOX_BULANAN = targets.TARGET_BOX_BULANAN || 1;
    const progress = Math.min((totalBoxTerjualBulanIni / TARGET_BOX_BULANAN) * 100, 100);
    const sisa = Math.max(0, TARGET_BOX_BULANAN - totalBoxTerjualBulanIni);

    // --- Hitung sisa hari kerja & target harian ---
    let sisaHari = 0;
    if (now <= monthEnd) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      for (let d = tomorrow; d <= monthEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) { // 0 = Minggu, asumsikan libur
          sisaHari++;
        }
      }
    }
    const harian = sisaHari > 0 ? Math.ceil(sisa / sisaHari) : 0;

    // --- Hitung data HARI INI ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const kunjunganHariIni = kunjunganList.filter((k) => {
      if (!k.createdAt) return false;
      const visitDate = new Date(k.createdAt);
      return visitDate >= todayStart && visitDate <= todayEnd;
    });

    // --- PERBAIKAN LOGIKA ORDER HARI INI (Sesuai Web) ---
    const orderHariIni = orderList.filter((o) => {
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt);
      // Order hari ini dihitung dari kunjungan hari ini, yang akan dikirim BESOK (H+1)
      return isSameDay(orderDate, addDays(new Date(), 1));
    });

    const totalBoxHariIni = orderHariIni.reduce((sum, item) => sum + (item.items?.reduce((qty, subItem) => qty + subItem.qtyBox, 0) || 0), 0);
    const totalPendapatanHariIni = orderHariIni.reduce((sum, item) => sum + Number(item.total || 0), 0);

    return {
      monthly: { totalKunjungan: kunjunganBulanIni.length, totalBox: totalBoxTerjualBulanIni },
      daily: { totalKunjungan: kunjunganHariIni.length, totalBox: totalBoxHariIni, totalPendapatan: totalPendapatanHariIni },
      targetDetails: { progressPersen: progress, sisaTarget: sisa, sisaHariKerja: sisaHari, targetHarian: harian },
    };
  }, [kunjunganList, orderList, targets]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#402566" />
        <ThemedText>Menyiapkan aplikasi...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.pageContainer}>
      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="subtitle" style={styles.title}>
            Sales App
          </ThemedText>
          <ThemedText style={styles.dateText}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        </View>
      </ThemedView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#402566']}
          />
        }>
        {/* Kartu Performa */}
        <LinearGradient
          colors={['#7C3AED', '#D946EF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryCard}>
          <ThemedText style={styles.primaryCardTitle}>Performa Bulan Ini</ThemedText>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <ThemedText style={styles.primaryCardValue}>{monthly.totalKunjungan}</ThemedText>
              <ThemedText style={styles.primaryCardLabel}>Kunjungan</ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.primaryCardValue}>{monthly.totalBox}</ThemedText>
              <ThemedText style={styles.primaryCardLabel}>Box Terjual</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Kartu Target */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Target Bulan Ini
            </ThemedText>
            <Ionicons name="ellipsis-horizontal" size={20} color="#402566" />
          </View>
          <View style={styles.targetGridContainer}>
            {/* Kolom Kiri (Card 1) */}
            <View style={styles.targetGridLeft}>
              <LinearGradient
                colors={['#4f46e5', '#7c3aed']} // Gradien Indigo ke Ungu
                style={[styles.infoCard, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText style={styles.infoCardLabelWhite}>Tercapai</ThemedText>
                <ThemedText style={styles.infoCardValueLargeWhite} numberOfLines={1} adjustsFontSizeToFit>
                  {monthly.totalBox}
                </ThemedText>
              </LinearGradient>
            </View>

            {/* Kolom Kanan */}
            <View style={styles.targetGridRight}>
              {/* Card 2: Progres */}
              <LinearGradient colors={['#3b82f6', '#60a5fa']} style={styles.infoCard}>
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View>
                    <View style={styles.progressTitleContainer}>
                      <ThemedText style={styles.infoCardLabelWhite}>Progres</ThemedText>
                      <ThemedText style={styles.progressTextBoldWhite}>{targetDetails.progressPersen.toFixed(0)}%</ThemedText>
                    </View>
                    <View style={[styles.progressContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                      <View style={[styles.progressBar, { backgroundColor: '#FFFFFF', width: `${targetDetails.progressPersen}%` }]} />
                    </View>
                  </View>
                  <ThemedText style={styles.progressTextWhite}>Sisa {targetDetails.sisaTarget} dari {targets.TARGET_BOX_BULANAN} Box</ThemedText>
                </View>
              </LinearGradient>

              {/* Card 3: Target Harian */}
              {targetDetails.sisaTarget > 0 && targetDetails.targetHarian > 0 && (
                <LinearGradient colors={['#a78bfa', '#c4b5fd']} style={[styles.infoCard, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <Ionicons name="speedometer-outline" size={32} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.infoCardLabelWhite} numberOfLines={1}>Target Harian</ThemedText>
                    <ThemedText style={styles.infoCardValueWhite}>{targetDetails.targetHarian} <ThemedText style={styles.infoCardUnitWhite}>box/hr</ThemedText></ThemedText>
                  </View>
                </LinearGradient>
              )}
            </View>
          </View>
        </View>

        {/* Ringkasan Hari Ini */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Ringkasan Hari Ini
            </ThemedText>
            <Ionicons name="ellipsis-horizontal" size={20} color="#402566" />
          </View>
          <LinearGradient colors={['#8b5cf6', '#6d28d9']} style={styles.dailySummaryCard}>
            <View style={styles.dailySummaryItem}>
              <Ionicons name="walk-outline" size={20} color="#fff" />
              <ThemedText style={styles.dailySummaryValue}>{daily.totalKunjungan}</ThemedText>
              <ThemedText style={styles.dailySummaryLabel}>Kunjungan</ThemedText>
            </View>
            <View style={styles.dailySummaryDivider} />
            <View style={styles.dailySummaryItem}>
              <Ionicons name="cube-outline" size={20} color="#fff" />
              <ThemedText style={styles.dailySummaryValue}>{daily.totalBox}</ThemedText>
              <ThemedText style={styles.dailySummaryLabel}>Box</ThemedText>
            </View>
            <View style={styles.dailySummaryDivider} />
            <View style={styles.dailySummaryItem}>
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <ThemedText style={styles.dailySummaryValue}>{(daily.totalPendapatan / 1000).toFixed(0)}k</ThemedText>
              <ThemedText style={styles.dailySummaryLabel}>Rp</ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Menu Laporan */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Menu Laporan
            </ThemedText>
            <Ionicons name="ellipsis-horizontal" size={20} color="#402566" />
          </View>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="trending-up-outline" size={22} color="#7c3aed" />
              </View>
              <ThemedText style={styles.menuItemText}>Produk{'\n'}Terlaris</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="locate-outline" size={22} color="#3b82f6" />
              </View>
              <ThemedText style={styles.menuItemText}>Atur{'\n'}Target</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="analytics-outline" size={22} color="#10b981" />
              </View>
              <ThemedText style={styles.menuItemText}>Analisis{'\n'}Toko</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="gift-outline" size={22} color="#f59e0b" />
              </View>
              <ThemedText style={styles.menuItemText}>Hadiah{'\n'}(Box)</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#cffafe' }]}>
                <Ionicons name="flash-outline" size={22} color="#06b6d4" />
              </View>
              <ThemedText style={styles.menuItemText}>Kecepatan{'\n'}Produk</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="ribbon-outline" size={22} color="#ef4444" />
              </View>
              <ThemedText style={styles.menuItemText}>Grade{'\n'}Toko</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="clipboard-outline" size={22} color="#4f46e5" />
              </View>
              <ThemedText style={styles.menuItemText}>Variant{'\n'}Wajib</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8f6fc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    color: '#402566',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  logo: { width: 50, height: 50, resizeMode: 'contain' },
  primaryCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  primaryCardTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  primaryCardValue: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36, // Perbaikan untuk angka yang terpotong
    fontWeight: 'bold',
  },
  primaryCardLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTitleWhite: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardTargetAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: '#402566',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#402566',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Divider untuk kartu utama
    alignSelf: 'center',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#EAEAEA',
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressLabels: {
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#402566',
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  visitAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0eaff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  visitAvatarText: {
    color: '#402566',
    fontWeight: 'bold',
    fontSize: 16,
  },
  visitDetails: {
    flex: 1,
  },
  visitDate: {
    fontSize: 12,
    color: '#666',
  },
  visitOrderInfo: {
    alignItems: 'flex-end',
  },
  visitOrderTotal: {
    color: '#16a34a', // green-600
    fontWeight: 'bold',
  },
  visitOrderBox: {
    fontSize: 12,
    color: '#666',
  },
  visitStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusNoOrder: {
    backgroundColor: '#fee2e2', // red-50
  },
  visitStatusText: {
    color: '#ef4444', // red-500
    fontWeight: '500',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  dailyTargetContainer: {
    marginTop: 4,
  },
  dailyTargetText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    flexWrap: 'wrap',
  },
  dailyTargetValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  targetContentContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  targetMainColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  targetMainLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  targetMainValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  targetDetailsColumn: {
    flex: 1,
    gap: 4,
  },
  dailySummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  dailySummaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  dailySummaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  dailySummaryLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  dailySummaryDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
  },
  menuItem: {
    width: '25%', // 4 item per baris
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#402566',
    fontWeight: '500',
    fontSize: 11,
    textAlign: 'center',
    height: 28, // Memberi ruang untuk 2 baris teks
  },
  targetGridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  targetGridLeft: {
    flex: 1,
  },
  targetGridRight: {
    flex: 1,
    gap: 12,
  },
  horizontalCardContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  targetCardsContainer: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  horizontalInfoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  infoCardLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoCardLabelWhite: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoCardValueWhite: {
    fontSize: 24, // Ukuran font disesuaikan agar lebih pas
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  infoCardValueLargeWhite: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 44, // Menambahkan lineHeight untuk kontrol vertikal
    // marginTop: 2, // Dihapus untuk mengurangi spasi vertikal
  },
  infoCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#402566',
    marginTop: 2,
  },
  infoCardUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  infoCardUnitWhite: {
    fontSize: 16,
    fontWeight: 'normal',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoCardSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  progressTextWhite: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressTextBold: {
    fontSize: 12,
    color: '#402566',
    fontWeight: 'bold',
  },
  progressTextBoldWhite: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap', // Memungkinkan teks turun baris jika tidak muat
  },
  infoCardLabelBoldWhite: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
