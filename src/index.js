import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

// Setup Axios once here
axios.defaults.headers = { Accept: 'application/json' };
const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_BASE_URL
});
console.log('axiosInstance: ' + axiosInstance);
export default axiosInstance;

// Find all widget divs
const widgetDivs = document.querySelectorAll('.nicoraynaud-finance-widget');

// Inject our React App into each class
widgetDivs.forEach(div => {
    const root = createRoot(div); // Create a new root for each widget div
    root.render(
        <React.StrictMode>
            <App symbol={div.dataset.symbol} />
        </React.StrictMode>
    );
});