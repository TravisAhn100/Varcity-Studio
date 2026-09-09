import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../app/page';
import '../app/globals.css';
import '../app/workflow.css';
import '../app/embroidery.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
