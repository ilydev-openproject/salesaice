import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams } from 'expo-router';

export default function EditTokoScreen() {
  const { id } = useLocalSearchParams();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Edit Toko</ThemedText>
      <ThemedText style={styles.text}>Halaman ini akan digunakan untuk mengedit data toko.</ThemedText>
      <ThemedText>ID Toko: {id}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: { marginVertical: 12, textAlign: 'center' },
});