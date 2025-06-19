import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import DoctorAuth from './components/home/DoctorAuth';
import MediMindersLoader from './components/home/MediMindersLoader'; // Make sure to create this component

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
    path: "/DoctorAuth",
    element: <DoctorAuth/>,
  },
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