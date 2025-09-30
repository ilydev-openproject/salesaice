// src/App.jsx
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore'; // Removed unused 'where' import
import { db } from './lib/firebase';
import HomePage from './pages/HomePage';
import TokoPage from './pages/TokoPage';
import ProdukPage from './pages/ProdukPage';
import VisitPage from './pages/VisitPage';
import { Home, Package, Store, MapPin } from 'lucide-react';
import Loader from './components/Loader'; // Impor Loader

export default function App() {
    // Baca halaman aktif dari localStorage saat pertama kali load, default ke 'home' jika tidak ada.
    const [activePage, setActivePage] = useState(() => localStorage.getItem('activePage') || 'home');
    const [daftarToko, setDaftarToko] = useState([]);
    const [kunjunganList, setKunjunganList] = useState([]);
    const [produkList, setProdukList] = useState([]); // New state for produkList
    const [loading, setLoading] = useState(true);

    // === Load data dari Firebase ===
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load toko
                const tokoSnapshot = await getDocs(collection(db, 'toko'));
                const tokoList = tokoSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setDaftarToko(tokoList);

                // Load kunjungan
                const kunjunganSnapshot = await getDocs(query(collection(db, 'kunjungan'), orderBy('createdAt', 'desc')));
                const listKunjungan = kunjunganSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setKunjunganList(listKunjungan);

                // Load produk
                const produkSnapshot = await getDocs(query(collection(db, 'produk'), orderBy('nama', 'asc')));
                const listProduk = produkSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setProdukList(listProduk);
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Gagal memuat data. Cek koneksi internet.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // === Simpan activePage ke localStorage setiap kali berubah ===
    useEffect(() => {
        localStorage.setItem('activePage', activePage);
    }, [activePage]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#f8f6fc]">
                <Loader text="Menyiapkan aplikasi..." />
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
                {activePage === 'home' && <HomePage daftarToko={daftarToko} kunjunganList={kunjunganList} produkList={produkList} setActivePage={setActivePage} />}
                {activePage === 'toko' && <TokoPage setActivePage={setActivePage} />}
                {activePage === 'produk' && <ProdukPage setActivePage={setActivePage} />}
                {activePage === 'visit' && <VisitPage setActivePage={setActivePage} />}
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
                    padding: '8px 0',
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
                        fontSize: '10px',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <Home size={18} color={activePage === 'home' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'home' ? '#402566' : '#999' }}>Beranda</span>
                </button>
                <button
                    onClick={() => setActivePage('visit')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        fontSize: '10px',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <MapPin size={18} color={activePage === 'visit' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'visit' ? '#402566' : '#999' }}>Kunjungan</span>
                </button>
                <button onClick={() => setActivePage('produk')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', outline: 'none', fontSize: '10px', cursor: 'pointer' }}>
                    <Package size={18} color={activePage === 'produk' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'produk' ? '#402566' : '#999' }}>Produk</span>
                </button>
                <button
                    onClick={() => setActivePage('toko')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        fontSize: '10px',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <Store size={18} color={activePage === 'toko' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'toko' ? '#402566' : '#999' }}>Toko</span>
                </button>
            </div>
        </div>
    );
}
