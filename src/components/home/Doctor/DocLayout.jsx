import React from 'react';
import DocDashboard from './DocDashboard';
import DoctorLayout from './DoctorLayout'; // ✅ Corrected casing here
import DashboardContent from './DashboardContent';
import Navbar from '../Navbar';
import Footer from '../Footer';

const DocLayout = () => {
  return (
    <div>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        {/* <DocDashboard /> */}
        <DoctorLayout />
        <DashboardContent />
        <Footer />
      </div>
    </div>
  );
};

export default DocLayout;
