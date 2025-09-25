// src/components/TokoCard.jsx
export default function TokoCard({ toko, onHapus }) {
    return (
        <div
            style={
                {
                    /* styling card */
                }
            }
        >
            <strong>{toko.nama}</strong>
            <div>Kode: {toko.kode}</div>
            <button
                onClick={onHapus}
                style={
                    {
                        /* tombol hapus */
                    }
                }
            >
                ✕
            </button>
        </div>
    );
}
