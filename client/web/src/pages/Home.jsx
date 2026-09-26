import React from 'react';
import Navbar from '../components/home/Navbar';
import HeroHelpDesk from '../components/home/HeroHelpDesk';
import PatientFeedback from '../components/home/PatientFeedback';
import DoctorsSection from '../components/home/DoctorsSection';
import Footer from '../components/home/Footer';




const Home = () => {
  return (
    <div>
        <Navbar/>
        <HeroHelpDesk/>
        <PatientFeedback/>
        <DoctorsSection/>


        <Footer/>
        
      
    </div>
  )
}

export default Home
