// /Users/ilyasmac/Documents/Next-Project/my-sales-app/exportData.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

// Konfigurasi Firebase Anda (sama seperti di migrasiToko.js)
const firebaseConfig = {
    apiKey: 'AIzaSyB6trxr64644feNZphUB-YPcQo2LPmO7no',
    authDomain: 'aicesales-53099.firebaseapp.com',
    projectId: 'aicesales-53099',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Fungsi generik untuk mengekspor semua dokumen dari sebuah koleksi.
 * @param {string} collectionName Nama koleksi di Firestore.
 */
async function exportCollection(collectionName) {
    const snapshot = await getDocs(collection(db, collectionName));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // PENTING: Konversi objek Timestamp Firestore menjadi string ISO 8601
    // yang bisa dibaca oleh Supabase (PostgreSQL).
    const cleanedData = data.map((item) => {
        const newItem = { ...item };
        for (const key in newItem) {
            if (newItem[key] && typeof newItem[key].toDate === 'function') {
                newItem[key] = newItem[key].toDate().toISOString();
            }
        }
        return newItem;
    });

    if (cleanedData.length === 0) {
        console.log(`🟡 Koleksi '${collectionName}' kosong, tidak ada file yang dibuat.`);
        return;
    }

    // --- PERUBAHAN DARI JSON KE CSV ---
    const headers = Object.keys(cleanedData[0]);
    const csvRows = [headers.join(',')]; // Header CSV

    for (const row of cleanedData) {
        const values = headers.map((header) => {
            let value = row[header];
            // Handle array/object (seperti 'items' di orders) dengan mengubahnya menjadi string JSON
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }
            // Escape koma dan tanda kutip di dalam nilai
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        });
        csvRows.push(values.join(','));
    }

    fs.writeFileSync(`./${collectionName}.csv`, csvRows.join('\n'));
    console.log(`✅ Berhasil mengekspor ${cleanedData.length} dokumen dari koleksi '${collectionName}' ke ${collectionName}.csv`);
}

async function exportAll() {
    try {
        console.log('Memulai proses ekspor data dari Firestore...');
        await exportCollection('toko');
        await exportCollection('produk');
        await exportCollection('kunjungan');
        await exportCollection('orders');
        await exportCollection('config');
        // Tambahkan koleksi lain jika ada
        console.log('\n🎉 Semua data berhasil diekspor ke file CSV!');
    } catch (error) {
        console.error('Gagal mengekspor data:', error);
    }
}

exportAll();
