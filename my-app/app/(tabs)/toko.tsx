import { StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '@/app/context/AppContext';
import React, { useState, useCallback } from 'react';

export default function TokoScreen() {
  const { loading, daftarToko, loadData } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#402566" />
        <ThemedText>Memuat data toko...</ThemedText>
      </ThemedView>
    );
  }

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  return (
    <ThemedView style={styles.pageContainer}>
      <ThemedText type="title" style={styles.title}>
        Daftar Toko
      </ThemedText>
      <FlatList
        data={daftarToko}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ThemedView style={styles.itemContainer}>
            <ThemedText type="defaultSemiBold">{item.nama}</ThemedText>
            <ThemedText>{item.alamat}</ThemedText>
          </ThemedView>
        )}
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
  pageContainer: { flex: 1, paddingTop: 48, paddingHorizontal: 16 },
  title: { marginBottom: 16 },
  list: { width: '100%' },
  itemContainer: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#f8f6fc',
  },
});