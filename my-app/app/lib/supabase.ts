import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvibatglwaobuszsgwsv.supabase.co'; // Ganti dengan URL proyek Supabase Anda
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aWJhdGdsd2FvYnVzenNnd3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDc1NDMsImV4cCI6MjA3ODI4MzU0M30.S72M21z5J8enMLXBMO5kd81NNvcvEZJRt8tcPy5I14Y'; // Ganti dengan kunci anon Supabase Anda

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});