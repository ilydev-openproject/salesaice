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

// Komponen MiniLoader dengan styling modern
function MiniLoader({ text = 'Memuat...' }) {
    return (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-600 py-3">
            <div className="relative">
                <div className="w-6 h-6 border-2 border-purple-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-6 h-6 border-2 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <span className="font-medium">{text}</span>
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
            // Set empty array sebagai fallback
            setProdukList([]);
            setIsDataLoaded(true);

            // Tampilkan notifikasi error yang user-friendly
            if (error.code === 'permission-denied') {
                showNotification('Tidak memiliki izin untuk mengakses data produk. Silakan hubungi administrator.', 'error');
            } else {
                showNotification('Gagal memuat data produk. Periksa koneksi internet Anda.', 'error');
            }
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
            // Set empty array sebagai fallback
            setOrderList([]);

            // Tampilkan notifikasi error yang user-friendly
            if (error.code === 'permission-denied') {
                showNotification('Tidak memiliki izin untuk mengakses data order. Silakan hubungi administrator.', 'error');
            } else {
                showNotification('Gagal memuat data order. Periksa koneksi internet Anda.', 'error');
            }
        }
    };

    const loadTokoData = async () => {
        try {
            const tokoSnap = await getDocs(collection(db, 'toko'));
            const tokoData = tokoSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setTokoList(tokoData);
        } catch (error) {
            console.error('Error loading toko data:', error);
            // Set empty array sebagai fallback
            setTokoList([]);

            // Tampilkan notifikasi error yang user-friendly
            if (error.code === 'permission-denied') {
                showNotification('Tidak memiliki izin untuk mengakses data toko. Silakan hubungi administrator.', 'error');
            } else {
                showNotification('Gagal memuat data toko. Periksa koneksi internet Anda.', 'error');
            }
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
    };

    const getTotalHarga = (produk) => (cart[produk.id] || 0) * (produk.hargaPerBox || 0);
    const getGrandTotal = () => produkList.reduce((sum, produk) => sum + getTotalHarga(produk), 0);
    const getTotalBoxes = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const getTotalProfit = () =>
        produkList.reduce((sum, produk) => {
            const qty = cart[produk.id] || 0;
            const profitPerBox = (produk.hargaJualPerPcs || 0) * (produk.isiPerBox || 1) - (produk.hargaPerBox || 0);
            return sum + profitPerBox * qty;
        }, 0);

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

            // Tampilkan notifikasi error yang lebih spesifik
            if (error.code === 'permission-denied') {
                showNotification('Tidak memiliki izin untuk menyimpan order. Silakan hubungi administrator.', 'error');
            } else if (error.code === 'unavailable') {
                showNotification('Layanan tidak tersedia. Periksa koneksi internet Anda.', 'error');
            } else {
                showNotification('Gagal menyimpan order. Silakan coba lagi.', 'error');
            }
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

            // Tampilkan notifikasi error yang lebih spesifik
            if (error.code === 'permission-denied') {
                showNotification('Tidak memiliki izin untuk menghapus order. Silakan hubungi administrator.', 'error');
            } else if (error.code === 'unavailable') {
                showNotification('Layanan tidak tersedia. Periksa koneksi internet Anda.', 'error');
            } else {
                showNotification('Gagal menghapus order. Silakan coba lagi.', 'error');
            }
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
            <div className="bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200/50 backdrop-blur-sm relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full translate-y-12 -translate-x-12"></div>

                <div className="relative z-10">
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
                            caption: 'flex justify-between items-center mb-6',
                            caption_dropdowns: 'flex flex-row gap-2 items-center',
                            caption_label: 'text-xl font-bold gradient-text',
                            table: 'w-full border-collapse table-fixed',
                            head_cell: 'w-[14.28%] font-semibold text-xs text-slate-600 p-2',
                            cell: 'p-1',
                            day_today: 'text-purple-600 ring-2 ring-purple-300 rounded-lg font-bold',
                        }}
                        footer={
                            <div className="text-center text-sm font-bold text-purple-800 mt-6 pt-4 border-t border-slate-200/50 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3">
                                Total Box Bulan Ini: <span className="text-purple-600">{monthlyTotal.toLocaleString('id-ID')} box</span>
                            </div>
                        }
                    />
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-120px)] flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center animate-float">
                        <ShoppingBag size={32} className="text-purple-600" />
                    </div>
                    <Loader text="Memuat data order..." />
                </div>
            </div>
        );
    }

    return (
        <>
            {notification.show && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 transition-all duration-300 animate-slide-in-top">
                    <div className={`flex items-center gap-3 w-full p-4 rounded-2xl shadow-2xl border backdrop-blur-md relative overflow-hidden ${notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 text-white' : 'bg-gradient-to-r from-red-500 to-orange-600 border-red-400 text-white'}`}>
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>

                        <div className="relative z-10 flex items-center gap-3 w-full">
                            <div className="p-2 bg-white/20 rounded-xl">{notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>
                            <p className="font-semibold text-sm flex-1">{notification.message}</p>
                            <button onClick={() => setNotification({ ...notification, show: false })} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 hover-scale focus-ring">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="pb-20 max-w-md mx-auto" onClick={closeMenu}>
                <div className="p-5 pb-20">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-sm">
                                <ShoppingBag className="text-purple-600" size={24} />
                            </div>
                            <span className="gradient-text">Order</span>
                        </h2>
                        <button onClick={openForm} className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:from-purple-700 hover:via-purple-800 hover:to-indigo-800 transition-all duration-300 shadow-lg hover:shadow-xl hover-lift hover-glow focus-ring group">
                            <Plus size={20} className="group-hover:scale-110 transition-transform" />
                            <span>Tambah Order</span>
                        </button>
                    </div>

                    <div className="relative mb-4 group">
                        <input type="text" placeholder="Cari nama atau kode toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-4 pl-12 text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 hover:bg-white hover:shadow-md transition-all duration-200 focus-ring" />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                                <Search className="text-purple-600" size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="relative mb-6 flex items-center gap-2">
                        {viewMode === 'list' && (
                            <>
                                <button onClick={() => setFilterType('today')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover-lift focus-ring ${filterType === 'today' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-white hover:shadow-md'}`}>
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <Calendar size={16} />
                                    </div>
                                    Hari Ini
                                </button>
                                <button onClick={() => setShowCalendar(!showCalendar)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover-lift focus-ring ${filterType === 'custom' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-white hover:shadow-md'}`}>
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        <CalendarRange size={16} />
                                    </div>
                                    {filterType === 'custom' ? format(customDate, 'd MMM yyyy', { locale: id }) : 'Pilih Tanggal'}
                                </button>
                            </>
                        )}
                        {/* --- PERUBAHAN DIMULAI DI SINI --- */}
                        {/* Area scrollable untuk filter toko (hanya di mode kalender) */}
                        {viewMode === 'calendar' && (
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2 overflow-x-auto py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    <button onClick={() => setCalendarTokoFilter(null)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap hover-lift focus-ring ${!calendarTokoFilter ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-white hover:shadow-md'}`}>
                                        Semua Toko
                                    </button>
                                    {topStoresByBox.map((toko) => (
                                        <button key={toko.id} onClick={() => setCalendarTokoFilter(toko.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap hover-lift focus-ring ${calendarTokoFilter === toko.id ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-white hover:shadow-md'}`}>
                                            {toko.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className="p-3 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 rounded-xl transition-all duration-200 hover:bg-white hover:shadow-md hover-lift focus-ring ml-auto flex-shrink-0 group">
                            <div className="p-1.5 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg group-hover:scale-110 transition-transform">{viewMode === 'list' ? <Calendar size={16} className="text-purple-600" /> : <List size={16} className="text-purple-600" />}</div>
                        </button>

                        {showCalendar && viewMode === 'list' && (
                            <div className="absolute top-full mt-3 z-20 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 p-4 animate-slide-in-top" onMouseLeave={() => setShowCalendar(false)}>
                                <DayPicker
                                    mode="single"
                                    selected={customDate}
                                    onSelect={handleDateSelect}
                                    captionLayout="dropdown-buttons"
                                    fromYear={2020}
                                    toYear={new Date().getFullYear() + 1}
                                    classNames={{ caption_label: 'text-lg font-bold text-purple-800', head_cell: 'font-semibold text-slate-600', day_selected: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg', day_today: 'font-bold text-purple-600 ring-2 ring-purple-200 rounded-full', day: 'hover:bg-purple-50 rounded-full transition-colors' }}
                                />
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
                        <div className="text-center text-slate-500 py-12 bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/30 rounded-2xl border border-slate-200/50 relative overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full -translate-y-16 translate-x-16"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full translate-y-12 -translate-x-12"></div>

                            <div className="relative z-10">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center animate-float">
                                    <ShoppingCart size={40} className="text-purple-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">{searchTerm ? 'Order tidak ditemukan' : orderList.length === 0 ? 'Tidak dapat memuat data order' : 'Belum ada order yang tercatat'}</h3>
                                <p className="text-sm text-slate-500">{searchTerm ? 'Coba gunakan kata kunci yang berbeda' : orderList.length === 0 ? 'Periksa izin akses atau koneksi internet' : 'Mulai dengan menambahkan order pertama Anda'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => {
                                const totalBoxes = order.items.reduce((sum, item) => sum + item.qtyBox, 0);
                                return (
                                    <div key={order.id} onClick={() => handleEdit(order)} className="bg-gradient-to-r from-white via-slate-50/50 to-purple-50/30 rounded-2xl shadow-sm border border-slate-200/50 transition-all duration-300 hover:shadow-lg hover:border-purple-300 cursor-pointer relative hover-lift focus-ring group backdrop-blur-sm">
                                        <div className="p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-purple-600 font-bold text-lg shadow-sm group-hover:scale-110 transition-transform">{order.tokoNama.charAt(0).toUpperCase()}</div>
                                            <div className="flex-grow min-w-0">
                                                <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">{order.tokoNama}</h3>
                                                <p className="text-xs text-slate-500 mt-1">{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</p>
                                            </div>
                                            <div className="text-right pr-5">
                                                <p className={`font-bold text-sm ${order.total > 0 ? 'text-green-600' : 'text-slate-500'}`}>Rp{order.total.toLocaleString('id-ID')}</p>
                                                <p className="text-xs text-slate-500 mt-1">{totalBoxes} box</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                            <button onClick={(e) => handleMenuClick(e, order.id)} className="p-2 rounded-full hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-100 text-slate-500 hover:text-purple-600 transition-all duration-200 hover-scale focus-ring">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                        {openMenuId === order.id && (
                                            <div className="absolute top-10 right-5 z-20 w-48 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/30 rounded-2xl shadow-2xl border border-slate-200/50 backdrop-blur-md animate-slide-in-top" onClick={(e) => e.stopPropagation()}>
                                                <div className="py-2">
                                                    <button
                                                        onClick={() => {
                                                            handleEdit(order);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 flex items-center gap-3 transition-all duration-200 hover-lift rounded-xl mx-2"
                                                    >
                                                        <div className="p-1.5 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg">
                                                            <Pencil size={16} className="text-blue-600" />
                                                        </div>
                                                        Edit Order
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handlePreview(order);
                                                            closeMenu();
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 flex items-center gap-3 transition-all duration-200 hover-lift rounded-xl mx-2"
                                                    >
                                                        <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg">
                                                            <Eye size={16} className="text-emerald-600" />
                                                        </div>
                                                        Lihat Resi
                                                    </button>
                                                    <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-4"></div>
                                                    <button
                                                        onClick={() => {
                                                            openDeleteConfirm(order);
                                                        }}
                                                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 flex items-center gap-3 transition-all duration-200 hover-lift rounded-xl mx-2"
                                                    >
                                                        <div className="p-1.5 bg-gradient-to-br from-red-100 to-orange-100 rounded-lg">
                                                            <Trash2 size={16} className="text-red-600" />
                                                        </div>
                                                        Hapus Order
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

                <div className={`fixed inset-0 z-50 transition-all duration-500 ${showForm ? 'bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
                    <div className={`absolute inset-y-0 left-0 w-full max-w-md bg-gradient-to-br from-white via-slate-50 to-purple-50/30 shadow-2xl transition-all duration-500 ease-out transform ${showForm ? 'translate-x-0 scale-100 opacity-100 animate-slide-in-left' : '-translate-x-full scale-95 opacity-0'}`}>
                        <div className="h-full flex flex-col">
                            {/* Header standar dengan latar belakang putih */}
                            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
                                <button type="button" onClick={resetForm} className="p-2 rounded-full" aria-label="Kembali">
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 className="text-lg font-bold text-slate-800">{editingOrderId ? 'Edit Order' : 'Tambah Order'}</h2>
                                <div className="w-10"></div> {/* Spacer */}
                            </div>

                            <form id="order-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Tanggal Order dengan styling modern */}
                                <div className="space-y-3">
                                    <label className="flex text-sm font-semibold text-slate-800 mb-3 items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
                                        Tanggal Order *
                                    </label>
                                    <div className="relative group">
                                        <button type="button" onClick={() => setShowFormCalendar(!showFormCalendar)} className="w-full p-4 text-left bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 hover:bg-white hover:shadow-md transition-all duration-200 group-hover:shadow-lg hover-lift focus-ring">
                                            <span className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                                                    <Calendar size={18} className="text-purple-600" />
                                                </div>
                                                <span className="text-slate-700 font-medium">{format(orderDate, 'EEEE, d MMMM yyyy', { locale: id })}</span>
                                            </span>
                                            <ChevronDown size={20} className={`text-slate-400 transition-all duration-300 ${showFormCalendar ? 'rotate-180 text-purple-600' : ''}`} />
                                        </button>
                                        {showFormCalendar && (
                                            <div className="absolute top-full mt-3 z-30 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/50 p-4 animate-in slide-in-from-top-2 fade-in" onMouseLeave={() => setShowFormCalendar(false)}>
                                                <DayPicker
                                                    mode="single"
                                                    selected={orderDate}
                                                    onSelect={(date) => {
                                                        if (date) setOrderDate(date);
                                                        setShowFormCalendar(false);
                                                    }}
                                                    defaultMonth={orderDate}
                                                    classNames={{
                                                        day_selected: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg',
                                                        day_today: 'font-bold text-purple-600 ring-2 ring-purple-200 rounded-full',
                                                        day: 'hover:bg-purple-50 rounded-full transition-colors',
                                                    }}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Toko Selection dengan styling modern */}
                                <div className="space-y-3">
                                    <label className="flex text-sm font-semibold text-slate-800 mb-3 items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                                        Toko
                                    </label>
                                    <div className="relative group" style={{ pointerEvents: editingOrderId ? 'none' : 'auto', opacity: editingOrderId ? 0.7 : 1 }}>
                                        <button type="button" onClick={() => setIsTokoDropdownOpen(!isTokoDropdownOpen)} className="w-full p-4 text-left bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 hover:bg-white hover:shadow-md transition-all duration-200 group-hover:shadow-lg hover-lift focus-ring">
                                            <span className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl">
                                                    <Store size={18} className="text-emerald-600" />
                                                </div>
                                                <span className="text-slate-700 font-medium">{tokoList.find((t) => t.id === selectedTokoId)?.nama || 'Pilih Toko'}</span>
                                            </span>
                                            <ChevronDown size={20} className={`text-slate-400 transition-all duration-300 ${isTokoDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                                        </button>
                                        {isTokoDropdownOpen && (
                                            <div className="absolute z-10 mt-3 w-full bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-top-2 fade-in">
                                                <div className="p-4 border-b border-slate-200/50">
                                                    <div className="relative">
                                                        <input type="text" placeholder="Cari toko..." value={tokoSearchTerm} onChange={(e) => setTokoSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-3 pl-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-300 transition-all" />
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    </div>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto p-2">
                                                    {tokoList.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-500">
                                                            <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                                                                <Store size={24} className="text-slate-400" />
                                                            </div>
                                                            <p className="text-sm font-medium">Tidak dapat memuat data toko</p>
                                                            <p className="text-xs text-slate-400 mt-1">Periksa izin akses atau koneksi internet</p>
                                                        </div>
                                                    ) : (
                                                        tokoList
                                                            .filter((t) => t.nama.toLowerCase().includes(tokoSearchTerm.toLowerCase()) || (t.kode && t.kode.toLowerCase().includes(tokoSearchTerm.toLowerCase())))
                                                            .slice()
                                                            .sort((a, b) => a.nama.localeCompare(b.nama))
                                                            .map((toko) => (
                                                                <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-3 cursor-pointer rounded-xl transition-all duration-200 flex justify-between items-center group ${selectedTokoId === toko.id ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm' : ''}`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedTokoId === toko.id ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{toko.nama.charAt(0).toUpperCase()}</div>
                                                                        <div>
                                                                            <span className="font-medium text-slate-700">{toko.nama}</span>
                                                                            {toko.kode && <span className="text-xs text-slate-500 ml-2">({toko.kode})</span>}
                                                                        </div>
                                                                    </div>
                                                                    {selectedTokoId === toko.id && <CheckCircle2 size={18} className="text-emerald-600" />}
                                                                </div>
                                                            ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rekomendasi Produk dengan styling modern */}
                                {productRecommendations.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
                                            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                <div className="p-1.5 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
                                                    <Star size={14} className="text-yellow-600 fill-current" />
                                                </div>
                                                <span>Rekomendasi Untuk Toko Ini</span>
                                            </h3>
                                        </div>
                                        {loadingRecommendations ? (
                                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border border-yellow-200">
                                                <MiniLoader text="Menganalisis..." />
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                {productRecommendations.map((produk) => (
                                                    <button type="button" key={produk.id} onClick={() => updateQty(produk.id, 1)} disabled={!produk.available} className={`flex-shrink-0 w-28 text-center p-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl transition-all duration-200 disabled:opacity-50 group focus-ring ${justAddedProductId === produk.id ? 'animate-pop' : ''}`}>
                                                        <div className="relative">
                                                            <img src={produk.foto || 'https://via.placeholder.com/100?text=Produk'} alt={produk.nama} className="w-14 h-14 mx-auto object-contain rounded-xl shadow-sm group-hover:scale-105 transition-transform" />
                                                            {cart[produk.id] > 0 && (
                                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                                                                    <span className="text-xs font-bold text-white">{cart[produk.id]}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-medium text-slate-700 mt-2 truncate">{produk.nama}</p>
                                                        {cart[produk.id] > 0 && <span className="text-xs font-bold text-green-600 mt-1 animate-pulse">({cart[produk.id]} box)</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Catatan dengan styling modern */}
                                <div className="space-y-3">
                                    <label className="flex text-sm font-semibold text-slate-800 mb-3 items-center gap-2">
                                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                                        Catatan (Opsional)
                                    </label>
                                    <div className="relative group">
                                        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan untuk order..." className="w-full p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all duration-200 resize-none" rows="3" />
                                        <div className="absolute top-3 left-3 pointer-events-none">
                                            <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                                                <Pencil size={16} className="text-blue-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Pilih Produk dengan styling modern */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                                                <Package className="text-purple-600" size={18} />
                                            </div>
                                            <h3 className="text-base font-semibold text-slate-800">Pilih Produk</h3>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <input type="text" placeholder="Cari produk..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full p-4 pl-12 text-slate-700 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all duration-200" />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                                                <Search className="text-purple-600" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                    {produkList.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Package size={24} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium">Memuat produk...</p>
                                        </div>
                                    ) : sortedProdukList.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Search size={24} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium">Produk tidak ditemukan</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Filter Produk dengan styling modern */}
                                            <div className="flex items-center gap-2 p-1 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl">
                                                {['terlaris', 'abjad', 'tersedia'].map((filter) => (
                                                    <button key={filter} type="button" onClick={() => setProductSortBy(filter)} className={`flex-1 capitalize text-xs font-semibold py-2.5 rounded-xl transition-all duration-300 ${productSortBy === filter ? 'bg-white text-purple-700 shadow-md' : 'bg-transparent text-slate-500'}`}>
                                                        {filter === 'abjad' ? 'A-Z' : filter}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="space-y-4">
                                                {sortedProdukList.map((produk) => {
                                                    const qty = cart[produk.id] || 0;
                                                    const isAvailable = produk.available;
                                                    return (
                                                        <div key={produk.id} className={`rounded-2xl p-4 border transition-all duration-300 group ${qty > 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md' : 'bg-white/80 backdrop-blur-sm border-slate-200'} ${!isAvailable ? 'bg-slate-100 border-slate-200 opacity-60' : ''}`}>
                                                            <div className={`flex items-center gap-4 ${justAddedProductId === produk.id ? 'animate-pop' : ''}`}>
                                                                <div className="relative w-16 h-16 flex-shrink-0">
                                                                    <img
                                                                        src={produk.foto || 'https://via.placeholder.com/100?text=Produk'}
                                                                        alt={produk.nama}
                                                                        className={`w-full h-full object-cover rounded-xl shadow-sm transition-transform ${!isAvailable ? 'grayscale' : ''}`}
                                                                        onError={(e) => {
                                                                            e.target.src = 'https://via.placeholder.com/100?text=Produk';
                                                                        }}
                                                                    />
                                                                    {!isAvailable && (
                                                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                                                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">Habis</span>
                                                                        </div>
                                                                    )}
                                                                    {qty > 0 && (
                                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                                                            <span className="text-xs font-bold text-white">{qty}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-grow min-w-0">
                                                                    <h4 className={`font-bold text-sm text-slate-800 truncate ${!isAvailable ? 'line-through text-slate-500' : ''}`}>{produk.nama}</h4>
                                                                    <p className="text-sm text-slate-600 mt-1 font-medium">Rp{(produk.hargaPerBox || 0).toLocaleString('id-ID')} / box</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <button type="button" onClick={() => updateQty(produk.id, -1)} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-50 transition-all duration-200 focus-ring" disabled={qty === 0 || !isAvailable}>
                                                                        <Minus size={16} />
                                                                    </button>
                                                                    <span className="w-8 text-center font-bold text-lg text-purple-700">{qty}</span>
                                                                    <button type="button" onClick={() => updateQty(produk.id, 1)} className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-slate-300 transition-all duration-200 shadow-md focus-ring" disabled={!isAvailable}>
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

                            {/* Footer dengan styling modern */}
                            <div className="bg-white/80 backdrop-blur-sm py-4 px-5 border-t border-gray-200">
                                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-5 rounded-2xl border border-purple-200/50 mb-5 shadow-sm relative overflow-hidden">
                                    {/* Decorative background elements */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-indigo-200/30 rounded-full translate-y-8 -translate-x-8"></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center text-sm font-semibold text-purple-700 mb-3">
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                                Total Box
                                            </span>
                                            <span className="bg-purple-100 px-3 py-1 rounded-full font-bold animate-bounce">{getTotalBoxes()} box</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xl font-bold text-purple-800">
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                                Total Belanja
                                            </span>
                                            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl shadow-md transition-all duration-300">Rp{getGrandTotal().toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" form="order-form" disabled={submitting || !selectedTokoId} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg focus-ring group">
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            Simpan Order
                                            <CheckCircle2 size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showReceiptPreview && (
                <div className="fixed inset-0 z-[60] bg-gradient-to-br from-blue-900/20 via-indigo-900/20 to-purple-900/20 backdrop-blur-sm flex flex-col items-center justify-end p-4 transition-opacity duration-300 animate-fade-in" onClick={closePreview}>
                    <div className="relative w-full max-w-sm bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-3xl shadow-2xl p-4 transition-transform duration-300 transform translate-y-0 animate-scale-in border border-blue-200/50" onClick={(e) => e.stopPropagation()}>
                        <button onClick={closePreview} className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-white to-slate-100 rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:from-slate-100 hover:to-slate-200 transition-all duration-200 hover-scale focus-ring" aria-label="Tutup">
                            <X size={20} />
                        </button>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-inner min-h-[200px] flex items-center justify-center border border-slate-200">
                            {receiptLoading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center animate-pulse">
                                        <Download size={24} className="text-blue-600" />
                                    </div>
                                    <Loader text="Membuat resi..." />
                                </div>
                            ) : (
                                <img src={previewImageUrl} alt="Pratinjau Resi" className="w-full h-auto rounded-xl" />
                            )}
                        </div>
                        <div className="mt-4">
                            <button onClick={handleDownloadFromPreview} disabled={receiptLoading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-base hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover-lift hover-glow focus-ring disabled:opacity-50">
                                <Download size={20} />
                                Download Gambar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] bg-gradient-to-br from-red-900/20 via-orange-900/20 to-yellow-900/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-gradient-to-br from-white via-red-50/30 to-orange-50/30 rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-scale-in border border-red-200/50 relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-200/20 rounded-full -translate-y-12 translate-x-12"></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-200/20 rounded-full translate-y-10 -translate-x-10"></div>

                        <div className="text-center relative z-10">
                            <div className="w-20 h-20 mx-auto flex items-center justify-center bg-gradient-to-br from-red-100 to-orange-100 rounded-full shadow-lg animate-bounce">
                                <Trash2 size={36} className="text-red-600" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-800 gradient-text">Hapus Order?</h3>
                            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                                Anda akan menghapus order untuk <strong className="text-red-600 bg-red-100 px-2 py-1 rounded-full">{itemToDelete?.tokoNama}</strong>. Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-3 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl font-semibold hover:from-slate-200 hover:to-slate-300 transition-all duration-200 hover-lift focus-ring">
                                Batal
                            </button>
                            <button onClick={handleConfirmDelete} className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 hover-lift hover-glow focus-ring shadow-lg">
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
