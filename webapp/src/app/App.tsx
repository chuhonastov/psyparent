import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import ToastHost from '../components/ToastHost';
import Home from '../pages/Home';
import Diagnoses from '../pages/Diagnoses';
import DiagnosisGroup from '../pages/DiagnosisGroup';
import DiagnosisDetail from '../pages/DiagnosisDetail';
import Medications from '../pages/Medications';
import MedicationGroup from '../pages/MedicationGroup';
import MedicationDetail from '../pages/MedicationDetail';
import VisitSheet from '../pages/VisitSheet';
import { initTwa } from '../lib/twa';

export default function App() {
  useEffect(() => {
    initTwa();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/diagnoses" element={<Diagnoses />} />
        <Route path="/diagnoses/group/:id" element={<DiagnosisGroup />} />
        <Route path="/diagnoses/:id" element={<DiagnosisDetail />} />

        <Route path="/medications" element={<Medications />} />
        <Route path="/medications/group/:id" element={<MedicationGroup />} />
        <Route path="/medications/:id" element={<MedicationDetail />} />

        <Route path="/visit" element={<VisitSheet />} />
      </Routes>

      <ToastHost />
      <BottomNav />
    </>
  );
}
