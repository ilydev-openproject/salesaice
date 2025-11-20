import { StyleSheet, FlatList, ActivityIndicator, RefreshControl, View, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '../context/AppContext';
import React, { useState, useCallback, useMemo, } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TokoScreen() {
  const { loading, daftarToko, loadData } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#402566" />
        <ThemedText>Memuat data toko...</ThemedText>
      </ThemedView>
    );
  }

  const router = useRouter();

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const filteredToko = useMemo(() => {
    return daftarToko.filter(toko =>
      toko.nama.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [daftarToko, searchTerm]);

  return (
    <ThemedView style={styles.pageContainer}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Daftar Toko
        </ThemedText>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={32} color="#402566" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama toko..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>
      <FlatList
        data={filteredToko}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({ pathname: '/edit-toko', params: { id: item.id } })}
          >
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>{item.nama.charAt(0).toUpperCase()}</ThemedText>
            </View>
            <View style={styles.cardContent}>
              <ThemedText type="defaultSemiBold">{item.nama}</ThemedText>
              <ThemedText style={styles.subText}>Kode: {item.kode || '-'}</ThemedText>
              <ThemedText style={styles.subText}>
                Jadwal: {Array.isArray(item.jadwalKunjungan) && item.jadwalKunjungan.length > 0 ? item.jadwalKunjungan.join(', ') : 'Belum diatur'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>Toko tidak ditemukan.</ThemedText>}
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pageContainer: {
    flex: 1,
    backgroundColor: '#f8f6fc'
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
    color: '#402566'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0ddee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  list: { width: '100%' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0eaff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#402566',
    fontWeight: 'bold',
    fontSize: 18,
  },
  subText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  }
});