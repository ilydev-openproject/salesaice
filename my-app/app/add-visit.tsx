import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppContext } from '@/app/context/AppContext'; // Corrected import path
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from './lib/supabase'; // Import Supabase client

export default function AddVisitScreen() {
  const { daftarToko, loadData } = useAppContext();
  const router = useRouter();
  const navigation = useNavigation();

  const [selectedTokoId, setSelectedTokoId] = useState<string | undefined>(daftarToko[0]?.id);
  const [status, setStatus] = useState<'Order' | 'Tidak Order'>('Tidak Order');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!selectedTokoId) {
      Alert.alert('Error', 'Silakan pilih toko terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedToko = daftarToko.find((t) => t.id === selectedTokoId);
      if (!selectedToko) {
        throw new Error('Toko tidak ditemukan');
      }

      const visitData = {
        tokoId: selectedTokoId,
        namaToko: selectedToko.nama,
        status: status,
        catatan: catatan,
        createdAt: new Date().toISOString(), // Use ISO string for Supabase
      };

      await supabase.from('kunjungan').insert([visitData]); // Use Supabase insert

      await loadData(); // Refresh data

      Alert.alert('Sukses', 'Kunjungan berhasil disimpan.', [
        {
          text: 'OK',
          onPress: () => {
            if (status === 'Order') {
              // Navigate to add order page, passing tokoId and namaToko
              // Note: Expo Router v3 has some nuances with modal navigation.
              // A robust way is to close the modal and then push the new route.
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
              router.push({
                pathname: '/add-order',
                params: { tokoId: selectedTokoId, namaToko: selectedToko.nama },
              });
            } else {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving visit:', error);
      Alert.alert('Error', 'Gagal menyimpan kunjungan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <ThemedText style={styles.label}>Pilih Toko</ThemedText>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedTokoId}
            onValueChange={(itemValue) => setSelectedTokoId(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            {daftarToko.map((toko) => (
              <Picker.Item key={toko.id} label={toko.nama} value={toko.id} />
            ))}
          </Picker>
        </View>

        <ThemedText style={styles.label}>Status Kunjungan</ThemedText>
        <View style={styles.statusContainer}>
          <TouchableOpacity
            style={[styles.statusButton, status === 'Tidak Order' && styles.activeStatusButton]}
            onPress={() => setStatus('Tidak Order')}
          >
            <Ionicons name="close-circle-outline" size={20} color={status === 'Tidak Order' ? '#ef4444' : '#666'} />
            <ThemedText style={[styles.statusButtonText, status === 'Tidak Order' && styles.activeStatusText]}>
              Tidak Order
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, status === 'Order' && styles.activeStatusButton]}
            onPress={() => setStatus('Order')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={status === 'Order' ? '#16a34a' : '#666'} />
            <ThemedText style={[styles.statusButtonText, status === 'Order' && styles.activeStatusText]}>
              Order
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.label}>Catatan (Opsional)</ThemedText>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          value={catatan}
          onChangeText={setCatatan}
          placeholder="Contoh: Stok menipis, minta dikirim besok."
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText style={styles.saveButtonText}>Simpan Kunjungan</ThemedText>
        )}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6fc',
  },
  form: {
    flex: 1,
    padding: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#402566',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0ddee',
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 120 : 50,
    width: '100%',
  },
  pickerItem: {
    height: 120, // For iOS item height
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e0ddee',
    gap: 8,
  },
  activeStatusButton: {
    borderColor: '#402566',
    backgroundColor: '#f0eaff',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeStatusText: {
    color: '#402566',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0ddee',
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#402566',
    padding: 16,
    margin: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});