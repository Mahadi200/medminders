import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import Contact from './pages/Contact';
import DoctorAuth from './components/home/DoctorAuth';
import DocLayout from './components/home/Doctor/DocLayout';

import MediMindersLoader from './components/home/MediMindersLoader'; // Make sure to create this component
import PatientDashboard from './components/home/Patient/PatientDashboard';
import MedMindersHospitalDashboard from './components/home/Hospital/MedMindersHospitalDashboard';
import PharmacyDashboard from './components/home/Pharmacy/PharmacyDashboard'; 

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
    path: "/DoctorAuth",
    element: <DoctorAuth/>,
    
  },
  {
        path : "/doctor-layout",
        element: <DocLayout/>,
  },
  {
        path : "/patient-login",
        element: <PatientDashboard/>,
  },
  {
        path : "/hospital-login",
        element: <MedMindersHospitalDashboard/>,
  }
  ,
  {
        path : "/pharmacy-login",
        element: <PharmacyDashboard/>,
  }
]);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time (replace with actual loading logic)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {isLoading ? (
        <MediMindersLoader />
      ) : (
        <RouterProvider router={router} />
      )}
    </>
  );
}

export default App;