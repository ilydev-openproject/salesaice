// src/pages/RutePage.jsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Map, Navigation, Check, AlertTriangle, Loader2, Shuffle, ListOrdered } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import L from 'leaflet';

// Fix untuk ikon default Leaflet yang rusak di React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

// Fungsi untuk menghitung jarak antara dua titik koordinat (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi dalam km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Jarak dalam km
}

// Algoritma Nearest Neighbor untuk optimasi rute
function optimizeRoute(startPoint, waypoints) {
    if (waypoints.length === 0) return [startPoint];

    let unvisited = [...waypoints];
    let optimizedRoute = [startPoint];
    let currentPoint = startPoint;

    while (unvisited.length > 0) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        unvisited.forEach((point, index) => {
            const distance = getDistance(currentPoint.lat, currentPoint.lng, point.latitude, point.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = index;
            }
        });

        const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
        optimizedRoute.push(nearestPoint);
        currentPoint = { lat: nearestPoint.latitude, lng: nearestPoint.longitude };
    }

    return optimizedRoute;
}

// Komponen untuk mengintegrasikan Leaflet Routing Machine
const RoutingMachine = ({ waypoints }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || waypoints.length < 2) return;

        const routingControl = L.Routing.control({
            waypoints: waypoints.map((p) => L.latLng(p.lat, p.lng)),
            routeWhileDragging: true,
            show: false, // Sembunyikan panel instruksi
            addWaypoints: false, // Jangan izinkan user menambah titik
            lineOptions: {
                styles: [{ color: 'purple', opacity: 0.8, weight: 6 }],
            },
        }).addTo(map);

        return () => map.removeControl(routingControl);
    }, [map, waypoints]);

    return null;
};

export default function RutePage({ tokoList, setActivePage }) {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeWaypoints, setRouteWaypoints] = useState([]);
    const [locationError, setLocationError] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [optimized, setOptimized] = useState(true); // State untuk toggle optimasi

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

    useEffect(() => {
        if (!currentLocation) {
            return;
        }
        if (tokoHariIni.length === 0) {
            setRouteWaypoints([]);
            return;
        }

        const startPoint = { lat: currentLocation.lat, lng: currentLocation.lng, nama: 'Lokasi Anda' };
        let waypoints = [];

        if (optimized) {
            const optimizedPoints = optimizeRoute(startPoint, tokoHariIni);
            waypoints = optimizedPoints.map((p) => ({ lat: p.lat || p.latitude, lng: p.lng || p.longitude, nama: p.nama }));
        } else {
            waypoints = [startPoint, ...tokoHariIni].map((p) => ({ lat: p.lat || p.latitude, lng: p.lng || p.longitude, nama: p.nama }));
        }

        setRouteWaypoints(waypoints);
    }, [currentLocation, tokoList, optimized]); // Re-run saat lokasi, toko, atau mode optimasi berubah

    // Komponen untuk auto-fit bounds peta
    function ChangeView({ bounds }) {
        const map = useMap();
        if (bounds.length > 0) {
            map.fitBounds(
                bounds.map((p) => [p.lat, p.lng]),
                { padding: [50, 50] },
            );
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
                            <Popup>
                                <b>Lokasi Anda Saat Ini</b>
                            </Popup>
                        </Marker>
                        {tokoHariIni.map((toko) => (
                            <Marker key={toko.id} position={[toko.latitude, toko.longitude]}>
                                <Popup>
                                    <b>{toko.nama}</b>
                                </Popup>
                            </Marker>
                        ))}
                        {routeWaypoints.length > 1 && <RoutingMachine waypoints={routeWaypoints} />}
                        <ChangeView bounds={routeWaypoints.length > 0 ? routeWaypoints : [{ lat: currentLocation.lat, lng: currentLocation.lng }]} />
                    </MapContainer>
                ) : (
                    <div className="bg-slate-200 h-full w-full flex items-center justify-center text-slate-500">
                        <p>{loadingLocation ? 'Memuat Peta...' : 'Peta tidak tersedia'}</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-slate-800">Toko terjadwal ({routeWaypoints.length > 0 ? routeWaypoints.length - 1 : 0})</h2>
                    <button onClick={() => setOptimized(!optimized)} className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full hover:bg-purple-200 transition">
                        {optimized ? <ListOrdered size={14} /> : <Shuffle size={14} />}
                        {optimized ? 'Rute Terpendek' : 'Urutan Manual'}
                    </button>
                </div>
                <p className="text-xs text-slate-500 mb-3">Hanya toko dengan data GPS yang akan ditampilkan.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 -mr-2">
                    {routeWaypoints.length > 1 ? (
                        routeWaypoints.slice(1).map((waypoint, index) => (
                            <div key={index} className="bg-slate-50 p-2 rounded-lg flex items-center gap-3">
                                <span className="font-bold text-purple-600 text-sm w-5 text-center">{index + 1}</span>
                                <p className="text-sm font-medium text-slate-700">{waypoint.nama}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-center text-slate-400 py-4">Tidak ada toko terjadwal dengan data GPS untuk hari ini.</p>
                    )}
                </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-4">Rute di peta akan otomatis diperbarui. Rute terpendek adalah perkiraan dan mungkin bukan yang paling optimal.</p>
        </div>
    );
}
