import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase'; // Path yang benar ke supabase client
import { Alert } from 'react-native';

// Definisikan tipe data untuk state kita
interface Target {
  TARGET_BOX_BULANAN: number;
  TARGET_PENDAPATAN_BULANAN: number;
}

interface AppContextType {
  loading: boolean;
  daftarToko: any[];
  orderList: any[];
  kunjunganList: any[];
  produkList: any[];
  targets: Target;
  setProdukList: React.Dispatch<React.SetStateAction<any[]>>;
  loadData: () => Promise<void>;
}

// Buat Context dengan nilai default
const AppContext = createContext<AppContextType | undefined>(undefined);

// Buat Provider Component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [daftarToko, setDaftarToko] = useState<any[]>([]);
  const [orderList, setOrderList] = useState<any[]>([]);
  const [kunjunganList, setKunjunganList] = useState<any[]>([]);
  const [produkList, setProdukList] = useState<any[]>([]);
  const [targets, setTargets] = useState<Target>({
    TARGET_BOX_BULANAN: 1000,
    TARGET_PENDAPATAN_BULANAN: 100000000,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Mengambil data dari Supabase
      const [tokoResponse, kunjunganResponse, produkResponse, orderResponse, configResponse] = await Promise.all([
        supabase.from('toko').select('*'),
        supabase.from('kunjungan').select('*').order('createdAt', { ascending: false }),
        supabase.from('produk').select('*').order('nama', { ascending: true }),
        supabase.from('orders').select('*').order('createdAt', { ascending: false }),
        supabase.from('config').select('*').eq('id', 'salesTarget').single(), // Menggunakan nama variabel yang sama dengan web
      ]);

      // Cek error untuk setiap response
      if (tokoResponse.error) throw tokoResponse.error;
      if (kunjunganResponse.error) throw kunjunganResponse.error;
      if (produkResponse.error) throw produkResponse.error;
      if (orderResponse.error) throw orderResponse.error;
      if (configResponse.error && configResponse.error.code !== 'PGRST116') {
        console.log('Data target belum ada, menggunakan nilai default.');
      } else if (configResponse.data) {
        setTargets(configResponse.data as Target);
      }

      // Data dari Supabase sudah dalam format array of objects, tidak perlu .docs.map(...)
      // Perhatikan juga format timestamp, Supabase menggunakan ISO string.
      // Firestore: { seconds: ..., nanoseconds: ... } -> Supabase: '2024-01-01T10:00:00Z'
      // Kode Anda yang menggunakan `new Date(item.createdAt.seconds * 1000)` perlu diubah menjadi `new Date(item.createdAt)`
      setDaftarToko(tokoResponse.data || []);
      setKunjunganList(kunjunganResponse.data || []);
      setProdukList(produkResponse.data || []);
      setOrderList(orderResponse.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Gagal memuat data. Cek koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const value = { loading, daftarToko, orderList, kunjunganList, produkList, targets, setProdukList, loadData };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Buat custom hook untuk menggunakan context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};