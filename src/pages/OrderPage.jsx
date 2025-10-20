// src/pages/OrderPage.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { DayPicker } from 'react-day-picker'; // Pastikan ini ada
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toPng } from 'html-to-image'; //
import { db } from '../lib/firebase';
import { Store, Package, Plus, Minus, CheckCircle2, XCircle, ChevronDown, ArrowLeft, ShoppingCart, Calendar, Pencil, Trash2, Search, CalendarRange, Download, MoreVertical, Eye, X, AlertTriangle, ShoppingBag, Star, List } from 'lucide-react';
import Loader from '../components/Loader';
import VisitReceipt from '../components/VisitReceipt'; // Re-using VisitReceipt for orders

// Komponen MiniLoader
function MiniLoader({ text = 'Memuat...' }) {
    return (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-2">
            <svg className="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{text}</span>
        </div>
    );
}

export default function OrderPage({ setActivePage, onModalChange }) {
    const [orderList, setOrderList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [tokoList, setTokoList] = useState([]);
    const [produkList, setProdukList] = useState([]);
    const [selectedTokoId, setSelectedTokoId] = useState('');
    const [catatan, setCatatan] = useState('');
    const [orderDate, setOrderDate] = useState(new Date()); // State untuk tanggal di form
    const [submitting, setSubmitting] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [cart, setCart] = useState({}); // { productId: jumlahBox }
    const [isTokoDropdownOpen, setIsTokoDropdownOpen] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [tokoSearchTerm, setTokoSearchTerm] = useState('');
    const [showFormCalendar, setShowFormCalendar] = useState(false); // State untuk kalender di form
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [productSortBy, setProductSortBy] = useState('terlaris'); // 'terlaris', 'abjad', 'tersedia'

    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [calendarTokoFilter, setCalendarTokoFilter] = useState(null); // null means all stores
    // Date filter state
    const [filterType, setFilterType] = useState('today'); // 'today', 'custom'
    const [customDate, setCustomDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // Receipt export state
    const [receiptOrder, setReceiptOrder] = useState(null);
    const receiptRef = useRef(null);

    // Receipt preview modal state
    const [showReceiptPreview, setShowReceiptPreview] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState('');
    const [previewImageFilename, setPreviewImageFilename] = useState('');
    const [receiptLoading, setReceiptLoading] = useState(false);

    // Notification state
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // Delete confirmation modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const [justAddedProductId, setJustAddedProductId] = useState(null); // State untuk animasi
    // State untuk rekomendasi produk
    const [productRecommendations, setProductRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    const [openMenuId, setOpenMenuId] = useState(null);

    // Efek untuk memberitahu App.jsx jika ada modal yang terbuka
    useEffect(() => {
        const isAnyModalOpen = showForm || showReceiptPreview || showDeleteConfirm;
        onModalChange(isAnyModalOpen);

        const handlePopState = (event) => {
            if (isAnyModalOpen) {
                event.preventDefault();
                // Tutup modal yang paling atas
                if (showForm) setShowForm(false);
                else if (showReceiptPreview) closePreview();
                else if (showDeleteConfirm) setShowDeleteConfirm(false);
            }
        };

        if (isAnyModalOpen) window.history.pushState({ modal: 'order' }, '');
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [showForm, showReceiptPreview, showDeleteConfirm, onModalChange]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([fetchOrders(), loadTokoData()]);
            setLoading(false);
        };
        loadInitialData();
    }, []);

    const loadFormData = async () => {
        if (isDataLoaded) return;
        try {
            const produkSnap = await getDocs(collection(db, 'produk'));
            const produkData = produkSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.available === b.available ? a.nama.localeCompare(b.nama) : a.available ? -1 : 1));
            setProdukList(produkData);
            setIsDataLoaded(true);
        } catch (error) {
            console.error('Error loading form data:', error);
            showNotification('Gagal memuat data produk.', 'error');
        }
    };

    useEffect(() => {
        if (showForm && !isDataLoaded) {
            loadFormData();
        }
    }, [showForm, isDataLoaded]);

    // Memoized product sales calculation
    const productSales = useMemo(() => {
        const salesMap = new Map();
        orderList.forEach((order) => {
            order.items?.forEach((item) => {
                salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + item.qtyBox);
            });
        });
        return salesMap;
    }, [orderList]);

    // Efek untuk memuat rekomendasi produk saat toko dipilih
    useEffect(() => {
        if (selectedTokoId && produkList.length > 0 && orderList.length > 0) {
            setLoadingRecommendations(true);
            const timer = setTimeout(() => {
                // 1. Cari produk yang sering dibeli toko ini
                const purchaseHistory = new Map();
                orderList
                    .filter((o) => o.tokoId === selectedTokoId)
                    .forEach((order) => {
                        order.items?.forEach((item) => {
                            purchaseHistory.set(item.productId, (purchaseHistory.get(item.productId) || 0) + 1);
                        });
                    });

                const frequentProductIds = [...purchaseHistory.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);

                // 2. Cari produk terlaris global yang belum pernah dibeli toko ini
                const globalBestSellers = [...productSales.entries()].sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
                const unboughtBestSellers = globalBestSellers.filter((productId) => !purchaseHistory.has(productId));

                // 3. Gabungkan dan ambil 5 teratas
                const recommendationIds = [...new Set([...frequentProductIds, ...unboughtBestSellers])].slice(0, 5);
                const recommendations = recommendationIds.map((id) => produkList.find((p) => p.id === id)).filter(Boolean);

                setProductRecommendations(recommendations);
                setLoadingRecommendations(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [selectedTokoId, produkList, orderList, productSales]);

    const fetchOrders = async () => {
        try {
            const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse(); // Reverse client-side to keep newest first
            setOrderList(list);
        } catch (error) {
            console.error('Error fetching orders:', error);
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
        setTokoSearchTerm('');
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => {
            const current = prev[productId] || 0;
            const newQty = Math.max(0, current + delta);
            const newCart = { ...prev, [productId]: newQty };
            if (newQty === 0) delete newCart[productId];
            return newCart;
        });

        // Memicu animasi hanya saat menambah item
        if (delta > 0) {
            setJustAddedProductId(productId);
            // Hapus state setelah animasi selesai
            setTimeout(() => {
                setJustAddedProductId(null);
            }, 400); // Durasi harus sama dengan durasi animasi di CSS
        }
    };

    const getTotalHarga = (produk) => (cart[produk.id] || 0) * (produk.hargaPerBox || 0);
    const getGrandTotal = () => produkList.reduce((sum, produk) => sum + getTotalHarga(produk), 0);
    const getTotalBoxes = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

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

        const orderData = {
            tokoId: selectedTokoId,
            tokoNama: selectedToko?.nama || 'Toko Tidak Diketahui',
            kodeToko: selectedToko?.kode || '',
            items,
            createdAt: orderDate, // Gunakan tanggal dari form
            catatan: catatan.trim(),
            total: getGrandTotal(),
        };

        setSubmitting(true);
        try {
            if (editingOrderId) {
                const orderRef = doc(db, 'orders', editingOrderId);
                // Saat edit, jangan ubah createdAt, hanya data lainnya
                await updateDoc(orderRef, { ...orderData, createdAt: orderList.find((o) => o.id === editingOrderId).createdAt });
                showNotification('Order berhasil diperbarui.');
            } else {
                // Saat buat baru, gunakan tanggal dari form
                await addDoc(collection(db, 'orders'), {
                    ...orderData,
                    // Gunakan serverTimestamp jika ingin waktu server, atau orderDate jika ingin waktu dari form
                    createdAt: serverTimestamp(),
                });
                showNotification('Order berhasil disimpan.');
            }
            resetForm();
            fetchOrders();
        } catch (error) {
            console.error('Error saving order:', error);
            showNotification('Gagal menyimpan order.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const openForm = async () => {
        await loadFormData();
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingOrderId(null);
        setCart({});
        setCatatan('');
        setSelectedTokoId('');
        setOrderDate(new Date()); // Reset tanggal ke hari ini
        setTokoSearchTerm('');
        setProductSearchTerm('');
        setProductRecommendations([]); // Kosongkan rekomendasi
    };

    const handleEdit = async (order) => {
        await loadFormData();
        setEditingOrderId(order.id);
        setSelectedTokoId(order.tokoId);
        setCatatan(order.catatan || '');
        // Pastikan orderDate selalu objek Date yang valid
        setOrderDate(order.createdAt?.seconds && typeof order.createdAt.seconds === 'number' && !isNaN(order.createdAt.seconds) ? new Date(order.createdAt.seconds * 1000) : new Date());
        const initialCart = order.items.reduce((acc, item) => {
            acc[item.productId] = item.qtyBox;
            return acc;
        }, {});
        setCart(initialCart);
        setShowForm(true);
    };

    const openDeleteConfirm = (order) => {
        setItemToDelete(order);
        setShowDeleteConfirm(true);
        closeMenu();
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteDoc(doc(db, 'orders', itemToDelete.id));
            showNotification('Order berhasil dihapus.');
            fetchOrders();
            setShowDeleteConfirm(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting order:', error);
            showNotification('Gagal menghapus order.', 'error');
        }
    };

    const filteredOrders = orderList
        .filter((order) => {
            if (!order.createdAt?.seconds) return false;
            const orderDate = new Date(order.createdAt.seconds * 1000);
            if (filterType === 'today') {
                const today = new Date();
                return orderDate.getDate() === today.getDate() && orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
            }
            if (filterType === 'custom') {
                return orderDate.getDate() === customDate.getDate() && orderDate.getMonth() === customDate.getMonth() && orderDate.getFullYear() === customDate.getFullYear();
            }
            return true;
        })
        .filter((order) => order.tokoNama.toLowerCase().includes(searchTerm.toLowerCase()) || (order.kodeToko && order.kodeToko.toLowerCase().includes(searchTerm.toLowerCase())));

    const handleDateSelect = (date) => {
        if (date) {
            setCustomDate(date);
            setFilterType('custom');
        }
        setShowCalendar(false);
    };

    const handlePreview = useCallback(async (order) => {
        setReceiptOrder(order);
        setReceiptLoading(true);
        setShowReceiptPreview(true);

        setTimeout(async () => {
            const node = document.getElementById(`receipt-${order.id}`);
            if (!node) {
                showNotification('Gagal menemukan elemen resi.', 'error');
                setReceiptOrder(null);
                setReceiptLoading(false);
                return;
            }

            // Fungsi untuk memastikan semua gambar di dalam node sudah termuat
            const waitForImages = async (nodeElement) => {
                const images = Array.from(nodeElement.getElementsByTagName('img'));
                const promises = images.map((img) => {
                    if (img.complete) {
                        return Promise.resolve();
                    }
                    return new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                });
                await Promise.all(promises);
            };

            try {
                await waitForImages(node); // Tunggu gambar selesai dimuat
                const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
                setPreviewImageUrl(dataUrl);
                setPreviewImageFilename(`resi-${order.tokoNama.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.png`);
            } catch (err) {
                console.error('Oops, something went wrong!', err);
                showNotification('Gagal membuat pratinjau resi.', 'error');
            } finally {
                setReceiptLoading(false);
                // Keep receiptOrder to show the component until modal is closed
            }
        }, 100);
    }, []);

    const closePreview = () => {
        setShowReceiptPreview(false);
        setPreviewImageUrl('');
        setReceiptOrder(null);
    };

    const handleMenuClick = (e, orderId) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === orderId ? null : orderId);
    };

    const closeMenu = () => setOpenMenuId(null);

    const handleDownloadFromPreview = () => {
        const link = document.createElement('a');
        link.download = previewImageFilename;
        link.href = previewImageUrl;
        link.click();
    };

    // Memoized sorted product list
    const sortedProdukList = useMemo(() => {
        return [...produkList]
            .filter((p) => p.nama.toLowerCase().includes(productSearchTerm.toLowerCase()))
            .sort((a, b) => {
                if (productSortBy === 'terlaris') {
                    return (productSales.get(b.id) || 0) - (productSales.get(a.id) || 0);
                }
                if (productSortBy === 'abjad') {
                    return a.nama.localeCompare(b.nama);
                }
                return a.available === b.available ? a.nama.localeCompare(b.nama) : a.available ? -1 : 1;
            });
    }, [produkList, productSearchTerm, productSortBy, productSales]);

    // Memoized top stores by box count
    const topStoresByBox = useMemo(() => {
        const storeTotals = new Map();
        orderList.forEach((order) => {
            const totalBoxes = order.items?.reduce((sum, item) => sum + (item.qtyBox || 0), 0) || 0;
            const currentTotal = storeTotals.get(order.tokoId) || { total: 0, name: order.tokoNama, id: order.tokoId };
            currentTotal.total += totalBoxes;
            storeTotals.set(order.tokoId, currentTotal);
        });

        return [...storeTotals.values()]
            .sort((a, b) => b.total - a.total) // Sort by total boxes descending
            .filter((store) => store.id); // Filter out any potential undefined stores
    }, [orderList]);

    // Komponen untuk tampilan kalender
    const CalendarView = () => {
        const [currentMonth, setCurrentMonth] = useState(new Date());

        const dailyTotals = useMemo(() => {
            const totals = new Map();
            const filtered = calendarTokoFilter ? orderList.filter((o) => o.tokoId === calendarTokoFilter) : orderList;

            filtered.forEach((order) => {
                // Periksa apakah createdAt.seconds ada, bertipe number, dan bukan NaN
                if (order.createdAt && typeof order.createdAt.seconds === 'number' && !isNaN(order.createdAt.seconds)) {
                    const date = new Date(order.createdAt.seconds * 1000);
                    // Pastikan objek Date yang dibuat juga valid
                    if (!isNaN(date.getTime())) {
                        const dateString = format(date, 'yyyy-MM-dd');
                        const orderBoxes = order.items.reduce((sum, item) => sum + (item.qtyBox || 0), 0);
                        totals.set(dateString, (totals.get(dateString) || 0) + orderBoxes);
                    } else {
                        // Log peringatan jika objek Date tidak valid setelah dibuat
                        console.warn('Order with invalid Date object created from timestamp:', order.id, order.createdAt);
                    }
                } else {
                    // Log peringatan jika createdAt.seconds tidak valid
                    console.warn('Order with missing, non-numeric, or NaN createdAt.seconds:', order.id, order.createdAt);
                }
            });
            return totals;
        }, [orderList, calendarTokoFilter]);

        const monthlyTotal = useMemo(() => {
            let total = 0;
            dailyTotals.forEach((amount, dateString) => {
                const date = new Date(dateString.replace(/-/g, '/')); // Fix: Ensure date is parsed in local time
                if (date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()) {
                    total += amount; // Ini sekarang menjumlahkan box
                }
            });
            return total;
        }, [dailyTotals, currentMonth]);

        const handleDayClick = (date) => {
            if (!date) return;
            setCustomDate(date);
            setFilterType('custom');
            setViewMode('list'); // Langsung kembali ke mode list setelah memilih tanggal
        };

        const DayWithRevenue = ({ day, ...tdProps }) => {
            const { date, displayMonth } = day;
            // Pemeriksaan defensif: jika tanggal tidak valid, tampilkan fallback
            if (!date || isNaN(date.getTime())) {
                console.error('DayWithRevenue received an invalid date:', date);
                return (
                    <td {...tdProps}>
                        <div className="w-full h-full flex items-center justify-center text-red-500 text-xs">Err</div>
                    </td>
                );
            }

            const dateString = format(date, 'yyyy-MM-dd');
            const total = dailyTotals.get(dateString);
            const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
            const hasOrder = total > 0;

            // Fungsi untuk menentukan warna berdasarkan jumlah box
            const getBgColor = (boxCount) => {
                if (boxCount > 50) return 'bg-green-300 hover:bg-green-400 text-green-900 font-bold';
                if (boxCount > 20) return 'bg-green-200 hover:bg-green-300 text-green-800 font-semibold';
                if (boxCount > 0) return 'bg-green-100 hover:bg-green-200 text-green-800';
                return 'bg-slate-50 hover:bg-slate-100';
            };

            return (
                <td {...tdProps} className="w-[14.28%]">
                    <button type="button" onClick={() => handleDayClick(date)} disabled={!isCurrentMonth} className={`flex aspect-square w-full flex-col items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 disabled:pointer-events-none ${isCurrentMonth ? getBgColor(total) : 'text-slate-300 bg-slate-50/50'}`}>
                        <time dateTime={date.toISOString()} className={`text-sm ${hasOrder ? '' : isCurrentMonth ? 'text-slate-600' : ''}`}>
                            {format(date, 'd')}
                        </time>
                        {isCurrentMonth && <span className={`text-[10px] -mt-1 truncate ${hasOrder ? 'text-blue-800' : 'text-slate-400'}`}>{`${total || 0} box`}</span>}
                    </button>
                </td>
            );
        };

        return (
            <div className="bg-white p-2 sm:p-4 rounded-xl shadow-sm border border-gray-200">
                <DayPicker
                    mode="single" // Tetap single, tapi kita handle kliknya secara manual
                    onDayClick={handleDayClick}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    captionLayout="dropdown"
                    components={{
                        // eslint-disable-next-line react/prop-types
                        Day: DayWithRevenue,
                    }}
                    showOutsideDays
                    locale={id}
                    fromYear={2020}
                    toYear={new Date().getFullYear() + 1}
                    classNames={{
                        root: 'w-full',
                        month_grid: 'w-full',
                        months: 'w-full',
                        caption: 'flex justify-between items-center mb-4', // Kembalikan justify-between
                        caption_dropdowns: 'flex flex-row gap-2 items-center', // Menambahkan flex-row
                        caption_label: 'text-lg font-bold text-purple-800',
                        table: 'w-full border-collapse table-fixed', // 3. Kunci untuk lebar kolom yang sama
                        head_cell: 'font-semibold text-xs text-slate-500 p-1', // Lebar sekarang diatur di <td>
                        cell: 'p-0.5',
                        day_today: 'text-purple-600 ring-2 ring-purple-300 rounded-lg',
                    }}
                    footer={<div className="text-center text-sm font-bold text-purple-800 mt-4 pt-2 border-t">Total Box Bulan Ini: {monthlyTotal.toLocaleString('id-ID')} box</div>}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
                <Loader text="Memuat data order..." />
            </div>
        );
    }

    return (
        <>
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

            <div className="pb-20 max-w-md mx-auto" onClick={closeMenu}>
                <div className="p-5 pb-20">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <ShoppingBag className="text-purple-600" />
                            Order
                        </h2>
                        <button onClick={openForm} className="bg-purple-600 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 hover:bg-purple-700 transition shadow-md hover:shadow-lg">
                            <Plus size={18} /> Tambah
                        </button>
                    </div>

                    <div className="relative mb-4">
                        <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 text-slate-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>

                    <div className="relative mb-6 flex items-center gap-2">
                        {viewMode === 'list' && (
                            <>
                                <button onClick={() => setFilterType('today')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filterType === 'today' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                    <Calendar size={16} />
                                    Hari Ini
                                </button>
                                <button onClick={() => setShowCalendar(!showCalendar)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${filterType === 'custom' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300'}`}>
                                    <CalendarRange size={16} />
                                    {filterType === 'custom' ? format(customDate, 'd MMM yyyy', { locale: id }) : 'Pilih Tanggal'}
                                </button>
                            </>
                        )}
                        {/* --- PERUBAHAN DIMULAI DI SINI --- */}
                        {/* Area scrollable untuk filter toko (hanya di mode kalender) */}
                        {viewMode === 'calendar' && (
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <button onClick={() => setCalendarTokoFilter(null)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${!calendarTokoFilter ? 'bg-purple-600 text-white shadow' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}>
                                        Semua Toko
                                    </button>
                                    {topStoresByBox.map((toko) => (
                                        <button key={toko.id} onClick={() => setCalendarTokoFilter(toko.id)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${calendarTokoFilter === toko.id ? 'bg-purple-600 text-white shadow' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}>
                                            <span>{toko.name}</span>
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${calendarTokoFilter === toko.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{toko.total}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className="p-2 bg-white text-slate-600 border border-slate-300 rounded-lg transition-all hover:bg-slate-100 ml-auto flex-shrink-0">
                            {viewMode === 'list' ? <Calendar size={16} /> : <List size={16} />}
                        </button>

                        {showCalendar && viewMode === 'list' && (
                            <div className="absolute top-full mt-2 z-20 bg-white rounded-2xl shadow-2xl border p-2" onMouseLeave={() => setShowCalendar(false)}>
                                <DayPicker mode="single" selected={customDate} onSelect={handleDateSelect} captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 1} classNames={{ caption_label: 'text-lg font-bold', head_cell: 'font-semibold', day_selected: 'bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:bg-purple-700', day_today: 'font-bold text-purple-600' }} />
                            </div>
                        )}
                    </div>

                    {viewMode === 'calendar' ? (
                        <CalendarView
                        // Pass necessary props if CalendarView is refactored
                        // topStores={topStoresByBox}
                        // selectedTokoId={calendarTokoFilter}
                        // onSelectToko={setCalendarTokoFilter}
                        />
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                            <ShoppingCart size={40} className="mx-auto text-gray-400 mb-2" />
                            {searchTerm ? 'Order tidak ditemukan.' : 'Belum ada order yang tercatat.'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => {
                                const totalBoxes = order.items.reduce((sum, item) => sum + item.qtyBox, 0);
                                return (
                                    <div key={order.id} onClick={() => handleEdit(order)} className="bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:border-purple-200 cursor-pointer relative">
                                        <div className="p-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-purple-600 font-bold text-lg">{order.tokoNama.charAt(0).toUpperCase()}</div>
                                            <div className="flex-grow">
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight">{order.tokoNama}</h3>
                                                <p className="text-xs text-gray-500">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</p>
                                            </div>
                                            <div className="text-right pr-5">
                                                <p className={`font-bold text-sm ${order.total > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{order.total.toLocaleString('id-ID')}</p>
                                                <p className="text-xs text-slate-500">{totalBoxes} box</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                            <button onClick={(e) => handleMenuClick(e, order.id)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                        {openMenuId === order.id && (
                                            <div className="absolute top-10 right-5 z-20 w-48 bg-white rounded-lg shadow-xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
                                                <div className="py-1">
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(order);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                                                    >
                                                        <Pencil size={16} /> Edit Order
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handlePreview(order);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3"
                                                    >
                                                        <Eye size={16} /> Lihat Resi
                                                    </button>
                                                    <div className="my-1 h-px bg-slate-100"></div>
                                                    <button
                                                        onClick={() => {
                                                            openDeleteConfirm(order);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                                    >
                                                        <Trash2 size={16} /> Hapus Order
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

                <div className="fixed -left-[9999px] top-0">{receiptOrder && <VisitReceipt kunjungan={receiptOrder} ref={receiptRef} />}</div>

                <div className={`fixed inset-0 z-50 transition-colors duration-300 ${showForm ? 'bg-black/40' : 'bg-transparent pointer-events-none'}`}>
                    <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out transform ${showForm ? 'translate-x-0' : '-translate-x-full'}`}>
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between p-4 bg-white">
                                <button type="button" onClick={resetForm} className="p-2 rounded-full hover:bg-slate-100" aria-label="Kembali">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-lg font-bold text-slate-800">{editingOrderId ? 'Edit Order' : 'Tambah Order'}</h2>
                                <div className="w-10"></div>
                            </div>

                            <form id="order-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Tanggal Order *</label>
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowFormCalendar(!showFormCalendar)} className="w-full p-2.5 text-left bg-white border border-gray-300 rounded-lg flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500">
                                            <span className="flex items-center gap-2">
                                                <Calendar size={18} className="text-slate-500" />
                                                {format(orderDate, 'EEEE, d MMMM yyyy', { locale: id })}
                                            </span>
                                            <ChevronDown size={20} className={`transition-transform ${showFormCalendar ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showFormCalendar && (
                                            <div className="absolute top-full mt-2 z-30 bg-white rounded-2xl shadow-2xl border p-2" onMouseLeave={() => setShowFormCalendar(false)}>
                                                <DayPicker
                                                    mode="single"
                                                    selected={orderDate}
                                                    onSelect={(date) => {
                                                        if (date) setOrderDate(date);
                                                        setShowFormCalendar(false);
                                                    }}
                                                    defaultMonth={orderDate}
                                                    classNames={{ day_selected: 'bg-purple-600 text-white rounded-full', day_today: 'font-bold text-purple-600' }}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Toko</label>
                                    <div className="relative" style={{ pointerEvents: editingOrderId ? 'none' : 'auto', opacity: editingOrderId ? 0.7 : 1 }}>
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
                                                        .slice()
                                                        .sort((a, b) => a.nama.localeCompare(b.nama))
                                                        .map((toko) => (
                                                            <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-2.5 cursor-pointer hover:bg-purple-50 flex justify-between items-center ${selectedTokoId === toko.id ? 'bg-purple-100 font-semibold' : ''}`}>
                                                                <span>
                                                                    {toko.nama}
                                                                    {toko.kode && <span className="text-xs text-slate-500 ml-2">({toko.kode})</span>}
                                                                </span>
                                                                {selectedTokoId === toko.id && <CheckCircle2 size={16} className="text-purple-600" />}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rekomendasi Produk */}
                                {productRecommendations.length > 0 && (
                                    <div className="pt-2">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                            <Star size={16} className="text-yellow-500 fill-current" />
                                            <span>Rekomendasi Untuk Toko Ini</span>
                                        </h3>
                                        {loadingRecommendations ? (
                                            <MiniLoader text="Menganalisis..." />
                                        ) : (
                                            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                {productRecommendations.map((produk) => (
                                                    <button type="button" key={produk.id} onClick={() => updateQty(produk.id, 1)} disabled={!produk.available} className={`flex-shrink-0 w-24 text-center p-2 bg-white border border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition disabled:opacity-50 ${justAddedProductId === produk.id ? 'animate-pop' : ''}`}>
                                                        <img src={produk.foto || 'https://via.placeholder.com/100?text=Produk'} alt={produk.nama} className="w-12 h-12 mx-auto object-cover rounded-md" />
                                                        <p className="text-xs font-medium text-slate-700 mt-1 truncate">{produk.nama}</p>
                                                        {cart[produk.id] > 0 && <span className="text-xs font-bold text-green-600">({cart[produk.id]} box)</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Catatan (Opsional)</label>
                                    <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan untuk order..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" />
                                </div>
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
                                        <div className="text-center py-6 text-gray-500 text-sm">Memuat produk...</div>
                                    ) : sortedProdukList.length === 0 ? (
                                        <div className="text-center py-6 text-slate-500">Produk tidak ditemukan.</div>
                                    ) : (
                                        <>
                                            {/* Filter Produk */}
                                            <div className="flex items-center gap-2 mb-4 p-1 bg-slate-200 rounded-full">
                                                {['terlaris', 'abjad', 'tersedia'].map((filter) => (
                                                    <button key={filter} type="button" onClick={() => setProductSortBy(filter)} className={`flex-1 capitalize text-xs font-semibold py-1.5 rounded-full transition-all duration-300 ${productSortBy === filter ? 'bg-white text-purple-700 shadow-sm' : 'bg-transparent text-slate-500'}`}>
                                                        {filter === 'abjad' ? 'A-Z' : filter}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="space-y-3">
                                                {sortedProdukList.map((produk) => {
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
                                        </>
                                    )}
                                </div>
                            </form>

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
                                <button type="submit" form="order-form" disabled={submitting || !selectedTokoId} className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {submitting ? 'Menyimpan...' : 'Simpan Order'}
                                    <CheckCircle2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-5">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-red-100 rounded-full">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800">Hapus Order?</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Anda akan menghapus order untuk <strong className="text-slate-700">{itemToDelete?.tokoNama}</strong>. Tindakan ini tidak dapat dibatalkan.
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
