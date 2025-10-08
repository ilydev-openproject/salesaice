// src/pages/RutePage.jsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Map, Navigation, Check, AlertTriangle, Locate, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix untuk ikon default Leaflet yang rusak di React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export default function RutePage({ tokoList, setActivePage }) {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [locationError, setLocationError] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(true);

    // Ikon kustom untuk lokasi saat ini
    const currentLocationIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                    setLoadingLocation(false);
                },
                (error) => {
                    setLocationError('Gagal mendapatkan lokasi. Pastikan izin lokasi telah diberikan.');
                    console.error('Geolocation error:', error);
                    setLoadingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            );
        } else {
            setLocationError('Geolocation tidak didukung oleh browser ini.');
            setLoadingLocation(false);
        }
    }, []);

    const hariIni = HARI[new Date().getDay()];
    const tokoHariIni = tokoList.filter((toko) => toko.jadwalKunjungan?.includes(hariIni) && toko.latitude && toko.longitude);

    const showRoute = () => {
        if (!currentLocation) {
            alert('Lokasi saat ini tidak tersedia.');
            return;
        }
        if (tokoHariIni.length === 0) {
            alert('Tidak ada toko terjadwal untuk ditampilkan di rute.');
            return;
        }

        const coordinates = [[currentLocation.lat, currentLocation.lng], ...tokoHariIni.map((toko) => [toko.latitude, toko.longitude])];
        setRouteCoordinates(coordinates);
    };

    // Komponen untuk auto-fit bounds peta
    function ChangeView({ bounds }) {
        const map = useMap();
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        return null;
    }

    return (
        <div className="p-5 pb-20 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="flex items-center mb-6 relative">
                <button onClick={() => setActivePage('home')} className="p-2 rounded-full hover:bg-slate-100 absolute left-0">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-slate-800 flex-grow text-center flex items-center justify-center gap-2">
                    <Map className="text-purple-600" />
                    Rute Kunjungan Hari Ini
                </h1>
            </div>

            {loadingLocation && (
                <div className="flex items-center justify-center gap-2 text-slate-500 my-4">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Mencari lokasi Anda...</span>
                </div>
            )}
            {locationError && (
                <div className="bg-red-100 border border-red-300 text-red-800 text-sm font-semibold px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {locationError}
                </div>
            )}

            <div className="h-64 w-full rounded-xl shadow-lg overflow-hidden mb-4 border-2 border-white">
                {currentLocation ? (
                    <MapContainer center={[currentLocation.lat, currentLocation.lng]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentLocationIcon}>
                            <Popup>Lokasi Anda Saat Ini</Popup>
                        </Marker>
                        {tokoHariIni.map((toko) => (
                            <Marker key={toko.id} position={[toko.latitude, toko.longitude]}>
                                <Popup>{toko.nama}</Popup>
                            </Marker>
                        ))}
                        {routeCoordinates.length > 0 && <Polyline pathOptions={{ color: 'purple' }} positions={routeCoordinates} />}
                        <ChangeView bounds={routeCoordinates.length > 0 ? routeCoordinates : tokoHariIni.map((t) => [t.latitude, t.longitude])} />
                    </MapContainer>
                ) : (
                    <div className="bg-slate-200 h-full w-full flex items-center justify-center text-slate-500">
                        <p>{loadingLocation ? 'Memuat Peta...' : 'Peta tidak tersedia'}</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                <h2 className="font-bold text-slate-800">Toko terjadwal ({tokoHariIni.length})</h2>
                <p className="text-xs text-slate-500 mb-3">Hanya toko dengan data GPS yang akan ditampilkan.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {tokoHariIni.length > 0 ? (
                        tokoHariIni.map((toko) => (
                            <div key={toko.id} className="bg-slate-50 p-2 rounded-lg flex items-center gap-2">
                                <Check size={16} className="text-green-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-slate-700">{toko.nama}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-center text-slate-400 py-4">Tidak ada toko terjadwal dengan data GPS.</p>
                    )}
                </div>
            </div>

            <button onClick={showRoute} disabled={!currentLocation || tokoHariIni.length === 0 || loadingLocation} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-base hover:bg-purple-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-md">
                <Navigation size={20} />
                Tampilkan Rute di Peta
            </button>
        </div>
    );
}
