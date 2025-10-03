import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'quill/dist/quill.snow.css';
import './styles.css';  
createRoot(document.getElementById('root')).render(<App />);
