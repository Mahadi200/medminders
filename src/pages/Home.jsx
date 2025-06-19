import React from 'react';
import Navbar from '../components/home/Navbar';
import HeroHelpDesk from '../components/home/HeroHelpDesk';
import DoctorsSection from '../components/home/DoctorsSection';
import Footer from '../components/home/Footer';




const Home = () => {
  return (
    <div>
        <Navbar/>
       <HeroHelpDesk/>
        <DoctorsSection/>


        <Footer/>
        
      
    </div>
  )
}

export default Home
