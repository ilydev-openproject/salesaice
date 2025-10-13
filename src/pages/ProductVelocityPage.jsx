import { useState, useMemo } from 'react';
import { ArrowLeft, Zap, BarChart2, Store, ChevronDown, CheckCircle2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';

export default function ProductVelocityPage({ tokoList, orderList, setActivePage }) {
    const [selectedTokoId, setSelectedTokoId] = useState('');
    const [isTokoDropdownOpen, setIsTokoDropdownOpen] = useState(false);
    const [tokoSearchTerm, setTokoSearchTerm] = useState('');

    const handleSelectToko = (tokoId) => {
        setSelectedTokoId(tokoId);
        setIsTokoDropdownOpen(false);
        setTokoSearchTerm('');
    };

    const velocityData = useMemo(() => {
        if (!selectedTokoId) return [];

        const ordersForToko = orderList.filter((o) => o.tokoId === selectedTokoId && o.items?.length > 0).sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);

        const productOrders = new Map();

        ordersForToko.forEach((order) => {
            order.items.forEach((item) => {
                if (!productOrders.has(item.productId)) {
                    productOrders.set(item.productId, {
                        name: item.nama,
                        dates: [],
                    });
                }
                productOrders.get(item.productId).dates.push(new Date(order.createdAt.seconds * 1000));
            });
        });

        const analysis = [];
        productOrders.forEach((data, productId) => {
            if (data.dates.length > 1) {
                const diffs = [];
                for (let i = 1; i < data.dates.length; i++) {
                    const diff = differenceInDays(data.dates[i], data.dates[i - 1]);
                    if (diff > 0) {
                        diffs.push(diff);
                    }
                }

                if (diffs.length > 0) {
                    const avgDays = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                    analysis.push({
                        productId,
                        name: data.name,
                        avgDays: parseFloat(avgDays.toFixed(1)),
                        orderCount: data.dates.length,
                    });
                }
            }
        });

        return analysis.sort((a, b) => a.avgDays - b.avgDays);
    }, [selectedTokoId, orderList]);

    const getVelocityStatus = (days) => {
        if (days <= 7) return { text: 'Sangat Cepat', color: 'bg-red-100 text-red-800 border-red-200' };
        if (days <= 14) return { text: 'Cepat', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        if (days <= 30) return { text: 'Standar', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
        return { text: 'Lambat', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    };

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="flex items-center mb-6 relative">
                <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-slate-800 flex-grow text-center flex items-center justify-center gap-2">
                    <Zap className="text-purple-600" />
                    Kecepatan Produk
                </h2>
            </div>

            {/* Pilih Toko */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Toko untuk Dianalisis</label>
                <div className="relative">
                    <button type="button" onClick={() => setIsTokoDropdownOpen(!isTokoDropdownOpen)} className="w-full p-3 text-left bg-white border border-gray-300 rounded-lg flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-purple-500">
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
                            <div className="max-h-60 overflow-y-auto">
                                {tokoList
                                    .filter((t) => t.nama.toLowerCase().includes(tokoSearchTerm.toLowerCase()))
                                    .sort((a, b) => a.nama.localeCompare(b.nama))
                                    .map((toko) => (
                                        <div key={toko.id} onClick={() => handleSelectToko(toko.id)} className={`p-3 cursor-pointer hover:bg-purple-50 flex justify-between items-center ${selectedTokoId === toko.id ? 'bg-purple-100 font-semibold' : ''}`}>
                                            <span>{toko.nama}</span>
                                            {selectedTokoId === toko.id && <CheckCircle2 size={16} className="text-purple-600" />}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hasil Analisis */}
            {!selectedTokoId ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                    <BarChart2 size={40} className="mx-auto text-gray-400 mb-2" />
                    Pilih toko untuk melihat analisis.
                </div>
            ) : velocityData.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-lg">
                    <BarChart2 size={40} className="mx-auto text-gray-400 mb-2" />
                    Tidak ada data order ulang untuk toko ini.
                </div>
            ) : (
                <div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                        <h3 className="text-base font-bold text-slate-700 mb-4">Grafik Kecepatan Produk (Hari)</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={velocityData} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 12 }}>
                                        <Label value="Rata-rata Hari" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                                    </YAxis>
                                    <Tooltip cursor={{ fill: 'rgba(233, 213, 255, 0.4)' }} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid #ddd', borderRadius: '8px' }} labelStyle={{ fontWeight: 'bold', color: '#333' }} formatter={(value) => [`${value} hari`, 'Rata-rata']} />
                                    <Bar dataKey="avgDays" name="Rata-rata Hari" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {velocityData.map((item, index) => {
                            const status = getVelocityStatus(item.avgDays);
                            return (
                                <div key={item.productId} className={`bg-white rounded-xl p-3 border ${status.color} shadow-sm`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-center font-bold text-slate-400 w-8 flex-shrink-0">{index + 1}.</div>
                                        <div className="flex-grow">
                                            <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                                            <p className={`text-xs font-semibold px-2 py-0.5 mt-1 rounded-full inline-block ${status.color}`}>{status.text}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-purple-700">
                                                {item.avgDays} <span className="text-sm font-normal text-slate-500">hari</span>
                                            </p>
                                            <p className="text-xs text-slate-500">rata-rata order ulang</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
