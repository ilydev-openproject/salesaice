// src/components/TokoCard.jsx
import { Pencil, Trash2, MessageSquare } from 'lucide-react';

export default function TokoCard({ toko, onHapus, onEdit }) {
    if (!toko) {
        return null;
    }

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:border-purple-200">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex-shrink-0 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xl">{toko.nama ? toko.nama.charAt(0).toUpperCase() : '?'}</span>
            </div>

            {/* Info Toko */}
            <div className="flex-grow space-y-1">
                <p className="font-bold text-slate-800 text-base leading-tight">{toko.nama || 'Nama Toko'}</p>
                <p className="text-xs text-slate-500">Kode: {toko.kode || '-'}</p>
                {toko.nomorWa && (
                    <a href={`https://wa.me/${toko.nomorWa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-green-700 mt-1 hover:underline">
                        <MessageSquare size={12} />
                        {toko.nomorWa}
                    </a>
                )}
            </div>

            {/* Tombol Aksi */}
            <div className="flex gap-2">
                <button onClick={onEdit} className="p-2 rounded-full text-blue-600 hover:bg-blue-100 transition-colors">
                    <Pencil size={18} />
                </button>
                <button onClick={onHapus} className="p-2 rounded-full text-red-600 hover:bg-red-100 transition-colors">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
