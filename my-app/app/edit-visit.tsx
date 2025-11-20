import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAppContext } from '@/app/context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/lib/supabase';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface CartItem {
  id: string;
  nama: string;
  hargaBox: number;
  hargaPcs: number;
  qtyBox: number;
  qtyPcs: number;
}

export default function EditVisitScreen() {
  const { id: visitId } = useLocalSearchParams();
  const router = useRouter();
  const { kunjunganList, orderList, produkList, loadData } = useAppContext();

  const [visit, setVisit] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [catatan, setCatatan] = useState('');
  const [visitDate, setVisitDate] = useState(new Date());
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCatatanVisible, setIsCatatanVisible] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSortBy, setProductSortBy] = useState('terlaris');

  useEffect(() => {
    if (!visitId || !kunjunganList.length || !produkList.length) return;

    const currentVisit = kunjunganList.find(v => v.id === visitId);
    if (!currentVisit) {
      Alert.alert("Error", "Data kunjungan tidak ditemukan.", [{ text: "OK", onPress: () => router.back() }]);
      return;
    }

    // Cari order terkait (logika dari visit.tsx)
    const visitDateObj = new Date(currentVisit.createdAt);
    const daysToAdd = visitDateObj.getDay() === 6 ? 2 : 1;
    const expectedOrderDate = new Date(visitDateObj);
    expectedOrderDate.setDate(visitDateObj.getDate() + daysToAdd);

    const relatedOrder = orderList.find(o =>
      o.tokoId === currentVisit.tokoId &&
      new Date(o.createdAt).toDateString() === expectedOrderDate.toDateString()
    );

    setVisit(currentVisit);
    setOrder(relatedOrder);
    setCatatan(currentVisit.catatan || '');
    setVisitDate(new Date(currentVisit.createdAt));
    setIsCatatanVisible(!!currentVisit.catatan);

    if (relatedOrder && relatedOrder.items) {
      const initialCart = relatedOrder.items.map((item: any) => {
        const product = produkList.find(p => p.id === item.produkId);
        return {
          id: item.produkId,
          nama: item.nama,
          hargaBox: product?.hargaPerBox || 0,
          hargaPcs: product?.hargaJualPerPcs || 0,
          qtyBox: item.qtyBox || 0,
          qtyPcs: item.qtyPcs || 0,
        };
      });
      setCart(initialCart);
    }

    setIsLoading(false);
  }, [visitId, kunjunganList, orderList, produkList]);

  const productSales = useMemo(() => {
    const salesMap = new Map<string, number>();
    orderList.forEach((order) => {
        order.items?.forEach((item: any) => {
            salesMap.set(item.produkId, (salesMap.get(item.produkId) || 0) + item.qtyBox);
        });
    });
    return salesMap;
  }, [orderList]);

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
      const product = produkList.find(p => p.id === item.id);
      if (product) {
        acc.totalHarga += (item.qtyBox * product.hargaPerBox) + (item.qtyPcs * (product.hargaJualPerPcs || 0));
      }
      acc.totalBox += item.qtyBox;
      return acc;
    }, { totalHarga: 0, totalBox: 0 });
  }, [cart, produkList]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Update Kunjungan
      const { error: visitError } = await supabase
        .from('kunjungan')
        .update({
          catatan: catatan,
          createdAt: visitDate.toISOString(),
          status: cart.length > 0 ? 'Order' : 'Tidak Order',
        })
        .eq('id', visitId);

      if (visitError) throw visitError;

      // Update atau Hapus/Buat Order
      const deliveryDate = new Date(visitDate);
      deliveryDate.setDate(deliveryDate.getDate() + (visitDate.getDay() === 6 ? 2 : 1));

      if (order && cart.length === 0) { // Order ada, tapi keranjang dikosongkan
        const { error: deleteError } = await supabase.from('orders').delete().eq('id', order.id);
        if (deleteError) throw deleteError;
      } else if (cart.length > 0) {
        const orderData = {
          tokoId: visit.tokoId,
          tokoNama: visit.tokoNama,
          createdAt: deliveryDate.toISOString(),
          items: cart.map(({ id, nama, qtyBox, qtyPcs }) => ({ produkId: id, nama, qtyBox, qtyPcs })),
          total: totalHarga,
          totalBox: totalBox,
        };
        if (order) { // Update order yang ada
          const { error: orderUpdateError } = await supabase.from('orders').update(orderData).eq('id', order.id);
          if (orderUpdateError) throw orderUpdateError;
        } else { // Buat order baru
          const { error: orderInsertError } = await supabase.from('orders').insert([orderData]);
          if (orderInsertError) throw orderInsertError;
        }
      }

      await loadData();
      Alert.alert("Sukses", "Perubahan berhasil disimpan.", [{ text: "OK", onPress: () => router.back() }]);

    } catch (error: any) {
      console.error("Error saving changes:", error);
      Alert.alert("Error", `Gagal menyimpan perubahan: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Hapus Kunjungan",
      "Apakah Anda yakin ingin menghapus kunjungan ini? Order terkait (jika ada) juga akan dihapus.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus", style: "destructive", onPress: async () => {
            setIsDeleting(true);
            try {
              // Hapus order terkait terlebih dahulu
              if (order) {
                const { error: orderError } = await supabase.from('orders').delete().eq('id', order.id);
                if (orderError) throw orderError;
              }
              // Hapus kunjungan
              const { error: visitError } = await supabase.from('kunjungan').delete().eq('id', visitId);
              if (visitError) throw visitError;

              await loadData();
              Alert.alert("Sukses", "Kunjungan berhasil dihapus.", [{ text: "OK", onPress: () => router.back() }]);
            } catch (error: any) {
              console.error("Error deleting visit:", error);
              Alert.alert("Error", `Gagal menghapus: ${error.message}`);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const updateCart = useCallback((produk: any, amount: number) => {
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(item => item.id === produk.id);
      let newCart = [...currentCart];

      if (existingItemIndex > -1) {
        const updatedItem = { ...newCart[existingItemIndex] };
        updatedItem.qtyBox = Math.max(0, updatedItem.qtyBox + amount);
        if (updatedItem.qtyBox === 0) {
          newCart.splice(existingItemIndex, 1);
        } else {
          newCart[existingItemIndex] = updatedItem;
        }
      } else if (amount > 0) {
        newCart.push({
          id: produk.id,
          nama: produk.nama,
          hargaBox: produk.hargaPerBox || 0,
          hargaPcs: produk.hargaJualPerPcs || 0,
          qtyBox: amount,
          qtyPcs: 0,
        });
      }
      return newCart;
    });
  }, []);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setVisitDate(selectedDate);
    }
  };

  if (isLoading) {
    return <ThemedView style={styles.container}><ActivityIndicator size="large" color="#402566" /></ThemedView>;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: visit ? `Edit: ${visit.tokoNama}` : 'Edit Kunjungan',
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} disabled={isDeleting} style={{ marginRight: 10 }}>
              {isDeleting 
                ? <ActivityIndicator color="#ef4444" /> 
                : <Ionicons name="trash-outline" size={24} color="#ef4444" />}
            </TouchableOpacity>
          ),
        }}
      />
      <ThemedView style={styles.pageContainer}>
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.label}>Tanggal Kunjungan</ThemedText>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
            <ThemedText style={styles.selectButtonText}>
              {visitDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </ThemedText>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>

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
              <ThemedText style={styles.label}>Catatan</ThemedText>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={4}
                value={catatan}
                onChangeText={setCatatan}
                placeholder="Contoh: Stok menipis, minta dikirim besok."
                placeholderTextColor="#999"
              />
            </>
          ) : (
            <TouchableOpacity style={styles.addNoteButton} onPress={() => setIsCatatanVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#402566" />
              <ThemedText style={styles.addNoteButtonText}>Tambah Catatan</ThemedText>
            </TouchableOpacity>
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
                <TouchableOpacity 
                  key={produk.id} 
                  style={[styles.productCard, isInCart && styles.productCardInCart, !produk.available && styles.productCardDisabled]} 
                  onPress={() => produk.available && updateCart(produk, 1)} 
                  activeOpacity={0.8}
                  disabled={!produk.available}
                >
                  <Image source={{ uri: produk.foto || 'https://via.placeholder.com/100' }} style={styles.productImage} />
                  <View style={styles.productCardContent}>
                    <ThemedText style={styles.productName} numberOfLines={2}>{produk.nama}</ThemedText>
                  </View>
                  {isInCart && produk.available && (
                    <>
                      <TouchableOpacity 
                        style={styles.minusButton} 
                        onPress={(e) => {
                          e.stopPropagation(); // Mencegah trigger onPress dari parent
                          updateCart(produk, -1);
                        }}>
                        <Ionicons name="remove-circle" size={28} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                  {isInCart && produk.available && (
                    <View style={styles.inCartIndicator}>
                      <ThemedText style={styles.inCartIndicatorText}>{qtyBox}</ThemedText>
                    </View>
                  )}
                  {!produk.available && (
                    <View style={styles.statusOverlay}>
                      <ThemedText style={styles.statusText}>Habis</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <ThemedText style={styles.totalLabel}>Total ({totalBox} Box)</ThemedText>
          <ThemedText style={styles.totalValue}>Rp {totalHarga.toLocaleString('id-ID')}</ThemedText>
        </View>
        <TouchableOpacity style={[styles.saveButton, isSubmitting && styles.disabledButton]} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.saveButtonText}>Simpan Perubahan</ThemedText>}
        </TouchableOpacity>
      </View>
    </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageContainer: { flex: 1, backgroundColor: '#f8f6fc' },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  footer: { backgroundColor: '#FFFFFF', padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#EFEFEF', flexDirection: 'row', alignItems: 'center', gap: 16, },
  saveButton: { backgroundColor: '#402566', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#a78bfa' },
  label: { fontSize: 16, fontWeight: '600', color: '#402566', marginBottom: 8, marginTop: 16 },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#e0ddee', padding: 14, marginBottom: 16, },
  selectButtonText: { fontSize: 16, color: '#333', },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#e0ddee', padding: 12, minHeight: 100, textAlignVertical: 'top', fontSize: 14, marginBottom: 16, },
  addNoteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: '#f0eaff', marginTop: 16, },
  addNoteButtonText: { color: '#402566', fontWeight: '600', },
  productSearchInput: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#e0ddee', padding: 12, fontSize: 14, marginBottom: 12, },
  sortContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, },
  sortButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e0ddee', },
  activeSortButton: { backgroundColor: '#f0eaff', borderColor: '#402566', },
  sortButtonText: { fontSize: 12, fontWeight: '600', color: '#666', },
  activeSortButtonText: { color: '#402566', },
  productItem: {
    // Styles for 1-column list (now unused)
  },
  productGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
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
    backgroundColor: '#f0eaff',
  },
  productCardDisabled: {
    // Tidak perlu style khusus karena overlay sudah menanganinya
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
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    height: 30, // Ruang untuk 2 baris
  },
  productPrice: {
    // (not used in card view)
  },
  inCartIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#402566',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  minusButton: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    zIndex: 1,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10, // Sesuaikan dengan border radius kartu
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: { fontSize: 14, color: '#666' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#402566' },
  inCartIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});