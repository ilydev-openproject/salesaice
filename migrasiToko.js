import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// Konfigurasi Firebase kamu
const firebaseConfig = {
    apiKey: 'AIzaSyB6trxr64644feNZphUB-YPcQo2LPmO7no',
    authDomain: 'aicesales-53099.firebaseapp.com',
    projectId: 'aicesales-53099',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrasiToko() {
    const tokoRef = collection(db, 'toko');
    const snapshot = await getDocs(tokoRef);

    for (const d of snapshot.docs) {
        const data = d.data();

        // hanya migrasi dokumen lama yang pakai ID angka manual
        if (/^\d+$/.test(d.id)) {
            console.log(`Migrasi: ${d.id} (${data.nama})`);

            const { id, createdAt, ...rest } = data;

            await addDoc(tokoRef, {
                ...rest,
                createdAt: serverTimestamp(),
                jadwalKunjungan: '-', // default biar tidak error
            });

            await deleteDoc(doc(db, 'toko', d.id));
        }
    }

    console.log('✅ Migrasi selesai!');
}

migrasiToko().catch(console.error);
