// src/cleanupVisits.js
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './lib/firebase.js';

/**
 * PERINGATAN: Skrip ini bersifat destruktif.
 * Ini akan mengubah data di koleksi 'kunjungan' Anda dengan menghapus
 * detail item pesanan (mengosongkan array 'items' dan mengatur 'total' menjadi 0).
 *
 * PASTIKAN ANDA TELAH MEM-BACKUP DATA ANDA SEBELUM MENJALANKAN SKRIP INI.
 */
async function cleanupVisits() {
    console.log("Memulai pembersihan data order lama dari koleksi 'kunjungan'...");
    console.log('PERINGATAN: Proses ini akan mengubah data. Harap tunggu 5 detik jika Anda ingin membatalkan (Ctrl+C)...');

    // Beri waktu 5 detik untuk membatalkan
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const kunjunganRef = collection(db, 'kunjungan');
    const batch = writeBatch(db);
    let cleanupCount = 0;

    try {
        const kunjunganSnapshot = await getDocs(kunjunganRef);
        console.log(`Ditemukan ${kunjunganSnapshot.size} dokumen di 'kunjungan' untuk diperiksa.`);

        kunjunganSnapshot.forEach((doc) => {
            const kunjungan = doc.data();

            // Cek apakah kunjungan ini memiliki data order yang perlu dibersihkan
            const needsCleanup = kunjungan.items && Array.isArray(kunjungan.items) && kunjungan.items.length > 0;

            if (needsCleanup) {
                // Tambahkan operasi update ke batch
                // Ini akan mengosongkan daftar item dan mereset total harga
                batch.update(doc.ref, {
                    items: [],
                    total: 0,
                });
                cleanupCount++;
            }
        });

        if (cleanupCount > 0) {
            console.log(`Menyiapkan pembersihan untuk ${cleanupCount} dokumen kunjungan...`);
            await batch.commit();
            console.log(`✅ Pembersihan berhasil! ${cleanupCount} dokumen telah diperbarui.`);
        } else {
            console.log('Tidak ada data kunjungan yang perlu dibersihkan.');
        }
    } catch (error) {
        console.error('❌ Terjadi kesalahan saat pembersihan:', error);
    } finally {
        console.log('Proses pembersihan selesai.');
        process.exit(0);
    }
}

// Jalankan fungsi pembersihan
cleanupVisits();
