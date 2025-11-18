import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Modal, FlatList, ScrollView, Image } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'; 
import { supabase } from '@/supabase';

interface AddVisitModalProps {
  visible: boolean;
  onClose: () => void;
}

interface CartItem {
  id: string;
  nama: string;
  hargaBox: number;
  hargaPcs: number;
  qtyBox: number;
  qtyPcs: number;
}

export default function AddVisitModal({ visible, onClose }: AddVisitModalProps) {
  const { daftarToko, produkList, orderList, loadData } = useAppContext();
  const router = useRouter();

  const [selectedTokoId, setSelectedTokoId] = useState<string | undefined>();
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStorePickerVisible, setStorePickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visitDate, setVisitDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCatatanVisible, setIsCatatanVisible] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSortBy, setProductSortBy] = useState('terlaris'); // 'terlaris', 'abjad', 'tersedia'
  const [productRecommendations, setProductRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  // Reset form state when modal is opened
  useEffect(() => {
    if (visible) {
      setSelectedTokoId(daftarToko[0]?.id);
      setCatatan('');
      setVisitDate(new Date()); // Reset tanggal ke hari ini
      setCart([]); // Kosongkan keranjang
      setIsCatatanVisible(false); // Sembunyikan catatan
      setProductSearchTerm('');
    }
  }, [visible, daftarToko]);

  const filteredDaftarToko = useMemo(() => {
    if (!searchQuery) {
      return daftarToko;
    }
    return daftarToko.filter((toko) =>
      toko.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [daftarToko, searchQuery]);

  const selectedToko = useMemo(() => {
    return daftarToko.find((t) => t.id === selectedTokoId);
  }, [selectedTokoId, daftarToko]);

  const productSales = useMemo(() => {
    const salesMap = new Map<string, number>();
    orderList.forEach((order) => {
        order.items?.forEach((item: any) => {
            salesMap.set(item.produkId, (salesMap.get(item.produkId) || 0) + item.qtyBox);
        });
    });
    return salesMap;
  }, [orderList]);

  useEffect(() => {
    if (selectedTokoId && produkList.length > 0 && orderList.length > 0) {
        setLoadingRecommendations(true);
        const timer = setTimeout(() => {
            const purchaseHistory = new Map();
            orderList
                .filter((o: any) => o.tokoId === selectedTokoId)
                .forEach((order: any) => {
                    order.items?.forEach((item: any) => {
                        purchaseHistory.set(item.produkId, (purchaseHistory.get(item.produkId) || 0) + 1);
                    });
                });

            const frequentProductIds = [...purchaseHistory.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
            const globalBestSellers = [...productSales.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
            const unboughtBestSellers = globalBestSellers.filter((productId) => !purchaseHistory.has(productId));
            const recommendationIds = [...new Set([...frequentProductIds, ...unboughtBestSellers])].slice(0, 5);
            const recommendations = recommendationIds.map((id) => produkList.find((p) => p.id === id)).filter(Boolean);

            setProductRecommendations(recommendations);
            setLoadingRecommendations(false);
        }, 300);

        return () => clearTimeout(timer);
    } else {
        setProductRecommendations([]);
    }
  }, [selectedTokoId, produkList, orderList, productSales]);

  const sortedProdukList = useMemo(() => {
    return [...produkList]
        .filter((p) => p.nama.toLowerCase().includes(productSearchTerm.toLowerCase()))
        .sort((a, b) => {
            if (productSortBy === 'terlaris') {
                return (productSales.get(b.id) || 0) - (productSales.get(a.id) || 0);
            }
            return a.nama.localeCompare(b.nama);
        });
  }, [produkList, productSearchTerm, productSortBy, productSales]);

  const { totalHarga, totalBox } = useMemo(() => {
    return cart.reduce((acc, item) => {
      acc.totalHarga += (item.qtyBox * item.hargaBox) + (item.qtyPcs * item.hargaPcs);
      acc.totalBox += item.qtyBox;
      return acc;
    }, { totalHarga: 0, totalBox: 0 });
  }, [cart]);
  
  const handleSave = async () => {
    if (!selectedTokoId) {
      Alert.alert('Error', 'Silakan pilih toko terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!selectedToko) {
        throw new Error('Toko tidak ditemukan');
      }

      const status = cart.length > 0 ? 'Order' : 'Tidak Order';

      // Set time to the beginning of the day for consistency
      const visitDateStartOfDay = new Date(visitDate);
      visitDateStartOfDay.setHours(0, 0, 0, 0);

      const deliveryDate = new Date(visitDateStartOfDay);
      deliveryDate.setDate(deliveryDate.getDate() + 1);

      // Gunakan batch write untuk memastikan semua operasi berhasil atau gagal bersamaan
      const batch = writeBatch(db);

      // 1. Siapkan dokumen kunjungan
      const newKunjunganRef = doc(collection(db, 'kunjungan'));
      const visitData = {
        tokoId: selectedTokoId,
        namaToko: selectedToko.nama,
        status: status,
        catatan: catatan,
        createdAt: visitDateStartOfDay,
        recordedAt: serverTimestamp(),
      };
      batch.set(newKunjunganRef, visitData);

      // 2. Jika ada order, siapkan dokumen order
      if (status === 'Order') {
        const newOrderRef = doc(collection(db, 'orders'));
        const orderData = {
          tokoId: selectedTokoId,
          namaToko: selectedToko.nama,
          createdAt: deliveryDate, // Order dicatat untuk H+1
          recordedAt: serverTimestamp(),
          items: cart.map(({ id, nama, qtyBox, qtyPcs }) => ({ produkId: id, nama, qtyBox, qtyPcs })),
          totalHarga: totalHarga,
          totalBox: totalBox,
        };
        batch.set(newOrderRef, orderData);
      }

      // 3. Jalankan batch write
      await batch.commit();

      await loadData(); // Refresh data

      Alert.alert('Sukses', 'Kunjungan berhasil disimpan.', [
        {
          text: 'OK',
          onPress: () => onClose(), // Cukup tutup modal
        },
      ]);
    } catch (error) {
      console.error('Error saving visit:', error);
      Alert.alert('Error', 'Gagal menyimpan kunjungan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setVisitDate(selectedDate);
    }
  };

  const updateCart = (produk: any, type: 'box' | 'pcs', amount: number) => {
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(item => item.id === produk.id);
      let newCart = [...currentCart];

      if (existingItemIndex > -1) {
        // Item sudah ada di keranjang, update quantity
        const updatedItem = { ...newCart[existingItemIndex] };
        if (type === 'box') {
          updatedItem.qtyBox = Math.max(0, updatedItem.qtyBox + amount);
        } else {
          updatedItem.qtyPcs = Math.max(0, updatedItem.qtyPcs + amount);
        }

        if (updatedItem.qtyBox === 0 && updatedItem.qtyPcs === 0) {
          // Hapus dari keranjang jika quantity menjadi 0
          newCart.splice(existingItemIndex, 1);
        } else {
          newCart[existingItemIndex] = updatedItem;
        }
      } else if (amount > 0) {
        // Item belum ada, tambahkan ke keranjang
        newCart.push({
          id: produk.id,
          nama: produk.nama,
          hargaBox: produk.hargaBox || 0,
          hargaPcs: produk.hargaPcs || 0,
          qtyBox: type === 'box' ? amount : 0,
          qtyPcs: type === 'pcs' ? amount : 0,
        });
      }

      return newCart;
    });
  };

  return (
    <>
    <Modal
      animationType="slide"
      visible={isStorePickerVisible}
      onRequestClose={() => setStorePickerVisible(false)}
    >
      <ThemedView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText type="title">Pilih Toko</ThemedText>
          <TouchableOpacity onPress={() => setStorePickerVisible(false)}>
            <Ionicons name="close" size={28} color="#402566" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama toko..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <FlatList
          data={filteredDaftarToko}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tokoItem}
              onPress={() => {
                setSelectedTokoId(item.id);
                setStorePickerVisible(false);
                setSearchQuery('');
              }}
            >
              <View style={styles.tokoAvatar}>
                <ThemedText style={styles.tokoAvatarText}>
                  {item.nama.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View>
                <ThemedText type="defaultSemiBold">{item.nama}</ThemedText>
                <ThemedText style={styles.tokoAlamat}>{item.alamat}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <ThemedText style={styles.emptyListText}>Toko tidak ditemukan.</ThemedText>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </ThemedView>
    </Modal>


    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container} >
        <View style={styles.header}>
          <ThemedText type="title">Tambah Kunjungan</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#402566" />
          </TouchableOpacity>
        </View>
        <View style={styles.form}>
        <ScrollView>
          <ThemedText style={styles.label}>Pilih Toko</ThemedText>
          <TouchableOpacity style={styles.selectButton} onPress={() => setStorePickerVisible(true)}>
            <ThemedText style={selectedToko ? styles.selectButtonText : styles.selectButtonPlaceholder}>
              {selectedToko ? selectedToko.nama : 'Ketuk untuk memilih toko'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <ThemedText style={styles.label}>Tanggal Kunjungan</ThemedText>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
            <ThemedText style={styles.selectButtonText}>
              {visitDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </ThemedText>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>

          {/* DateTimePicker Component */}
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={visitDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}


          {isCatatanVisible ? (
            <>
              <ThemedText style={styles.label}>Catatan (Opsional)</ThemedText>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={4}
                value={catatan}
                onChangeText={setCatatan}
                placeholder="Contoh: Stok menipis, minta dikirim besok."
                placeholderTextColor="#999"
                autoFocus={true}
              />
            </>
          ) : (
            <TouchableOpacity style={styles.addNoteButton} onPress={() => setIsCatatanVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#402566" />
              <ThemedText style={styles.addNoteButtonText}>Tambah Catatan</ThemedText>
            </TouchableOpacity>
          )}

          {/* Rekomendasi Produk */}
          {selectedTokoId && productRecommendations.length > 0 && (
            <View>
              <ThemedText style={styles.label}>Rekomendasi Untuk Toko Ini</ThemedText>
              {loadingRecommendations ? (
                <View style={styles.recommendationLoader}>
                  <ActivityIndicator color="#402566" />
                  <ThemedText style={{color: '#666'}}>Menganalisis...</ThemedText>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationContainer}>
                  {productRecommendations.map((produk) => {
                    const cartItem = cart.find(item => item.id === produk.id);
                    return (
                      <TouchableOpacity key={produk.id} style={styles.recommendationCard} onPress={() => updateCart(produk, 'box', 1)}>
                        <Image
                          source={{ uri: produk.imageUrl || 'https://via.placeholder.com/100?text=Produk' }}
                          style={styles.recommendationImage}
                        />
                        <ThemedText style={styles.recommendationName} numberOfLines={2}>{produk.nama}</ThemedText>
                        {cartItem && (
                           <View style={styles.inCartIndicatorSmall}>
                             <ThemedText style={styles.inCartIndicatorTextSmall}>{cartItem.qtyBox}</ThemedText>
                           </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}
          
          <ThemedText style={styles.label}>Daftar Produk</ThemedText>
          <TextInput
            style={styles.productSearchInput}
            placeholder="Cari produk..."
            value={productSearchTerm}
            onChangeText={setProductSearchTerm}
            placeholderTextColor="#999"
          />
          <View style={styles.sortContainer}>
            {['terlaris', 'abjad'].map((filter) => (
              <TouchableOpacity key={filter} onPress={() => setProductSortBy(filter)} style={[styles.sortButton, productSortBy === filter && styles.activeSortButton]}>
                <ThemedText style={[styles.sortButtonText, productSortBy === filter && styles.activeSortButtonText]}>
                  {filter === 'abjad' ? 'A-Z' : 'Terlaris'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.productGridContainer}>
            {sortedProdukList.map(produk => {
              const cartItem = cart.find(item => item.id === produk.id);
              const qtyBox = cartItem?.qtyBox || 0;
              const isInCart = !!cartItem;

              return (
                <View key={produk.id} style={[styles.productCard, isInCart && styles.productCardInCart]}>
                  <Image 
                    source={{ uri: produk.imageUrl || 'https://via.placeholder.com/100?text=Produk' }} 
                    style={styles.productImage} 
                  />
                  <View style={styles.productCardContent}>
                    <ThemedText style={styles.productName} numberOfLines={2}>{produk.nama}</ThemedText>
                    <ThemedText style={styles.productPrice}>
                      Rp {(produk.hargaBox || 0).toLocaleString('id-ID')}
                    </ThemedText>
                  </View>
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => updateCart(produk, 'box', -1)} disabled={!isInCart}>
                      <Ionicons name="remove-circle" size={28} color={isInCart ? '#ef4444' : '#DDD'} />
                    </TouchableOpacity>
                    <ThemedText style={styles.quantityText}>{qtyBox}</ThemedText>
                    <TouchableOpacity style={styles.quantityButton} onPress={() => updateCart(produk, 'box', 1)}>
                      <Ionicons name="add-circle" size={28} color="#16a34a" />
                    </TouchableOpacity>
                  </View>
                  {isInCart && (
                    <View style={styles.inCartIndicator}>
                      <ThemedText style={styles.inCartIndicatorText}>{qtyBox} Box</ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
        </View>

        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>Rp {totalHarga.toLocaleString('id-ID')}</ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.saveButton, (isSubmitting || !selectedToko) && styles.disabledButton]} 
            onPress={handleSave} 
            disabled={isSubmitting || !selectedToko}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Simpan Kunjungan</ThemedText>
            )}
          </TouchableOpacity>
        </View>

      </ThemedView>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f6fc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 48, backgroundColor: '#FFFFFF' },
  form: { flex: 1, padding: 24, paddingTop: 12 },
  label: { fontSize: 16, fontWeight: '600', color: '#402566', marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#e0ddee', padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 14 },
  // Styles for Store Picker Modal
  modalContainer: { flex: 1, backgroundColor: '#f8f6fc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, margin: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e0ddee' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 16 },
  tokoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tokoAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0eaff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokoAvatarText: { color: '#402566', fontWeight: 'bold', fontSize: 16 },
  tokoAlamat: { fontSize: 12, color: '#666' },
  emptyListContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyListText: { color: '#666', fontSize: 16 },
  // Styles for the new select button
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0ddee',
    padding: 14,
    marginBottom: 20,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  // Product List Styles
  productItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0ddee',
  },
  productInfo: {
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#402566',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  // Footer Styles
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: { fontSize: 14, color: '#666' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#402566' },
  saveButton: { backgroundColor: '#402566', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { backgroundColor: '#a78bfa' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0eaff',
    marginTop: 16,
  },
  addNoteButtonText: {
    color: '#402566',
    fontWeight: '600',
  },
  productSearchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0ddee',
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e0ddee',
  },
  activeSortButton: {
    backgroundColor: '#f0eaff',
    borderColor: '#402566',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeSortButtonText: {
    color: '#402566',
  },
  // Recommendation Styles
  recommendationContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  recommendationCard: {
    width: 90,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0ddee',
    padding: 8,
    alignItems: 'center',
  },
  recommendationImage: {
    width: 50,
    height: 50,
    marginBottom: 6,
  },
  recommendationName: {
    fontSize: 11,
    textAlign: 'center',
    height: 28,
  },
  recommendationLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#f0eaff', borderRadius: 8 },
  // Product Grid Styles
  productGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0ddee',
    overflow: 'hidden',
  },
  productCardInCart: {
    borderColor: '#402566',
  },
  productImage: {
    width: '100%',
    height: 90,
    backgroundColor: '#F0F0F0',
  },
  productCardContent: {
    padding: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    height: 32, // Ruang untuk 2 baris
  },
  productPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  quantityButton: {
    // padding: 4,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#402566',
  },
  inCartIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(64, 37, 102, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inCartIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inCartIndicatorSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  inCartIndicatorTextSmall: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
});