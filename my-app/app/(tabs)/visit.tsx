import { StyleSheet, FlatList, ActivityIndicator, View, TouchableOpacity, Platform, ScrollView, Modal as RNModal, Button, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '@/context/AppContext';
import React, { useMemo, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AddVisitModal from '@/components/AddVisitModal';

export default function VisitScreen() {
  const { loading, kunjunganList, orderList, loadData } = useAppContext();
  const [filter, setFilter] = useState('today'); // 'today', 'this_month', 'all', 'custom_date'
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date()); // State sementara untuk iOS
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddVisitModalVisible, setIsAddVisitModalVisible] = useState(false);

  const processedKunjunganList = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const filteredList = kunjunganList.filter((kunjungan) => {
      if (!kunjungan.createdAt) return false; // createdAt is now ISO string
      const visitDate = new Date(kunjungan.createdAt);
      if (filter === 'today') {
        return visitDate >= todayStart;
      }
      if (filter === 'this_month') {
        return visitDate >= monthStart;
      }
      if (filter === 'custom_date') {
        const visitDateString = visitDate.toDateString();
        const customDateString = customDate.toDateString();
        return visitDateString === customDateString;
      }
      return true; // 'all'
    });

    // Menggabungkan data kunjungan dengan data order yang sesuai
    return filteredList.map((kunjungan) => {
      if (kunjungan.status === 'Order') {
        const relatedOrders = orderList.filter((order) => { // order.createdAt is also ISO string
          if (!order.createdAt || !kunjungan.createdAt) return false;

          const visitDate = new Date(kunjungan.createdAt);
          const orderDate = new Date(order.createdAt);

          const daysToAdd = visitDate.getDay() === 6 ? 2 : 1;
          const expectedOrderDate = new Date(visitDate);
          expectedOrderDate.setDate(visitDate.getDate() + daysToAdd);

          return order.tokoId === kunjungan.tokoId && orderDate.toDateString() === expectedOrderDate.toDateString();
        });

        if (relatedOrders.length > 0) {
          const total = relatedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
          const items = relatedOrders.flatMap((order) => order.items || []);
          return { ...kunjungan, total, items, status: 'Order' };
        }
      }
      return kunjungan;
    });
  }, [kunjunganList, orderList, filter, customDate]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false); // Di Android, tutup modal setelah interaksi
      if (event.type === 'set' && selectedDate) {
        setCustomDate(selectedDate);
        setFilter('custom_date');
      }
    } else {
      // Di iOS, hanya update state sementara
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleConfirmIOS = () => {
    setCustomDate(tempDate);
    setFilter('custom_date');
    setShowDatePicker(false);
  };

  const showDatepicker = () => {
    // Inisialisasi tempDate dengan tanggal saat ini saat membuka picker
    setTempDate(customDate);
    setShowDatePicker(true);
  };
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#402566" />
        <ThemedText>Memuat data kunjungan...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.pageContainer}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Riwayat Kunjungan
        </ThemedText>
        <TouchableOpacity onPress={() => setIsAddVisitModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={32} color="#402566" />
        </TouchableOpacity>
      </ThemedView>
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'today' && styles.activeFilterButton]}
            onPress={() => setFilter('today')}>
            <ThemedText style={[styles.filterButtonText, filter === 'today' && styles.activeFilterButtonText]}>Hari Ini</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'this_month' && styles.activeFilterButton]}
            onPress={() => setFilter('this_month')}>
            <ThemedText style={[styles.filterButtonText, filter === 'this_month' && styles.activeFilterButtonText]}>Bulan Ini</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
            onPress={() => setFilter('all')}>
            <ThemedText style={[styles.filterButtonText, filter === 'all' && styles.activeFilterButtonText]}>Semua</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'custom_date' && styles.activeFilterButton]}
            onPress={showDatepicker}>
            <Ionicons name="calendar-outline" size={16} color={filter === 'custom_date' ? '#FFFFFF' : '#402566'} />
            <ThemedText style={[styles.filterButtonText, filter === 'custom_date' && styles.activeFilterButtonText]}>
              {filter === 'custom_date'
                ? customDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Pilih Tanggal'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <FlatList
        data={processedKunjunganList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity key={item.id} style={styles.visitItem}>
            <View style={styles.visitAvatar}>
              <ThemedText style={styles.visitAvatarText}>{(item.tokoNama || '?').charAt(0).toUpperCase()}</ThemedText>
            </View>
            <View style={styles.visitDetails}>
              <ThemedText type="defaultSemiBold">{item.tokoNama || 'Toko tidak diketahui'}</ThemedText>
              <ThemedText style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </ThemedText>
            </View>
            {item.status === 'Order' ? (
              <View style={styles.visitOrderInfo}>
                <ThemedText style={styles.visitOrderTotal}>Rp{(item.total || 0).toLocaleString('id-ID')}</ThemedText>
                <ThemedText style={styles.visitOrderBox}>
                  {item.items?.reduce((sum, i) => sum + i.qtyBox, 0) || 0} box
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.visitStatus, styles.statusNoOrder]}>
                <ThemedText style={styles.visitStatusText}>Tidak Order</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>Belum ada riwayat kunjungan.</ThemedText>}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#402566']} // Warna indikator refresh
          />
        }
      />
      <RNModal
        // Modal ini hanya akan aktif untuk iOS
        transparent={true}
        animationType="fade"
        visible={Platform.OS === 'ios' && showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}>
        {Platform.OS === 'ios' && (
          <View style={styles.modalContainer}>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                testID="dateTimePicker"
                value={tempDate} // Gunakan tempDate untuk iOS
                mode="date"
                display="inline" // Inline display untuk iOS di dalam modal kustom
                onChange={onDateChange}
              />
              <View style={styles.iosPickerButtons}>
                <Button title="Batal" onPress={() => setShowDatePicker(false)} color="#ef4444" />
                <Button title="Selesai" onPress={handleConfirmIOS} />
              </View>
            </View>
          </View>
        )}
      </RNModal>

      {/* DateTimePicker untuk Android (akan memunculkan dialog native) */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={customDate} // Gunakan customDate langsung untuk Android
          mode="date"
          display="default" // Ini akan memicu dialog native di Android
          onChange={onDateChange}
        />
      )}

      <AddVisitModal
        visible={isAddVisitModalVisible}
        onClose={() => setIsAddVisitModalVisible(false)}
      />
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8f6fc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 48,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  title: {
    color: '#402566',
  },
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e0ddee',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: '#402566',
    borderColor: '#402566',
    shadowColor: '#402566',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    // elevation: 4,
  },
  filterButtonText: {
    color: '#402566',
    fontWeight: '600',
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  list: { flex: 1, width: '100%' },
  listContent: {
    padding: 16,
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
  dateText: {
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
    marginTop: 32,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxWidth: 350,
  },
  iosPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
});