// src/pages/VisitPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay, isSameMonth, startOfMonth, endOfMonth } from 'date-fns'; // Added isSameDay, isSameMonth, startOfMonth, endOfMonth
import { toPng } from 'html-to-image';
import { db } from '../lib/firebase'; //
import { Store, Package, Plus, Minus, CheckCircle2, XCircle, ChevronDown, MapPin, ArrowLeft, ShoppingCart, Calendar, Pencil, Trash2, Wallet, Search, CalendarRange, Download, MoreVertical, Eye, X, MessageSquare, AlertTriangle } from 'lucide-react';
import Loader from '../components/Loader';
import VisitReceipt from '../components/VisitReceipt';

export default function VisitPage({ setActivePage, orderList = [] }) {
    // State untuk daftar kunjungan
    const [kunjunganList, setKunjunganList] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk form
    const [showForm, setShowForm] = useState(false);
    const [tokoList, setTokoList] = useState([]);
    const [produkList, setProdukList] = useState([]);
    const [selectedTokoId, setSelectedTokoId] = useState('');
    const [catatan, setCatatan] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingVisitId, setEditingVisitId] = useState(null);
    const [cart, setCart] = useState({}); // { productId: jumlahBox }
    const [isTokoDropdownOpen, setIsTokoDropdownOpen] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false); // Untuk load data form sekali saja
    const [tokoSearchTerm, setTokoSearchTerm] = useState(''); // State untuk pencarian di dropdown toko
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState(''); // State untuk filter produk di form
    // State untuk filter tanggal
    const [filterType, setFilterType] = useState('today'); // 'today', 'custom'
    const [customDate, setCustomDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    // State dan Ref untuk ekspor resi
    const [receiptKunjungan, setReceiptKunjungan] = useState(null);
    const receiptRef = useRef(null);
    // State untuk modal preview resi
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [previewImageFilename, setPreviewImageFilename] = useState('');
    const [receiptLoading, setReceiptLoading] = useState(false); // State for receipt generation loading

    // State untuk notifikasi modern
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // State untuk modal konfirmasi hapus
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000); // Sembunyikan setelah 3 detik
    };

    const [openMenuId, setOpenMenuId] = useState(null); // State untuk menu titik tiga

    // Load daftar kunjungan
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([fetchKunjungan(), loadTokoData()]);
            setLoading(false);
        };
        loadInitialData();
    }, []);

    const loadFormData = async () => {
        if (isDataLoaded) return; // Jangan load ulang jika sudah ada
        try {
            // Ini hanya akan memuat data produk sekarang
            const [tokoSnap, produkSnap] = await Promise.all([getDocs(collection(db, 'toko')), getDocs(collection(db, 'produk'))]);
            const tokoData = tokoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const produkData = produkSnap.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                // Urutkan: produk tersedia di atas, lalu berdasarkan nama
                .sort((a, b) => (a.available === b.available ? a.nama.localeCompare(b.nama) : a.available ? -1 : 1));

            setTokoList(tokoData);
            setProdukList(produkData);
            setIsDataLoaded(true);
        } catch (error) {
            console.error('Error load data:', error);
            showNotification('Gagal memuat data toko/produk.', 'error');
        }
    };

    // Load data untuk form (toko & produk) saat form dibuka
    useEffect(() => {
        if (showForm && !isDataLoaded) {
            loadFormData();
        }
    }, [showForm, isDataLoaded]);

    const fetchKunjungan = async () => {
        try {
            const q = query(collection(db, 'kunjungan'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setKunjunganList(list);
        } catch (error) {
            console.error('Error fetching kunjungan:', error);
        }
    };

    const loadTokoData = async () => {
        try {
            const tokoSnap = await getDocs(collection(db, 'toko'));
            const tokoData = tokoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTokoList(tokoData);
        } catch (error) {
            console.error('Error loading toko data:', error);
        }
    };

    const handleSelectToko = (tokoId) => {
        setSelectedTokoId(tokoId);
        setIsTokoDropdownOpen(false);
        setTokoSearchTerm(''); // Reset pencarian saat toko dipilih
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => {
            const current = prev[productId] || 0;
            const newQty = Math.max(0, current + delta);
            const newCart = { ...prev, [productId]: newQty };
            if (newQty === 0) delete newCart[productId]; // Hapus dari cart jika qty 0
            return newCart;
        });
    };

    const getTotalHarga = (produk) => {
        const qty = cart[produk.id] || 0;
        return qty * (produk.hargaPerBox || 0);
    };

    const getGrandTotal = () => {
        return produkList.reduce((sum, produk) => {
            return sum + getTotalHarga(produk);
        }, 0);
    };

    const getTotalBoxes = () => {
        return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTokoId) {
            showNotification('Pilih toko terlebih dahulu!', 'error');
            return;
        }

        const items = produkList
            .filter((produk) => cart[produk.id] > 0)
            .map((produk) => ({
                productId: produk.id,
                nama: produk.nama,
                hargaPerBox: produk.hargaPerBox,
                isiPerBox: produk.isiPerBox,
                qtyBox: cart[produk.id],
                total: getTotalHarga(produk),
            }));

        const selectedToko = tokoList.find((t) => t.id === selectedTokoId);

        const kunjunganData = {
            tokoId: selectedTokoId,
            tokoNama: selectedToko?.nama || 'Toko Tidak Diketahui',
            kodeToko: selectedToko?.kode || '',
            items,
            catatan: catatan.trim(),
            total: getGrandTotal(),
            // createdAt tidak diupdate saat edit
        };

        const hasOrder = items.length > 0;

        setSubmitting(true);
        try {
            if (editingVisitId) {
                // Update
                const visitRef = doc(db, 'kunjungan', editingVisitId);
                // Saat edit, kita hanya update data kunjungan.
                // Asumsi: Order yang terkait diedit terpisah di halaman Order.
                // Untuk menyederhanakan, kita hanya update catatan dan data non-item.
                await updateDoc(visitRef, {
                    tokoId: kunjunganData.tokoId,
                    tokoNama: kunjunganData.tokoNama,
                    kodeToko: kunjunganData.kodeToko,
                    catatan: kunjunganData.catatan,
                    // items dan total tidak diubah dari sini untuk menghindari duplikasi/konflik
                });
                showNotification('Kunjungan berhasil diperbarui.');
            } else {
                // Create Kunjungan (tanpa item dan total)
                await addDoc(collection(db, 'kunjungan'), {
                    tokoId: kunjunganData.tokoId,
                    tokoNama: kunjunganData.tokoNama,
                    kodeToko: kunjunganData.kodeToko,
                    catatan: kunjunganData.catatan,
                    items: [], // Selalu kosong di kunjungan
                    total: 0, // Selalu nol di kunjungan
                    createdAt: serverTimestamp(),
                });
                showNotification('Kunjungan berhasil dicatat.');

                // Jika ada order, buat entri terpisah di koleksi 'orders'
                if (hasOrder) {
                    await addDoc(collection(db, 'orders'), {
                        tokoId: kunjunganData.tokoId,
                        tokoNama: kunjunganData.tokoNama,
                        kodeToko: kunjunganData.kodeToko,
                        items: kunjunganData.items,
                        catatan: `Order dari kunjungan: ${kunjunganData.catatan}`,
                        total: kunjunganData.total,
                        createdAt: serverTimestamp(),
                    });
                    showNotification('Order dari kunjungan berhasil disimpan.', 'success');
                }
            }

            // Reset
            resetForm();
            fetchKunjungan(); // Muat ulang daftar kunjungan
        } catch (error) {
            console.error('Error saving visit:', error);
            showNotification('Gagal menyimpan kunjungan.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const openForm = async () => {
        // Pastikan data form sudah ada sebelum menampilkan
        await loadFormData();
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingVisitId(null);
        setCart({});
        setCatatan('');
        setSelectedTokoId(tokoList.length > 0 ? tokoList[0].id : '');
        setTokoSearchTerm('');
        setProductSearchTerm(''); // Reset filter produk saat form ditutup
    };

    const handleEdit = async (kunjungan) => {
        // Pastikan data form (terutama tokoList) sudah dimuat sebelum mengisi state
        await loadFormData();
        setEditingVisitId(kunjungan.id);
        setSelectedTokoId(kunjungan.tokoId);
        setCatatan(kunjungan.catatan || '');

        // Buat ulang cart dari data kunjungan
        const initialCart = kunjungan.items.reduce((acc, item) => {
            acc[item.productId] = item.qtyBox;
            return acc;
        }, {});
        setCart(initialCart);

        setShowForm(true);
    };

    const openDeleteConfirm = (kunjungan) => {
        setItemToDelete(kunjungan);
        setShowDeleteConfirm(true);
        closeMenu();
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await deleteDoc(doc(db, 'kunjungan', itemToDelete.id));
            showNotification('Kunjungan berhasil dihapus.');
            fetchKunjungan(); // Muat ulang daftar
            setShowDeleteConfirm(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting visit:', error); //
            showNotification('Gagal menghapus kunjungan.', 'error');
        }
    };

    const filteredKunjungan = kunjunganList
        .filter((kunjungan) => {
            if (!kunjungan.createdAt?.seconds) return false;
            const visitDate = new Date(kunjungan.createdAt.seconds * 1000);

            if (filterType === 'today') {
                const today = new Date();
                return visitDate.getDate() === today.getDate() && visitDate.getMonth() === today.getMonth() && visitDate.getFullYear() === today.getFullYear();
            }
            if (filterType === 'custom') {
                return visitDate.getDate() === customDate.getDate() && visitDate.getMonth() === customDate.getMonth() && visitDate.getFullYear() === customDate.getFullYear();
            }
            return true; // Should not happen if filterType is always 'today' or 'custom'
        })
        .filter((kunjungan) => kunjungan.tokoNama.toLowerCase().includes(searchTerm.toLowerCase()) || (kunjungan.kodeToko && kunjungan.kodeToko.toLowerCase().includes(searchTerm.toLowerCase())));

    const handleDateSelect = (date) => {
        if (date) {
            setCustomDate(date);
            setFilterType('custom');
        }
        setShowCalendar(false);
    };

    const handlePreview = useCallback(
        async (kunjungan) => {
            // Cari order yang terkait dengan kunjungan ini
            const visitTimestamp = kunjungan.createdAt?.seconds;
            const relatedOrder = orderList.find((order) => order.tokoId === kunjungan.tokoId && visitTimestamp && Math.abs(order.createdAt?.seconds - visitTimestamp) < 5);

            // Gabungkan data kunjungan dengan data order untuk resi
            const receiptData = {
                ...kunjungan, // Ambil id, tokoNama, kodeToko, createdAt dari kunjungan
                items: relatedOrder ? relatedOrder.items : [], // Ambil items dari order
                total: relatedOrder ? relatedOrder.total : 0, // Ambil total dari order
            };

            setReceiptKunjungan(receiptData);

            // Lanjutkan proses seperti biasa
            setReceiptLoading(true); // Start loading
            setShowReceiptPreview(true); // Show modal with loader

            // Tunggu DOM update dan render komponen resi
            setTimeout(async () => {
                const node = document.getElementById(`receipt-${kunjungan.id}`);
                if (!node) {
                    showNotification('Gagal menemukan elemen resi.', 'error');
                    setReceiptLoading(false);
                    setReceiptKunjungan(null);
                    return;
                }

                try {
                    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
                    setPreviewImageUrl(dataUrl);
                    setPreviewImageFilename(`resi-${kunjungan.tokoNama.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.png`);
                } catch (err) {
                    console.error('oops, something went wrong!', err);
                    showNotification('Gagal membuat pratinjau resi.', 'error');
                } finally {
                    setReceiptLoading(false); // Stop loading
                    // Keep receiptKunjungan to show the component until modal is closed
                }
            }, 100); // Timeout untuk memastikan DOM siap
        },
        [orderList],
    ); // Tambahkan orderList sebagai dependensi

    const closePreview = () => {
        setShowReceiptPreview(false);
        setPreviewImageUrl('');
        setReceiptKunjungan(null); // Hide receipt component when modal closes
    };

    const handleMenuClick = (e, visitId) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === visitId ? null : visitId);
    };

    const closeMenu = () => setOpenMenuId(null);

    const handleDownloadFromPreview = () => {
        const link = document.createElement('a');
        link.download = previewImageFilename;
        link.href = previewImageUrl;
        link.click();
    };

    const handleWhatsAppShare = (kunjungan) => {
        console.log('--- handleWhatsAppShare called ---');
        console.log('Kunjungan being shared:', kunjungan);

        const toko = tokoList.find((t) => t.id === kunjungan.tokoId);
        if (!toko) {
            showNotification('Data toko tidak ditemukan untuk membuat laporan.', 'error');
            console.error('Toko not found for tokoId:', kunjungan.tokoId);
            return;
        }
        console.log('Found Toko:', toko);

        const visitDate = new Date(kunjungan.createdAt.seconds * 1000);
        console.log('Visit Date (from kunjungan.createdAt):', visitDate);

        // 1. No Urut Kunjungan Hari Ini
        const visitsToday = kunjunganList
            .filter((v) => {
                if (!v.createdAt?.seconds || typeof v.createdAt.seconds !== 'number') {
                    console.warn('Skipping visit due to invalid createdAt for daily stats:', v.id, v.createdAt);
                    return false;
                }
                const d = new Date(v.createdAt.seconds * 1000);
                return isSameDay(d, visitDate); // Use isSameDay from date-fns
            })
            .sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
        const visitOrderToday = visitsToday.findIndex((v) => v.id === kunjungan.id) + 1;
        console.log(
            'Visits Today (for ordering):',
            visitsToday.map((v) => ({ id: v.id, tokoNama: v.tokoNama, createdAt: new Date(v.createdAt.seconds * 1000) })),
        );
        console.log('Visit Order Today:', visitOrderToday);

        // 2. Statistik Bulan Ini
        const currentMonthStart = startOfMonth(visitDate);
        const currentMonthEnd = endOfMonth(visitDate);
        console.log('Start of Month:', currentMonthStart);
        console.log('End of Month:', currentMonthEnd);

        const visitsThisMonthForToko = kunjunganList.filter((v) => {
            if (!v.createdAt?.seconds || typeof v.createdAt.seconds !== 'number') {
                console.warn('Skipping visit for month stats due to invalid createdAt:', v.id, v.createdAt);
                return false;
            }
            const d = new Date(v.createdAt.seconds * 1000);
            const isSameToko = v.tokoId === kunjungan.tokoId;
            const isInMonth = isSameMonth(d, visitDate); // Use isSameMonth from date-fns
            // console.log(`Visit ${v.id} (${v.tokoNama}): tokoId match=${isSameToko}, in month=${isInMonth}, date=${d}`);
            return isSameToko && isInMonth;
        });
        const totalVisitsThisMonth = visitsThisMonthForToko.length;
        const totalBoxesThisMonth = visitsThisMonthForToko.reduce((sum, v) => sum + (v.items?.reduce((itemSum, item) => itemSum + item.qtyBox, 0) || 0), 0);
        console.log(
            'Visits This Month For Toko:',
            visitsThisMonthForToko.map((v) => ({ id: v.id, tokoNama: v.tokoNama, createdAt: new Date(v.createdAt.seconds * 1000), total: v.total })),
        );
        console.log('Total Visits This Month (for this toko):', totalVisitsThisMonth);
        console.log('Total Boxes This Month (for this toko):', totalBoxesThisMonth);

        const totalOrderBox = kunjungan.items.reduce((sum, item) => sum + item.qtyBox, 0);
        console.log('Total Order Box (current visit):', totalOrderBox);

        const padRight = (str, len) => str.padEnd(len, ' ');

        const message = `LAPORAN KUNJUNGAN 

${padRight('No Urut', 15)}: ${visitOrderToday}
${padRight('Nama Toko', 15)}: ${kunjungan.tokoNama}
${padRight('Kode Toko', 15)}: ${kunjungan.kodeToko || '-'}

${padRight('Kunjungan ke', 15)}: ${totalVisitsThisMonth} (bln ini)
${padRight('Total order', 15)}: ${totalOrderBox} box
${padRight('Total bln ini', 15)}: ${totalBoxesThisMonth} box

${padRight('No HP', 15)}: ${toko.nomorWa || '-'}

`
            .trim() // Trim leading/trailing whitespace from the whole string
            .split('\n') // Split into lines
            .map((line) => line.trimEnd()) // Trim trailing spaces from each line
            .join('\n');

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        closeMenu();
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <Loader text="Memuat data kunjungan..." />
            </div>
        );
    }

    return (
        <>
            {/* Komponen Notifikasi Modern (Hanya render jika 'show' true) */}
            {notification.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 transition-all duration-300 animate-in slide-in-from-top-5 fade-in">
                    <div className={`flex items-center gap-3 w-full p-3 rounded-xl shadow-2xl border ${notification.type === 'success' ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`}>
                        {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <p className="font-semibold text-sm flex-1">{notification.message}</p>
                        <button onClick={() => setNotification({ ...notification, show: false })} className="opacity-70 hover:opacity-100">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Halaman Utama: Daftar Kunjungan */}
            <div className=" pb-20 max-w-md mx-auto" onClick={closeMenu}>
                <div className="p-5 pb-20 max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <MapPin className="text-purple-600" />
                            Kunjungan
                        </h2>
                        <button onClick={openForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md hover:shadow-lg">
                            <Plus size={18} /> Tambah
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>

                    {/* Filter Tanggal */}
                    <div className="relative mb-6 flex items-center gap-2">
                        <button onClick={() => setFilterType('today')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filterType === 'today' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                            <Calendar size={16} />
                            Hari Ini
                        </button>
                        <button onClick={() => setShowCalendar(!showCalendar)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filterType === 'custom' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                            <CalendarRange size={16} />
                            {filterType === 'custom' ? format(customDate, 'd MMM yyyy') : 'Pilih Tanggal'}
                        </button>

                        {showCalendar && (
                            <div className="absolute top-full mt-2 z-20 bg-white rounded-2xl shadow-2xl border p-2" onMouseLeave={() => setShowCalendar(false)}>
                                <DayPicker
                                    mode="single"
                                    selected={customDate}
                                    onSelect={handleDateSelect}
                                    captionLayout="dropdown-buttons"
                                    fromYear={2020}
                                    toYear={new Date().getFullYear() + 1}
                                    classNames={{
                                        caption_label: 'text-lg font-bold',
                                        head_cell: 'font-semibold',
                                        day_selected: 'bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:bg-purple-700',
                                        day_today: 'font-bold text-purple-600',
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {filteredKunjungan.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                            <ShoppingCart size={40} className="mx-auto text-gray-400 mb-2" />
                            {searchTerm ? 'Kunjungan tidak ditemukan.' : 'Belum ada kunjungan yang tercatat.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredKunjungan.map((kunjungan) => {
                                // Cari order yang cocok berdasarkan tokoId dan waktu pembuatan yang sangat berdekatan
                                const visitTimestamp = kunjungan.createdAt?.seconds;
                                const relatedOrder = orderList.find(
                                    (order) => order.tokoId === kunjungan.tokoId && visitTimestamp && Math.abs(order.createdAt?.seconds - visitTimestamp) < 5, // Toleransi 5 detik
                                );

                                const displayTotal = relatedOrder ? relatedOrder.total : 0;
                                const totalBoxes = relatedOrder ? relatedOrder.items.reduce((sum, item) => sum + item.qtyBox, 0) : 0;

                                return (
                                    <div key={kunjungan.id} onClick={() => handleEdit(kunjungan)} className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:border-purple-200 cursor-pointer relative">
                                        <div className="p-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-purple-600 font-bold text-lg">{kunjungan.tokoNama.charAt(0).toUpperCase()}</div>
                                            <div className="flex-grow">
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{kunjungan.tokoNama}</h3>
                                                <p className="text-xs text-gray-500">{kunjungan.createdAt ? new Date(kunjungan.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</p>
                                            </div>
                                            <div className="text-right pr-5">
                                                <p className={`font-bold text-sm ${displayTotal > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{displayTotal.toLocaleString('id-ID')}</p>
                                                <p className="text-xs text-slate-500">{totalBoxes} box</p>
                                            </div>
                                        </div>
                                        {/* Tombol Titik Tiga */}
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                            <button onClick={(e) => handleMenuClick(e, kunjungan.id)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        {/* Menu Dropdown */}
                                        {openMenuId === kunjungan.id && (
                                            <div className="absolute top-10 right-5 z-20 w-48 bg-white rounded-lg shadow-xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
                                                <div className="py-1">
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(kunjungan);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                                                    >
                                                        <Pencil size={16} /> Edit Kunjungan
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            handlePreview(kunjungan);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                                                    >
                                                        <Eye size={16} /> Lihat Resi
                                                    </button>
                                                    <button onClick={() => handleWhatsAppShare(kunjungan)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3">
                                                        <MessageSquare size={16} /> Kirim via WA
                                                    </button>
                                                    <div className="my-1 h-px bg-slate-100"></div>
                                                    <button
                                                        onClick={() => {
                                                            openDeleteConfirm(kunjungan);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                                    >
                                                        <Trash2 size={16} /> Hapus Kunjungan
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Hidden container for rendering receipt to image */}
                <div className="fixed -left-[9999px] top-0">{receiptKunjungan && <VisitReceipt kunjungan={receiptKunjungan} ref={receiptRef} />}</div>

                {/* Form Tambah Kunjungan (Slide-in) */}
                <div className={`fixed inset-0 z-50 transition-colors duration-300 ${showForm ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`}>
                    <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out transform ${showForm ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between p-4 bg-white">
                                <button type="button" onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100" aria-label="Kembali">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-lg font-bold text-slate-800">{editingVisitId ? 'Edit Kunjungan' : 'Tambah Kunjungan'}</h2>
                                <div className="w-10"></div> {/* Spacer */}
                            </div>

                            <form id="visit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Pilih Toko */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Toko yang Dikunjungi</label>
                                    <div className="relative" style={{ pointerEvents: editingVisitId ? 'none' : 'auto', opacity: editingVisitId ? 0.7 : 1 }}>
                                        <button type="button" onClick={() => setIsTokoDropdownOpen(!isTokoDropdownOpen)} className="w-full p-2.5 text-left bg-white border border-gray-300 rounded-lg flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500">
                                            <span className="flex items-center gap-2">
                                                <Store size={18} className="text-slate-500" />
                                                {tokoList.find((t) => t.id === selectedTokoId)?.nama || 'Pilih Toko'}
                                            </span>
                                            <ChevronDown size={20} className={`transition-transform ${isTokoDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isTokoDropdownOpen && (
                                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
                                                <div className="p-2 border-b border-gray-200">
                                                    <input type="text" placeholder="Cari toko..." value={tokoSearchTerm} onChange={(e) => setTokoSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500" />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto">
                                                    {tokoList
                                                        .filter((t) => t.nama.toLowerCase().includes(tokoSearchTerm.toLowerCase()) || (t.kode && t.kode.toLowerCase().includes(tokoSearchTerm.toLowerCase())))
                                                        .slice() // Buat salinan agar tidak mengubah state asli
                                                        .sort((a, b) => {
                                                            if (a.id === selectedTokoId) return -1; // a (selected) comes first
                                                            if (b.id === selectedTokoId) return 1; // b (selected) comes first
                                                            return a.nama.localeCompare(b.nama); // Urutkan sisanya berdasarkan abjad
                                                        })
                                                        .map(
                                                            (
                                                                toko, // Perkecil padding item dropdown
                                                            ) => (
                                                                <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-2.5 cursor-pointer hover:bg-purple-50 flex justify-between items-center ${selectedTokoId === toko.id ? 'bg-purple-100 font-semibold' : ''}`}>
                                                                    <span>
                                                                        {toko.nama}
                                                                        {toko.kode && <span className="text-xs text-slate-500 ml-2">({toko.kode})</span>}
                                                                    </span>
                                                                    {selectedTokoId === toko.id && <CheckCircle2 size={16} className="text-purple-600" />}
                                                                </div>
                                                            ),
                                                        )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Catatan */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Catatan (Opsional)</label>
                                    <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan hasil kunjungan..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" />
                                </div>

                                {/* Daftar Produk */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="text-purple-600" size={18} />
                                        <h3 className="text-base font-semibold text-slate-800">Pilih Produk</h3>
                                    </div>

                                    <div className="relative mb-3">
                                        <input type="text" placeholder="Cari produk..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full p-2.5 pl-10 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    </div>
                                    {produkList.length === 0 ? (
                                        <div className="space-y-2">
                                            {[...Array(3)].map(
                                                (
                                                    _,
                                                    index, // Render 3 skeleton items
                                                ) => (
                                                    <div key={index} className="rounded-xl p-2.5 border border-gray-200 bg-white animate-pulse">
                                                        <div className="flex items-center gap-3">
                                                            {/* Image Placeholder */}
                                                            <div className="w-14 h-14 flex-shrink-0 bg-gray-200 rounded-lg"></div>
                                                            {/* Text Placeholders */}
                                                            <div className="flex-grow space-y-1">
                                                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                                <div className="h-2.5 bg-gray-200 rounded w-1/2"></div>
                                                            </div>
                                                            {/* Quantity Control Placeholders */}
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                <div className="w-7 h-7 rounded-full bg-gray-200"></div>
                                                                <div className="w-7 h-7 bg-gray-200 rounded"></div>
                                                                <div className="w-7 h-7 rounded-full bg-gray-200"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                            <div className="text-center py-2 text-gray-500 text-sm">Memuat produk...</div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {produkList // Reduce product list item padding, image size, and font sizes
                                                .filter((p) => p.nama.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                                .map((produk) => {
                                                    const qty = cart[produk.id] || 0;
                                                    const isAvailable = produk.available;
                                                    return (
                                                        <div key={produk.id} className={`rounded-xl p-2.5 border transition-all duration-300 ${qty > 0 ? 'bg-lime-400 border-lime-400' : 'bg-white border-gray-200'} ${!isAvailable ? 'bg-slate-100 border-slate-200' : ''}`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative w-14 h-14 flex-shrink-0">
                                                                    <img
                                                                        src={produk.foto || 'https://via.placeholder.com/100?text=Produk'}
                                                                        alt={produk.nama}
                                                                        className={`w-full h-full object-cover rounded-lg ${!isAvailable ? 'grayscale' : ''}`}
                                                                        onError={(e) => {
                                                                            e.target.src = 'https://via.placeholder.com/100?text=Produk';
                                                                        }}
                                                                    />
                                                                    {!isAvailable && (
                                                                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg text-center">
                                                                            <span className="text-xs font-bold text-red-600">Habis</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-grow">
                                                                    <h4 className={`font-bold text-xs text-slate-800 ${!isAvailable ? 'line-through text-slate-500' : ''}`}>{produk.nama}</h4>
                                                                    <p className="text-xs text-slate-600 mt-1">Rp{(produk.hargaPerBox || 0).toLocaleString('id-ID')} / box</p>
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <button type="button" onClick={() => updateQty(produk.id, -1)} className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-300 disabled:opacity-50" disabled={qty === 0 || !isAvailable}>
                                                                        <Minus size={16} />
                                                                    </button>
                                                                    <span className="w-7 text-center font-bold text-base text-purple-700">{qty}</span>
                                                                    <button type="button" onClick={() => updateQty(produk.id, 1)} className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-300" disabled={!isAvailable}>
                                                                        <Plus size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </div>
                            </form>

                            {/* Total & Submit (Sticky di bawah form) */}
                            <div className="bg-white/80 backdrop-blur-sm py-4 px-5 border-t border-gray-200">
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mb-4">
                                    <div className="flex justify-between items-center text-sm font-medium text-purple-700 mb-2">
                                        <span>Total Box</span>
                                        <span>{getTotalBoxes()} box</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg font-bold text-purple-800">
                                        <span>Total Belanja</span>
                                        <span>Rp{getGrandTotal().toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                                <button type="submit" form="visit-form" disabled={submitting || !selectedTokoId} className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {submitting ? 'Menyimpan...' : 'Simpan Kunjungan'}
                                    <CheckCircle2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Preview Resi */}
            {showReceiptPreview && (
                <div className="fixed inset-0 z-[60] bg-black/70 flex flex-col items-center justify-end p-4 transition-opacity duration-300" onClick={closePreview}>
                    <div className="relative w-full max-w-sm bg-slate-100 rounded-2xl shadow-2xl p-4 transition-transform duration-300 transform translate-y-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closePreview} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:bg-slate-200 transition" aria-label="Tutup">
                            <X size={20} />
                        </button>
                        <div className="bg-white rounded-lg overflow-hidden shadow-inner min-h-[200px] flex items-center justify-center">{receiptLoading ? <Loader text="Membuat resi..." /> : <img src={previewImageUrl} alt="Pratinjau Resi" className="w-full h-auto" />}</div>
                        <div className="mt-4">
                            <button onClick={handleDownloadFromPreview} disabled={receiptLoading} className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold text-base hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50">
                                <Download size={20} />
                                Download Gambar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-red-100 rounded-full">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800">Hapus Kunjungan?</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Anda akan menghapus kunjungan ke <strong className="text-slate-700">{itemToDelete?.tokoNama}</strong>. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition">
                                Batal
                            </button>
                            <button onClick={handleConfirmDelete} className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
