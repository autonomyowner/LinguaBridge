import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TRAVoicesPage from './pages/TRAVoicesPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/translate" element={<TRAVoicesPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
