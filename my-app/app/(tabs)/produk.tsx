import { StyleSheet, FlatList, ActivityIndicator, RefreshControl, View, Image, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '../context/AppContext';
import React, { useState, useCallback, useMemo, } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProdukScreen() {
  const { loading, produkList, loadData } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false); 

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const router = useRouter();

  const sortedProdukList = useMemo(() => {
    return [...produkList].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [produkList]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#402566" />
        <ThemedText>Memuat katalog produk...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.pageContainer}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Katalog Produk
        </ThemedText>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={32} color="#402566" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sortedProdukList}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const keuntungan = (item.hargaJualPerPcs * item.isiPerBox) - item.hargaPerBox;
          return (
            <TouchableOpacity 
              style={[styles.itemContainer, !item.available && styles.itemDisabled]}
              onPress={() => router.push({ pathname: '/edit-produk', params: { id: item.id } })}
            >
                <Image
                  source={{ uri: item.foto || 'https://via.placeholder.com/80?text=Produk' }}
                  style={styles.itemImage} resizeMode="cover"
                />
                <View style={styles.itemDetails}>
                  <ThemedText style={styles.itemName} numberOfLines={2}>{item.nama}</ThemedText>
                  <ThemedText style={styles.subText}>Modal: Rp {Number(item.hargaPerBox).toLocaleString('id-ID')}</ThemedText>
                  <ThemedText style={styles.subText}>Jual: Rp {Number(item.hargaJualPerPcs).toLocaleString('id-ID')} / pcs</ThemedText>
                  <ThemedText style={[styles.profitText, keuntungan < 0 && styles.lossText]}>
                    Untung: Rp {Number(keuntungan).toLocaleString('id-ID')} / box
                  </ThemedText>
                </View>
                {!item.available && (
                  <View style={styles.statusOverlay}>
                    <ThemedText style={styles.statusText}>Habis</ThemedText>
                  </View>
                )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>Belum ada produk.</ThemedText>}
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#402566']}
          />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageContainer: { flex: 1, backgroundColor: '#f8f6fc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 48, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
  title: { color: '#402566' },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  itemContainer: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  itemDisabled: {
    // Opacity dipindahkan ke overlay agar gambar tidak ikut pudar
  },
  itemImage: {
    width: '100%',
    height: 100,
  },
  itemDetails: {
    padding: 10,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 12,
    height: 32, // Ruang untuk 2 baris
    color: '#333',
  },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },
  profitText: { fontSize: 12, color: '#16a34a', fontWeight: 'bold', marginTop: 4 },
  lossText: { color: '#ef4444' },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#666' },
});