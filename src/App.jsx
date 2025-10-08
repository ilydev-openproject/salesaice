// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import HomePage from './pages/HomePage';
import TokoPage from './pages/TokoPage';
import ProdukPage from './pages/ProdukPage';
import OrderPage from './pages/OrderPage';
import ProdukTerlarisPage from './pages/ProdukTerlarisPage';
import TargetPage from './pages/TargetPage';
import AnalisisTokoPage from './pages/AnalisisTokoPage';
import RutePage from './pages/RutePage';
import VisitPage from './pages/VisitPage';
import TimestampCamera from './pages/TimestampCamera'; // Import TimestampCamera
import { Home, Package, Store, MapPin, ShoppingBag, Navigation } from 'lucide-react';
import Loader from './components/Loader';

export default function App() {
    // Baca halaman aktif dari localStorage saat pertama kali load, default ke 'home' jika tidak ada.
    const [activePage, setActivePage] = useState(() => localStorage.getItem('activePage') || 'home');
    const [daftarToko, setDaftarToko] = useState([]);
    const [orderList, setOrderList] = useState([]);
    const [kunjunganList, setKunjunganList] = useState([]);
    const [produkList, setProdukList] = useState([]); // New state for produkList
    const [loading, setLoading] = useState(true);
    const [targets, setTargets] = useState({
        TARGET_BOX_BULANAN: 1000, // Default value
        TARGET_PENDAPATAN_BULANAN: 100000000, // Default value
    });

    // State untuk mengelola back button & konfirmasi keluar
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [exitConfirm, setExitConfirm] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '' });

    // === Load data dari Firebase ===
    useEffect(() => {
        const loadData = async () => {
            try {
                const targetDocRef = doc(db, 'config', 'salesTarget');
                const [tokoSnapshot, kunjunganSnapshot, produkSnapshot, orderSnapshot, targetSnapshot] = await Promise.all([
                    getDocs(collection(db, 'toko')),
                    getDocs(query(collection(db, 'kunjungan'), orderBy('createdAt', 'desc'))),
                    getDocs(query(collection(db, 'produk'), orderBy('nama', 'asc'))),
                    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))), // Load orders
                    getDoc(targetDocRef),
                ]);

                if (targetSnapshot.exists()) {
                    setTargets(targetSnapshot.data());
                } else {
                    // Jika dokumen target belum ada, Anda bisa set default atau membiarkannya
                    console.log('Dokumen target belum ada, menggunakan nilai default.');
                }

                setDaftarToko(tokoSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                setKunjunganList(kunjunganSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                setProdukList(produkSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
                setOrderList(orderSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))); // Set orders
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Gagal memuat data. Cek koneksi internet.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleTargetsUpdate = (newTargets) => {
        setTargets((prev) => ({ ...prev, ...newTargets }));
    };

    const handleSetModalOpen = useCallback((isOpen) => {
        setIsModalOpen(isOpen);
    }, []);

    const showExitNotification = () => {
        setNotification({ show: true, message: 'Tekan sekali lagi untuk keluar' });
        setTimeout(() => {
            setNotification({ show: false, message: '' });
        }, 2000); // Sembunyikan setelah 2 detik
    };

    // === Simpan activePage ke localStorage setiap kali berubah ===
    useEffect(() => {
        localStorage.setItem('activePage', activePage);
        // Setiap kali halaman berubah, reset konfirmasi keluar
        setExitConfirm(false);

        // Menambahkan state ke history browser untuk deteksi tombol kembali
        window.history.pushState({ page: activePage }, '');
    }, [activePage]);

    // Efek untuk menangani tombol kembali (back button)
    useEffect(() => {
        const handlePopState = (event) => {
            // Mencegah perilaku default browser
            event.preventDefault();

            // Jika ada modal yang terbuka, event ini seharusnya tidak melakukan apa-apa
            // karena modal akan ditutup oleh komponennya sendiri.
            // Kita hanya perlu menangani kasus saat tidak ada modal.
            if (!isModalOpen) {
                if (activePage === 'home') {
                    if (exitConfirm) {
                        // Jika pengguna menekan kembali lagi, tutup aplikasi (di PWA/WebView)
                        navigator.app?.exitApp();
                    } else {
                        setExitConfirm(true);
                        showExitNotification();
                        setTimeout(() => setExitConfirm(false), 2000); // Reset setelah 2 detik
                    }
                } else {
                    // Kembali ke halaman home jika bukan di home
                    setActivePage('home');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activePage, exitConfirm, isModalOpen]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#f8f6fc]">
                <Loader text="Menyiapkan aplikasi..." />
            </div>
        );
    }

    return (
        <div
            // Menambahkan div notifikasi di level App
            className="relative"
            style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                backgroundColor: '#f8f6fc',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {notification.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4">
                    <div className="flex items-center justify-center gap-3 w-full p-3 rounded-xl shadow-2xl bg-gray-800 text-white">
                        <p className="font-semibold text-sm">{notification.message}</p>
                    </div>
                </div>
            )}
            <div style={{ flex: 1, paddingBottom: '70px' }}>
                {activePage === 'home' && <HomePage daftarToko={daftarToko} kunjunganList={kunjunganList} produkList={produkList} orderList={orderList} setActivePage={setActivePage} targets={targets} />}
                {activePage === 'toko' && <TokoPage setActivePage={setActivePage} orderList={orderList} kunjunganList={kunjunganList} onModalChange={handleSetModalOpen} />}
                {activePage === 'produk' && <ProdukPage setActivePage={setActivePage} onModalChange={handleSetModalOpen} />}
                {activePage === 'order' && <OrderPage setActivePage={setActivePage} onModalChange={handleSetModalOpen} />}
                {activePage === 'produk-terlaris' && <ProdukTerlarisPage produkList={produkList} kunjunganList={kunjunganList} orderList={orderList} setActivePage={setActivePage} />}
                {activePage === 'target' && <TargetPage setActivePage={setActivePage} targets={targets} onTargetsUpdate={handleTargetsUpdate} />}
                {activePage === 'analisis-toko' && <AnalisisTokoPage tokoList={daftarToko} orderList={orderList} kunjunganList={kunjunganList} setActivePage={setActivePage} />}
                {activePage === 'rute' && <RutePage tokoList={daftarToko} setActivePage={setActivePage} />}
                {activePage === 'visit' && <VisitPage setActivePage={setActivePage} orderList={orderList} onModalChange={handleSetModalOpen} />}
                {activePage === 'camera' && <TimestampCamera onClose={() => setActivePage('visit')} />}
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
                <button
                    onClick={() => setActivePage('order')}
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
                    <ShoppingBag size={18} color={activePage === 'order' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'order' ? '#402566' : '#999' }}>Order</span>
                </button>
                <button onClick={() => setActivePage('produk')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', outline: 'none', fontSize: '10px', cursor: 'pointer' }}>
                    <Package size={18} color={activePage === 'produk' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'produk' ? '#402566' : '#999' }}>Produk</span>
                </button>
                <button
                    onClick={() => setActivePage('rute')}
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
                    <Navigation size={18} color={activePage === 'rute' ? '#402566' : '#999'} />
                    <span style={{ marginTop: '2px', color: activePage === 'rute' ? '#402566' : '#999' }}>Rute</span>
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
