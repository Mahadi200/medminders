import React from 'react';
import Navbar from '../components/home/Navbar';
import Hero from '../components/home/Hero';
import DoctorsSection from '../components/home/DoctorsSection';
import Footer from '../components/home/Footer';



const Home = () => {
  return (
    <div>
        <Navbar/>
        <Hero/>
        <DoctorsSection/>


        <Footer/>
        
      
    </div>
  )
}

export default Home
