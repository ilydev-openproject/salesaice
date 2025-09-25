// src/App.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './lib/firebase';
import HomePage from './pages/HomePage';
import TokoPage from './pages/TokoPage';
import ProdukPage from './pages/ProdukPage';
import VisitPage from './pages/VisitPage';
import { Home, Package, Store, MapPin } from 'lucide-react';

export default function App() {
    const [activePage, setActivePage] = useState('home');
    const [daftarToko, setDaftarToko] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // === Load data dari Firebase ===
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load toko
                const tokoSnapshot = await getDocs(collection(db, 'toko'));
                const tokoList = tokoSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setDaftarToko(tokoList);

                // Load sales
                const salesSnapshot = await getDocs(collection(db, 'sales'));
                const salesList = salesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setSales(salesList);
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Gagal memuat data. Cek koneksi internet.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // === Tambah Toko ===
    const tambahToko = async (tokoBaru) => {
        try {
            await addDoc(collection(db, 'toko'), tokoBaru);
            // Reload data
            const snapshot = await getDocs(collection(db, 'toko'));
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setDaftarToko(list);
        } catch (error) {
            console.error('Error tambah toko:', error);
            alert('Gagal menyimpan toko.');
        }
    };

    // === Hapus Toko ===
    const hapusToko = async (id) => {
        if (!confirm('Hapus toko ini?')) return;
        try {
            await deleteDoc(doc(db, 'toko', id));
            setDaftarToko(daftarToko.filter((t) => t.id !== id));
        } catch (error) {
            console.error('Error hapus toko:', error);
            alert('Gagal menghapus toko.');
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    height: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f8f6fc',
                }}
            >
                <div style={{ color: '#402566', fontSize: '18px' }}>Loading...</div>
            </div>
        );
    }

    return (
        <div
            style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                backgroundColor: '#f8f6fc',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ flex: 1, paddingBottom: '70px' }}>
                {activePage === 'home' && <HomePage daftarToko={daftarToko} sales={sales} />}
                {activePage === 'toko' && <TokoPage daftarToko={daftarToko} onTambahToko={tambahToko} onHapusToko={hapusToko} />}
                {activePage === 'produk' && <ProdukPage />}
                {activePage === 'visit' && <VisitPage />}
            </div>

            {/* Bottom Navigation */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '12px 0',
                    borderTop: '1px solid #eee',
                    maxWidth: '500px',
                    margin: '0 auto',
                    width: '100%',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                }}
            >
                <button
                    onClick={() => setActivePage('home')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <Home size={20} color={activePage === 'home' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '4px', color: activePage === 'home' ? '#402566' : '#999' }}>Beranda</span>
                </button>
                <button
                    onClick={() => setActivePage('visit')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    <MapPin size={20} color={activePage === 'visit' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '4px', color: activePage === 'visit' ? '#402566' : '#999' }}>Kunjungan</span>
                </button>
                <button onClick={() => setActivePage('produk')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', outline: 'none', fontSize: '12px', cursor: 'pointer' }}>
                    <Package size={20} color={activePage === 'produk' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '4px', color: activePage === 'produk' ? '#402566' : '#999' }}>Produk</span>
                </button>
                <button
                    onClick={() => setActivePage('toko')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    <Store size={20} color={activePage === 'toko' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '4px', color: activePage === 'toko' ? '#402566' : '#999' }}>Toko</span>
                </button>
            </div>
        </div>
    );
}
