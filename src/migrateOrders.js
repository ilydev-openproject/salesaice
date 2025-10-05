// src/migrateOrders.js
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './lib/firebase.js'; // Pastikan path ini benar

/**
 * Skrip ini untuk memigrasikan data order yang ada di dalam koleksi 'kunjungan'
 * ke koleksi 'orders' yang baru.
 */
async function migrateVisitsToOrders() {
    console.log("Memulai migrasi data dari 'kunjungan' ke 'orders'...");

    const kunjunganRef = collection(db, 'kunjungan');
    const ordersRef = collection(db, 'orders');
    const batch = writeBatch(db);
    let migrationCount = 0;
    let skippedCount = 0;

    try {
        // 1. Ambil semua dokumen dari 'kunjungan' dan 'orders'
        const [kunjunganSnapshot, ordersSnapshot] = await Promise.all([getDocs(kunjunganRef), getDocs(ordersRef)]);

        // 2. Buat Set untuk menyimpan ID unik dari order yang sudah ada
        //    agar tidak terjadi duplikasi data.
        const existingOrders = new Set();
        ordersSnapshot.forEach((doc) => {
            const data = doc.data();
            // Kunci unik dibuat dari ID toko dan detik pembuatan
            if (data.createdAt?.seconds && data.tokoId) {
                const identifier = `${data.tokoId}_${data.createdAt.seconds}`;
                existingOrders.add(identifier);
            }
        });

        console.log(`Ditemukan ${kunjunganSnapshot.size} dokumen di 'kunjungan'.`);
        console.log(`Ditemukan ${existingOrders.size} dokumen yang sudah ada di 'orders'.`);

        // 3. Iterasi setiap dokumen 'kunjungan'
        kunjunganSnapshot.forEach((kunjunganDoc) => {
            const kunjungan = kunjunganDoc.data();

            // 4. Cek apakah kunjungan ini berisi data order
            const isOrder = kunjungan.items && Array.isArray(kunjungan.items) && kunjungan.items.length > 0 && kunjungan.total > 0;
            const hasTimestamp = kunjungan.createdAt?.seconds;

            if (isOrder && hasTimestamp) {
                // 5. Buat ID unik untuk pengecekan duplikasi
                const identifier = `${kunjungan.tokoId}_${kunjungan.createdAt.seconds}`;

                // 6. Jika belum ada di koleksi 'orders', tambahkan ke batch
                if (!existingOrders.has(identifier)) {
                    const newOrderRef = doc(collection(db, 'orders')); // Buat referensi dokumen baru di 'orders'
                    const newOrderData = {
                        tokoId: kunjungan.tokoId,
                        tokoNama: kunjungan.tokoNama,
                        kodeToko: kunjungan.kodeToko || '',
                        items: kunjungan.items,
                        catatan: kunjungan.catatan || '',
                        total: kunjungan.total,
                        createdAt: kunjungan.createdAt, // PENTING: Gunakan timestamp asli
                    };
                    batch.set(newOrderRef, newOrderData);
                    migrationCount++;
                } else {
                    skippedCount++;
                }
            }
        });

        // 7. Jika ada data untuk dimigrasi, jalankan batch write
        if (migrationCount > 0) {
            console.log(`Menyiapkan migrasi untuk ${migrationCount} order baru...`);
            await batch.commit();
            console.log(`✅ Migrasi berhasil! ${migrationCount} order telah disalin ke koleksi 'orders'.`);
        } else {
            console.log('Tidak ada data order baru untuk dimigrasi.');
        }

        if (skippedCount > 0) {
            console.log(`Dilewati ${skippedCount} order karena sudah ada.`);
        }
    } catch (error) {
        console.error('❌ Terjadi kesalahan saat migrasi:', error);
    } finally {
        console.log('Proses migrasi selesai.');
        // Anda bisa menambahkan process.exit() jika skrip tidak berhenti otomatis
        process.exit(0);
    }
}

// Jalankan fungsi migrasi
migrateVisitsToOrders();
