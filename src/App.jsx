// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import HomePage from './pages/HomePage';
import TokoPage from './pages/TokoPage';
import ProdukPage from './pages/ProdukPage';
import OrderPage from './pages/OrderPage';
import ProdukTerlarisPage from './pages/ProdukTerlarisPage';
import TargetPage from './pages/TargetPage';
import AnalisisTokoPage from './pages/AnalisisTokoPage';
import VisitPage from './pages/VisitPage'; //
import ProductVelocityPage from './pages/ProductVelocityPage'; // Impor halaman baru
import TokoGradePage from './pages/TokoGradePage'; // Impor halaman grade
import MysteryBoxPage from './pages/MysteryBoxPage'; // Impor halaman MysteryBoxPage
import VariantWajibPage from './pages/VariantWajibPage';
import VariantWajibSettingsPage from './pages/VariantWajibSettingsPage'; // Impor halaman pengaturan baru
import { Home, Package, Store, MapPin, ShoppingBag, CheckCircle2, AlertTriangle, X, Award, ClipboardCheck } from 'lucide-react';
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
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
    }, []);

    const showExitNotification = () => {
        // Menggunakan showNotification yang sudah ada dengan tipe custom
        setNotification({ show: true, message: 'Tekan sekali lagi untuk keluar', type: 'exit' });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 2000);
    };

    // === Load data dari Firebase ===
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [tokoResponse, kunjunganResponse, produkResponse, orderResponse, configResponse] = await Promise.all([supabase.from('toko').select('*'), supabase.from('kunjungan').select('*').order('createdAt', { ascending: false }), supabase.from('produk').select('*').order('nama', { ascending: true }), supabase.from('orders').select('*').order('createdAt', { ascending: false }), supabase.from('config').select('*').eq('id', 'salesTarget').single()]);

                if (tokoResponse.error) throw tokoResponse.error;
                if (kunjunganResponse.error) throw kunjunganResponse.error;
                if (produkResponse.error) throw produkResponse.error;
                if (orderResponse.error) throw orderResponse.error;
                // Abaikan error jika config tidak ada, karena kita punya default
                if (configResponse.error && configResponse.error.code !== 'PGRST116') {
                    throw configResponse.error;
                }

                if (configResponse.data) {
                    setTargets(configResponse.data);
                } else {
                    console.log('Dokumen target belum ada, menggunakan nilai default.');
                }

                setDaftarToko(tokoResponse.data || []);
                setKunjunganList(kunjunganResponse.data || []);
                setProdukList(produkResponse.data || []);
                setOrderList(orderResponse.data || []);
            } catch (error) {
                console.error('Error loading data:', error);
                showNotification(`Gagal memuat data: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [showNotification]);

    const handleSaveOrder = async (orderData, editingOrderId) => {
        try {
            if (editingOrderId) {
                // Update
                const { data, error } = await supabase.from('orders').update(orderData).eq('id', editingOrderId).select();
                if (error) throw error;
                setOrderList((prev) => prev.map((order) => (order.id === editingOrderId ? data[0] : order)));
                showNotification('Order berhasil diperbarui.', 'success');
            } else {
                // Create
                const { data, error } = await supabase.from('orders').insert([orderData]).select();
                if (error) throw error;
                setOrderList((prev) => [data[0], ...prev]);
                showNotification('Order berhasil disimpan.', 'success');
            }
        } catch (error) {
            console.error('Error saving order:', error);
            showNotification(`Gagal menyimpan order: ${error.message}`, 'error');
            throw error; // Re-throw to be caught by the calling component
        }
    };

    const handleToggleAvailable = async (produk) => {
        const newStatus = !produk.available;
        try {
            const { data, error } = await supabase.from('produk').update({ available: newStatus }).eq('id', produk.id).select().single();

            if (error) throw error;

            // Update state lokal dengan data yang baru dari database
            setProdukList((prevList) => prevList.map((p) => (p.id === produk.id ? data : p)));
            showNotification(`Status produk "${produk.nama}" berhasil diubah.`, 'success');
        } catch (error) {
            console.error('Error toggling product availability:', error);
            showNotification('Gagal mengubah status produk.', 'error');
        }
    };

    const handleSaveProduk = async (produkData, editingProdukId) => {
        try {
            let data, error;
            if (editingProdukId) {
                // Update
                ({ data, error } = await supabase.from('produk').update(produkData).eq('id', editingProdukId).select().single());
                if (error) throw error;
                setProdukList((prev) => prev.map((p) => (p.id === editingProdukId ? data : p)));
                showNotification('Produk berhasil diperbarui.', 'success');
            } else {
                // Create
                ({ data, error } = await supabase.from('produk').insert([produkData]).select().single());
                if (error) throw error;
                setProdukList((prev) => [...prev, data]);
                showNotification('Produk baru berhasil disimpan.', 'success');
            }
        } catch (error) {
            console.error('Error saving produk:', error);
            showNotification(`Gagal menyimpan produk: ${error.message}`, 'error');
            throw error; // Re-throw agar form tahu ada error
        }
    };

    const handleDeleteOrder = async (orderId) => {
        try {
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) throw error;
            setOrderList((prev) => prev.filter((order) => order.id !== orderId));
            showNotification('Order berhasil dihapus.', 'success');
        } catch (error) {
            console.error('Error deleting order:', error);
            showNotification(`Gagal menghapus order: ${error.message}`, 'error');
            throw error; // Re-throw to be caught by the calling component if needed
        }
    };

    const handleTargetsUpdate = (newTargets) => {
        setTargets((prev) => ({ ...prev, ...newTargets }));
    };

    // === Simpan activePage ke localStorage setiap kali berubah ===
    useEffect(() => {
        localStorage.setItem('activePage', activePage);
        // Setiap kali halaman berubah, reset konfirmasi keluar
        setExitConfirm(false);

        // Menambahkan state ke history browser untuk deteksi tombol kembali
        window.history.pushState({ page: activePage }, '');
    }, [activePage]);

    const handleSetModalOpen = useCallback((isOpen) => {
        setIsModalOpen(isOpen);
    }, []);

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
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 transition-all duration-300 animate-in slide-in-from-top-5 fade-in">
                    <div
                        className={`flex items-center gap-3 w-full p-4 rounded-2xl shadow-2xl border backdrop-blur-md relative overflow-hidden ${
                            notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 text-white' : notification.type === 'error' ? 'bg-gradient-to-r from-red-500 to-orange-600 border-red-400 text-white' : 'bg-gray-800 text-white border-gray-700' // Tipe 'exit' atau default
                        }`}
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
                        <div className="relative z-10 flex items-center gap-3 w-full">
                            {notification.type !== 'exit' && <div className="p-2 bg-white/20 rounded-xl">{notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>}
                            <p className="font-semibold text-sm flex-1">{notification.message}</p>
                            <button onClick={() => setNotification({ ...notification, show: false })} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 hover-scale focus-ring">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ flex: 1, paddingBottom: '70px' }}>
                {activePage === 'home' && <HomePage daftarToko={daftarToko} kunjunganList={kunjunganList} produkList={produkList} orderList={orderList} setActivePage={setActivePage} targets={targets} showNotification={showNotification} />}
                {activePage === 'toko' && <TokoPage setActivePage={setActivePage} orderList={orderList} kunjunganList={kunjunganList} onModalChange={handleSetModalOpen} showNotification={showNotification} />}
                {activePage === 'produk' && <ProdukPage produkList={produkList} onToggleAvailable={handleToggleAvailable} onSaveProduk={handleSaveProduk} setActivePage={setActivePage} onModalChange={handleSetModalOpen} showNotification={showNotification} />}
                {activePage === 'order' && <OrderPage setActivePage={setActivePage} orderList={orderList} setOrderList={setOrderList} tokoList={daftarToko} produkList={produkList} onSaveOrder={handleSaveOrder} onDeleteOrder={handleDeleteOrder} onModalChange={handleSetModalOpen} showNotification={showNotification} />}
                {activePage === 'produk-terlaris' && <ProdukTerlarisPage produkList={produkList} kunjunganList={kunjunganList} orderList={orderList} setActivePage={setActivePage} />}
                {activePage === 'target' && <TargetPage setActivePage={setActivePage} targets={targets} onTargetsUpdate={handleTargetsUpdate} showNotification={showNotification} />}
                {activePage === 'analisis-toko' && <AnalisisTokoPage tokoList={daftarToko} orderList={orderList} kunjunganList={kunjunganList} setActivePage={setActivePage} />}
                {activePage === 'visit' && <VisitPage setActivePage={setActivePage} orderList={orderList} kunjunganList={kunjunganList} setKunjunganList={setKunjunganList} tokoList={daftarToko} produkList={produkList} onModalChange={handleSetModalOpen} showNotification={showNotification} />}
                {activePage === 'product-velocity' && <ProductVelocityPage tokoList={daftarToko} orderList={orderList} produkList={produkList} setActivePage={setActivePage} />}
                {activePage === 'analisis-grade-toko' && <TokoGradePage setActivePage={setActivePage} tokoList={daftarToko} orderList={orderList} onModalChange={handleSetModalOpen} showNotification={showNotification} />}
                {activePage === 'mystery-box' && <MysteryBoxPage setActivePage={setActivePage} tokoList={daftarToko} orderList={orderList} showNotification={showNotification} />}
                {activePage === 'variant-wajib' && <VariantWajibPage setActivePage={setActivePage} produkList={produkList} orderList={orderList} />}
                {activePage === 'variant-wajib-settings' && <VariantWajibSettingsPage setActivePage={setActivePage} produkList={produkList} setProdukList={setProdukList} showNotification={showNotification} />}
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
                    zIndex: 300, // Memastikan navigasi berada di atas semua layer
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
