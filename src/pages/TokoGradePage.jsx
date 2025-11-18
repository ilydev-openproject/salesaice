// src/pages/TokoGradePage.jsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowLeft, Award, Settings, X, Save, ShieldCheck, Shield, ShieldAlert, ShieldOff, Plus, Trash2, Palette, ChevronDown, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, format, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { id } from 'date-fns/locale';

// Komponen untuk merender ikon berdasarkan nama string
const GradeIcon = ({ iconName, className }) => {
    if (iconName === 'ShieldCheck') return <ShieldCheck className={className} />;
    if (iconName === 'Shield') return <Shield className={className} />;
    if (iconName === 'ShieldAlert') return <ShieldAlert className={className} />;
    if (iconName === 'ShieldOff') return <ShieldOff className={className} />;
    return <Shield className={className} />; // Fallback
};

// Helper untuk mendapatkan grade default atau dari localStorage
const getStoredGrades = () => {
    try {
        const stored = localStorage.getItem('storeGradesConfig');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Gagal memuat grade dari localStorage:', error);
    }
    // Default ke array kosong, user membuat grade dari nol
    return [];
};

// Komponen Modal Pengaturan Grade
const GradeSettingsModal = ({ isOpen, onClose, grades, setGrades, showNotification }) => {
    const [localGrades, setLocalGrades] = useState([]);
    const [activeColorPicker, setActiveColorPicker] = useState(null);

    const availableColors = ['bg-slate-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'];

    useEffect(() => {
        // Urutkan grade saat modal dibuka untuk konsistensi
        const sorted = [...grades].sort((a, b) => b.minBoxes - a.minBoxes);
        setLocalGrades(sorted);
    }, [grades, isOpen]);

    const handleMinBoxChange = (index, value) => {
        const newGrades = [...localGrades];
        newGrades[index].minBoxes = parseInt(value, 10) || 0;
        setLocalGrades(newGrades);
    };

    const handleNameChange = (index, value) => {
        const newGrades = [...localGrades];
        newGrades[index].name = value.toUpperCase();
        setLocalGrades(newGrades);
    };

    const handleColorChange = (index, value) => {
        const newGrades = [...localGrades];
        newGrades[index].color = value;
        setLocalGrades(newGrades);
        setActiveColorPicker(null);
    };

    const addGrade = () => {
        const newId = localGrades.length > 0 ? Math.max(...localGrades.map((g) => g.id)) + 1 : 1;
        const newGrade = { id: newId, name: 'BARU', minBoxes: 0, maxBoxes: Infinity, color: 'bg-purple-500', icon: 'ShieldCheck' };
        setLocalGrades([newGrade, ...localGrades].sort((a, b) => b.minBoxes - a.minBoxes));
    };

    const removeGrade = (index) => {
        const newGrades = localGrades.filter((_, i) => i !== index);
        setLocalGrades(newGrades);
    };

    const handleSave = () => {
        let sortedGrades = [...localGrades].sort((a, b) => b.minBoxes - a.minBoxes);

        // Validasi
        for (let i = 0; i < sortedGrades.length - 1; i++) {
            // Fix: Loop until the second to last element to avoid accessing undefined
            if (sortedGrades[i].minBoxes <= sortedGrades[i + 1].minBoxes) {
                showNotification(`Batas minimal Grade ${sortedGrades[i].name} harus lebih besar dari Grade ${sortedGrades[i + 1].name}.`, 'error');
                return;
            }
        }
        // Validasi nama tidak boleh kosong (dipisahkan agar tidak terpengaruh oleh fix di atas)
        for (let i = 0; i < sortedGrades.length; i++) {
            if (!sortedGrades[i].name.trim()) {
                showNotification('Nama grade tidak boleh kosong.', 'error');
                return;
            }
        }

        // Validasi grade terendah harus memiliki minBoxes = 0
        if (sortedGrades.length > 0 && sortedGrades[sortedGrades.length - 1].minBoxes !== 0) {
            showNotification('Grade terendah harus memiliki batas minimal 0 box.', 'error');
            // Otomatis set ke 0 jika user lupa
            sortedGrades[sortedGrades.length - 1].minBoxes = 0;
        }

        // Update maxBoxes berdasarkan minBoxes grade di atasnya
        const finalGrades = sortedGrades.map((grade, index) => {
            if (index === 0) {
                // Grade tertinggi
                return { ...grade, maxBoxes: Infinity };
            }
            // maxBoxes adalah minBoxes grade di atasnya dikurangi 1
            const max = sortedGrades[index - 1].minBoxes - 1;
            const assignedIconName = index < sortedGrades.length / 4 ? 'ShieldCheck' : index < sortedGrades.length / 2 ? 'Shield' : index < (sortedGrades.length * 3) / 4 ? 'ShieldAlert' : 'ShieldOff';
            return {
                ...grade,
                maxBoxes: Math.max(grade.minBoxes, max), // Pastikan max tidak lebih kecil dari min
                icon: assignedIconName,
            };
        });

        setGrades(finalGrades);
        localStorage.setItem('storeGradesConfig', JSON.stringify(finalGrades));
        showNotification('Pengaturan grade berhasil disimpan.', 'success');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-slate-800">Atur Grade Toko</h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">Atur nama, warna, dan batas minimal jumlah box per bulan untuk setiap tingkatan grade.</p>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    {localGrades.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border-2 border-dashed">
                            <Award size={40} className="mx-auto text-slate-400 mb-3" />
                            <h4 className="font-bold text-slate-700">Belum Ada Grade</h4>
                            <p className="text-xs text-slate-500 mt-1">Mulai dengan menambahkan grade pertama Anda untuk mengkategorikan toko.</p>
                        </div>
                    ) : (
                        localGrades.map((grade, index) => {
                            const maxBoxes = index === 0 ? '∞' : localGrades[index - 1].minBoxes - 1;
                            const isLowestGrade = index === localGrades.length - 1;

                            return (
                                <div key={grade.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input type="text" value={grade.name} onChange={(e) => handleNameChange(index, e.target.value)} className={`w-12 h-12 text-center rounded-lg ${grade.color} text-white font-bold text-lg border-2 border-white shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 outline-none`} />
                                            <button onClick={() => setActiveColorPicker(activeColorPicker === index ? null : index)} className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md border">
                                                <Palette size={12} className="text-slate-600" />
                                            </button>
                                            {activeColorPicker === index && (
                                                <div className="absolute z-10 top-full mt-2 w-48 bg-white p-2 rounded-lg shadow-xl border grid grid-cols-6 gap-1">
                                                    {availableColors.map((color) => (
                                                        <button key={color} onClick={() => handleColorChange(index, color)} className={`w-6 h-6 rounded-full ${color} hover:scale-110 transition-transform`}></button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs font-medium text-slate-600">Rentang Order (per bulan)</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <input type="number" value={grade.minBoxes} onChange={(e) => handleMinBoxChange(index, e.target.value)} className="w-20 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" disabled={isLowestGrade} />
                                                <span className="text-sm text-slate-500">s/d</span>
                                                <input type="text" value={isLowestGrade ? grade.minBoxes : maxBoxes} className="w-20 p-2 border border-slate-200 bg-slate-100 rounded-lg text-sm text-center text-slate-600" readOnly />
                                                <span className="text-sm text-slate-600">box</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => removeGrade(index)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <button onClick={addGrade} className="w-full py-2.5 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 transition-all">
                        <Plus size={16} />
                        Tambah Grade
                    </button>
                </div>

                <div className="p-6 mt-auto border-t border-slate-200">
                    <div className="mt-2">
                        <button onClick={handleSave} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-purple-700 transition-all shadow-lg hover:shadow-xl focus-ring">
                            <Save size={16} />
                            Simpan Pengaturan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function TokoGradePage({ setActivePage, tokoList, orderList, onModalChange, showNotification }) {
    const [grades, setGrades] = useState(getStoredGrades);
    const [showSettings, setShowSettings] = useState(false);
    // State baru untuk filter bulan
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    // State untuk dropdown kustom
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);

    const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');

    const [showMonthPicker, setShowMonthPicker] = useState(false);

    useEffect(() => {
        onModalChange(showSettings);
    }, [showSettings, onModalChange]);

    const tokoGrades = useMemo(() => {
        if (!grades || grades.length === 0) {
            return tokoList.map((toko) => ({
                ...toko,
                totalBoxes: 0,
                grade: { name: 'N/A', color: 'bg-slate-400', icon: 'ShieldOff' },
            }));
        }
        const monthStart = startOfMonth(selectedMonth);
        const monthEnd = endOfMonth(selectedMonth);
        const monthlySales = {}; // { tokoId: { 'YYYY-MM': totalBoxes } }

        orderList.forEach((order) => {
            if (!order.createdAt) return;
            const orderDate = new Date(order.createdAt);
            if (orderDate >= monthStart && orderDate <= monthEnd) {
                const totalBoxes = order.items?.reduce((sum, item) => sum + item.qtyBox, 0) || 0;
                monthlySales[order.tokoId] = (monthlySales[order.tokoId] || 0) + totalBoxes;
            }
        });

        return tokoList
            .map((toko) => {
                const totalBoxes = monthlySales[toko.id] || 0;

                const sortedGrades = [...grades].sort((a, b) => b.minBoxes - a.minBoxes);
                // Logika: cari grade berdasarkan rentang min dan max
                const assignedGrade =
                    sortedGrades.find((g, index) => {
                        const max = index === 0 ? Infinity : sortedGrades[index - 1].minBoxes - 0.01;
                        return totalBoxes >= g.minBoxes && totalBoxes <= max;
                    }) || sortedGrades[sortedGrades.length - 1]; // Fallback ke grade terendah

                return {
                    ...toko,
                    totalBoxes: Math.round(totalBoxes * 10) / 10,
                    grade: assignedGrade,
                };
            })
            .sort((a, b) => b.totalBoxes - a.totalBoxes);
    }, [tokoList, orderList, grades, selectedMonth]);

    const gradeSummary = useMemo(() => {
        if (!grades || grades.length === 0) {
            return [];
        }

        const summary = grades.reduce((acc, grade) => {
            acc[grade.name] = { ...grade, count: 0 };
            return acc;
        }, {});

        summary['N/A'] = { name: 'N/A', color: 'bg-slate-400', icon: 'ShieldOff', count: 0 };

        tokoGrades.forEach((toko) => {
            const gradeName = toko.grade?.name || 'N/A';
            if (summary[gradeName]) {
                summary[gradeName].count++;
            }
        });

        const sortedGrades = [...grades].sort((a, b) => b.minBoxes - a.minBoxes);
        const sortedSummary = sortedGrades.map((g) => summary[g.name]).filter(Boolean);

        return [{ name: 'all', color: 'bg-purple-600', icon: 'ShieldCheck', count: tokoGrades.length }, ...sortedSummary, ...(summary['N/A'].count > 0 ? [summary['N/A']] : [])];
    }, [tokoGrades, grades]);

    const handleOpenSettings = () => setShowSettings(true);
    const handleCloseSettings = () => setShowSettings(false);

    const handleSetGrades = useCallback((newGrades) => {
        setGrades(newGrades);
    }, []);

    return (
        <>
            <div className="max-w-md mx-auto pb-20">
                <div className="p-5">
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100">
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl shadow-sm">
                                    <Award className="text-yellow-600" size={20} />
                                </div>
                                <span className="gradient-text">Grade Toko</span>
                            </h2>
                        </div>
                        <button onClick={handleOpenSettings} className="p-2 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-100 transition-all">
                            <Settings size={20} className="text-slate-600" />
                        </button>
                    </div>

                    {/* Filter Bulan */}
                    <div className="relative mb-5">
                        <button onClick={() => setShowMonthPicker(!showMonthPicker)} className="w-full p-3 text-left bg-white border border-slate-200 rounded-xl flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all duration-200">
                            <span className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
                                    <Calendar size={16} className="text-purple-600" />
                                </div>
                                <span className="text-slate-700 font-medium text-sm">{format(selectedMonth, 'MMMM yyyy', { locale: id })}</span>
                            </span>
                            <ChevronDown size={20} className={`text-slate-400 transition-all duration-300 ${showMonthPicker ? 'rotate-180 text-purple-600' : ''}`} />
                        </button>
                        {showMonthPicker && (
                            <div className="absolute top-full mt-2 z-20 w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 p-4 animate-slide-in-top" onMouseLeave={() => setShowMonthPicker(false)} onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                                    {/* --- Dropdown Bulan Kustom --- */}
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-600">Bulan</label>
                                        <div className="relative mt-1">
                                            <button onClick={() => setShowMonthDropdown(!showMonthDropdown)} className="w-full p-2.5 text-left bg-white border border-slate-300 rounded-xl flex justify-between items-center text-sm">
                                                {format(selectedMonth, 'MMMM', { locale: id })}
                                                <ChevronDown size={16} className={`transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showMonthDropdown && (
                                                <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <li
                                                            key={i}
                                                            onClick={() => {
                                                                setSelectedMonth(setMonth(selectedMonth, i));
                                                                setShowMonthDropdown(false);
                                                            }}
                                                            className={`p-2 text-sm cursor-pointer hover:bg-purple-50 ${getMonth(selectedMonth) === i ? 'bg-purple-100 font-bold' : ''}`}
                                                        >
                                                            {format(new Date(0, i), 'MMMM', { locale: id })}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* --- Dropdown Tahun Kustom --- */}
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-600">Tahun</label>
                                        <div className="relative mt-1">
                                            <button onClick={() => setShowYearDropdown(!showYearDropdown)} className="w-full p-2.5 text-left bg-white border border-slate-300 rounded-xl flex justify-between items-center text-sm">
                                                {getYear(selectedMonth)}
                                                <ChevronDown size={16} className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showYearDropdown && (
                                                <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {Array.from({ length: new Date().getFullYear() - 2020 + 2 }).map((_, i) => {
                                                        const year = 2020 + i;
                                                        return (
                                                            <li
                                                                key={year}
                                                                onClick={() => {
                                                                    setSelectedMonth(setYear(selectedMonth, year));
                                                                    setShowYearDropdown(false);
                                                                }}
                                                                className={`p-2 text-sm cursor-pointer hover:bg-purple-50 ${getYear(selectedMonth) === year ? 'bg-purple-100 font-bold' : ''}`}
                                                            >
                                                                {year}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filter Grade Cards */}
                    {grades.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {gradeSummary.map((summary) => (
                                    <button key={summary.name} onClick={() => setSelectedGradeFilter(summary.name)} className={`flex-shrink-0 flex items-center gap-2 p-2 rounded-xl border transition-all duration-200 ${selectedGradeFilter === summary.name ? 'bg-white shadow-lg border-purple-400' : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${summary.color}`}>
                                            <GradeIcon iconName={summary.icon} className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-700">{summary.name === 'all' ? 'Semua' : `Grade ${summary.name}`}</p>
                                            <p className="text-xs text-slate-500">{summary.count} Toko</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {grades.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed">
                            <Award size={40} className="mx-auto text-slate-400 mb-3" />
                            <h4 className="font-bold text-slate-700">Atur Grade Terlebih Dahulu</h4>
                            <p className="text-xs text-slate-500 mt-1 px-4">
                                Klik ikon <Settings size={14} className="inline-block -mt-1" /> di pojok kanan atas untuk membuat grade toko.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tokoGrades
                                .filter((toko) => selectedGradeFilter === 'all' || toko.grade.name === selectedGradeFilter)
                                .map((toko, index) => (
                                    <div key={toko.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-3 flex items-center gap-4 transition-all hover:shadow-md hover:border-purple-200">
                                        <div className="text-slate-400 font-bold text-lg w-6 text-center">{index + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{toko.nama}</p>
                                            {toko.grade.name !== 'N/A' && (
                                                <p className="text-xs text-slate-500">
                                                    Total: <span className="font-semibold text-purple-700">{toko.totalBoxes} box</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white font-bold text-xs ${toko.grade.color}`}>
                                            <GradeIcon iconName={toko.grade.icon} className="w-4 h-4" />
                                            <span>Grade {toko.grade.name}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            <GradeSettingsModal isOpen={showSettings} onClose={handleCloseSettings} grades={grades} setGrades={handleSetGrades} showNotification={showNotification} />
        </>
    );
}
