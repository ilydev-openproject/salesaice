import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './loader.css'; // Tambahkan CSS loader
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'; // Tambahkan CSS untuk rute
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
