import React, { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import Contact from './pages/Contact';
import DoctorAuth from './components/home/DoctorAuth';
import DocLayout from './components/home/Doctor/DocLayout';

import PatientDashboard from './components/home/Patient/PatientDashboard';
import MedMindersHospitalDashboard from './components/home/Hospital/MedMindersHospitalDashboard';
import PharmacyDashboard from './components/home/Pharmacy/PharmacyDashboard'; 
import { AppPreferencesProvider } from './context/AppPreferences';
import ConnectedPortal from './pages/ConnectedPortal';
import AmrAwareness from './pages/AmrAwareness';
import TeamPage from './pages/TeamPage';
import MediMindersLoader from './components/home/MediMindersLoader';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home/>,
  },
  {
    path: "/about",
    element: <AboutPage/>,
  },
  {
    path: "/service",
    element: <ServicesPage/>,
  },
  {
    path: "/contact",
    element:<Contact/>,
  },
  {
    path: "/amr-awareness",
    element: <AmrAwareness/>,
  },
  { path: "/team", element: <TeamPage/> },
  {
    path: "/DoctorAuth",
    element: <ConnectedPortal/>,
    
  },
  {
        path : "/doctor-layout",
        element: <ConnectedPortal/>,
  },
  {
        path : "/patient-login",
        element: <ConnectedPortal/>,
  },
  { path: "/patient-register", element: <ConnectedPortal/> },
  { path: "/patient-otp", element: <ConnectedPortal/> },
  { path: "/patient-claim", element: <ConnectedPortal/> },
  { path: "/doctor-login", element: <ConnectedPortal/> },
  { path: "/doctor-register", element: <ConnectedPortal/> },
  {
        path : "/hospital-login",
        element: <ConnectedPortal/>,
  }
  ,
  {
        path : "/pharmacy-login",
        element: <ConnectedPortal/>,
  }
  ,
  { path: "/pharmacy-register", element: <ConnectedPortal/> }
]);

const App = () => {
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <AppPreferencesProvider>
      {booting && <MediMindersLoader />}
      <RouterProvider router={router} />
    </AppPreferencesProvider>
  );
}

export default App;
