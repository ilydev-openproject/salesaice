import { StyleSheet, FlatList, ActivityIndicator, RefreshControl, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '../context/AppContext';
import React, { useState, useCallback, useMemo, } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function OrderScreen() {
  const { loading, orderList, loadData } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false); 

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#402566" />
        <ThemedText>Memuat data order...</ThemedText>
      </ThemedView>
    );
  }

  const router = useRouter();

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const sortedOrderList = useMemo(() => {
    return [...orderList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orderList]);

  return (
    <ThemedView style={styles.pageContainer}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Daftar Order
        </ThemedText>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={32} color="#402566" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sortedOrderList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const totalBoxes = item.items?.reduce((sum, i) => sum + i.qtyBox, 0) || 0;
          return (
            <TouchableOpacity 
              style={styles.itemContainer}
              onPress={() => router.push({ pathname: '/edit-order', params: { id: item.id } })}
            >
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>{(item.tokoNama || '?').charAt(0).toUpperCase()}</ThemedText>
              </View>
              <View style={styles.itemDetails}>
                <View style={styles.itemHeader}>
                  <ThemedText type="defaultSemiBold">{item.tokoNama}</ThemedText>
                  <ThemedText style={styles.totalText}>Rp {Number(item.total || 0).toLocaleString('id-ID')}</ThemedText>
                </View>
                <View style={styles.itemFooter}>
                  <ThemedText style={styles.subText}>
                    {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </ThemedText>
                  <ThemedText style={styles.subText}>{totalBoxes} box</ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>Belum ada order.</ThemedText>}
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
  list: { width: '100%' },
  itemContainer: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0eaff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#402566',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemHeader: {
    marginBottom: 8,
  },
  totalText: {
    fontWeight: 'bold',
    color: '#16a34a',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  }
});