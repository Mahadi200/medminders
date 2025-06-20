import { useState, useEffect } from 'react';
import { 
  FaPrescriptionBottle, FaPills, FaSearch, 
  FaChartLine, FaBoxOpen, FaExclamationTriangle,
  FaShoppingCart, FaUserInjured, FaFileInvoiceDollar
} from 'react-icons/fa';
import { MdLocalPharmacy, MdPayment, MdInventory } from 'react-icons/md';
import { GiMedicinePills, GiMedicines } from 'react-icons/gi';
import { motion } from 'framer-motion';

import Navbar from '../Navbar'
import Footer from '../Footer'

const PharmacyDashboard = () => {
  // State for search functionality
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  
  // Mock data
  const [prescriptions, setPrescriptions] = useState([
    { 
      id: 'RX-2023-06541', 
      patient: 'Mohammad Rahman', 
      doctor: 'Dr. Fatima Begum', 
      date: '2023-06-15',
      items: [
        { name: 'Ciprofloxacin 500mg', quantity: 14, price: 350 },
        { name: 'Paracetamol 500mg', quantity: 20, price: 100 }
      ],
      total: 450,
      status: 'Pending'
    },
    { 
      id: 'RX-2023-06542', 
      patient: 'Ayesha Siddiqua', 
      doctor: 'Dr. Abdullah Khan', 
      date: '2023-06-15',
      items: [
        { name: 'Metformin 850mg', quantity: 30, price: 250 },
        { name: 'Atorvastatin 20mg', quantity: 30, price: 300 }
      ],
      total: 550,
      status: 'Ready'
    },
    { 
      id: 'RX-2023-06540', 
      patient: 'Abdul Kalam', 
      doctor: 'Dr. Sakib Rahman', 
      date: '2023-06-14',
      items: [
        { name: 'Amlodipine 5mg', quantity: 30, price: 200 },
        { name: 'Losartan 50mg', quantity: 30, price: 180 }
      ],
      total: 380,
      status: 'Dispensed'
    }
  ]);

  const [inventory, setInventory] = useState([
    { id: 1, name: 'Ciprofloxacin 500mg', stock: 42, threshold: 50, price: 25, category: 'Antibiotic' },
    { id: 2, name: 'Metformin 850mg', stock: 125, threshold: 30, price: 8.33, category: 'Diabetes' },
    { id: 3, name: 'Atorvastatin 20mg', stock: 88, threshold: 40, price: 10, category: 'Cardiology' },
    { id: 4, name: 'Paracetamol 500mg', stock: 15, threshold: 20, price: 5, category: 'Analgesic' },
    { id: 5, name: 'Amlodipine 5mg', stock: 62, threshold: 30, price: 6.67, category: 'Hypertension' }
  ]);

  const [antibioticAlerts, setAntibioticAlerts] = useState([
    { id: 1, patient: 'Mohammad Rahman', medicine: 'Ciprofloxacin', daysRemaining: 3, message: 'Complete full 7-day course' },
    { id: 2, patient: 'Rahima Begum', medicine: 'Amoxicillin', daysRemaining: 1, message: 'Last dose tomorrow' }
  ]);

  // Filter prescriptions and medicines based on search
  const filteredPrescriptions = prescriptions.filter(prescription => 
    prescription.patient.toLowerCase().includes(prescriptionSearch.toLowerCase()) ||
    prescription.id.toLowerCase().includes(prescriptionSearch.toLowerCase())
  );
  
  const filteredMedicines = inventory.filter(medicine => 
    medicine.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    medicine.category.toLowerCase().includes(medicineSearch.toLowerCase())
  );

  // Calculate inventory stats
  const inventoryStats = {
    totalItems: inventory.length,
    lowStock: inventory.filter(item => item.stock < item.threshold).length,
    antibiotics: inventory.filter(item => item.category === 'Antibiotic').length
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-gray-100">
        <Navbar/>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-teal-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <MdLocalPharmacy className="text-3xl" />
            <h1 className="text-2xl font-bold">MedMinders Pharmacy ERP</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Quick search..."
                className="bg-white bg-opacity-20 px-4 py-2 rounded-lg text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <FaSearch className="absolute right-3 top-3 text-blue-100" />
            </div>
            <div className="flex items-center space-x-2">
              <img 
                src="https://randomuser.me/api/portraits/women/65.jpg" 
                alt="Pharmacist" 
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <span className="font-medium">Pharmacist</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Inventory Summary */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <MdInventory className="mr-2 text-blue-600" />
              Inventory Summary
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total Medicines</p>
                <p className="text-xl font-bold">{inventoryStats.totalItems}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-xl font-bold">{inventoryStats.lowStock}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Antibiotics</p>
                <p className="text-xl font-bold">{inventoryStats.antibiotics}</p>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-100 text-blue-800 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors">
              View Inventory
            </button>
          </motion.div>

          {/* Antibiotic Awareness */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <FaExclamationTriangle className="mr-2 text-red-600" />
              Antibiotic Alerts
            </h2>
            <div className="space-y-3">
              {antibioticAlerts.map(alert => (
                <div key={alert.id} className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                  <p className="font-medium">{alert.patient}</p>
                  <p className="text-sm">{alert.medicine} - {alert.message}</p>
                  <p className="text-xs mt-1 text-red-700">{alert.daysRemaining} days remaining</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 bg-red-100 text-red-800 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors">
              View All Alerts
            </button>
          </motion.div>
        </div>

        {/* Main Dashboard Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Prescription Management */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center">
                <FaPrescriptionBottle className="mr-2" />
                Prescription Management
              </h2>
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search prescriptions..."
                  className="w-full bg-white bg-opacity-20 px-4 py-2 rounded-lg text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white"
                  value={prescriptionSearch}
                  onChange={(e) => setPrescriptionSearch(e.target.value)}
                />
                <FaSearch className="absolute right-3 top-3 text-blue-100" />
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button className="bg-blue-100 text-blue-800 p-3 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                  <FaUserInjured className="mr-2" />
                  New Prescription
                </button>
                <button className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors">
                  <FaFileInvoiceDollar className="mr-2" />
                  Quick Billing
                </button>
                <button className="bg-purple-100 text-purple-800 p-3 rounded-lg flex items-center justify-center hover:bg-purple-200 transition-colors">
                  <FaSearch className="mr-2" />
                  Patient History
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prescription ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPrescriptions.map(prescription => (
                      <tr key={prescription.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{prescription.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{prescription.patient}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{prescription.doctor}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {prescription.items.map((item, i) => (
                              <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {item.name} ×{item.quantity}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">৳{prescription.total}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            prescription.status === 'Dispensed' ? 'bg-green-100 text-green-800' :
                            prescription.status === 'Ready' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {prescription.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {prescription.status === 'Pending' ? (
                            <button className="text-green-600 hover:text-green-900">Process</button>
                          ) : prescription.status === 'Ready' ? (
                            <button className="text-purple-600 hover:text-purple-900">Dispense</button>
                          ) : (
                            <button className="text-blue-600 hover:text-blue-900">Receipt</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Medicine Inventory & POS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medicine Inventory */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center">
                  <GiMedicinePills className="mr-2" />
                  Medicine Inventory
                </h2>
                <div className="relative w-48">
                  <input
                    type="text"
                    placeholder="Search medicines..."
                    className="w-full bg-white bg-opacity-20 px-4 py-2 rounded-lg text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white"
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                  />
                  <FaSearch className="absolute right-3 top-3 text-blue-100" />
                </div>
              </div>
              <div className="p-4">
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredMedicines.map(medicine => (
                        <tr key={medicine.id} className={`hover:bg-gray-50 ${
                          medicine.stock < medicine.threshold ? 'bg-red-50' : ''
                        }`}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{medicine.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`w-3 h-3 rounded-full mr-2 ${
                                medicine.stock < medicine.threshold ? 'bg-red-500' : 'bg-green-500'
                              }`}></span>
                              {medicine.stock} {medicine.stock < medicine.threshold && '(Low)'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">৳{medicine.price.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              medicine.category === 'Antibiotic' ? 'bg-red-100 text-red-800' :
                              medicine.category === 'Diabetes' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {medicine.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="w-full mt-4 bg-blue-100 text-blue-800 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors">
                  Manage Inventory
                </button>
              </div>
            </motion.div>

            {/* Point of Sale (POS) */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-4 text-white">
                <h2 className="text-xl font-bold flex items-center">
                  <MdPayment className="mr-2" />
                  Point of Sale (POS)
                </h2>
              </div>
              <div className="p-4">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Current Sale</h3>
                    <span className="text-sm text-gray-500">#POS-{new Date().getTime().toString().slice(-6)}</span>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <div>
                        <p className="font-medium">Ciprofloxacin 500mg</p>
                        <p className="text-sm text-gray-500">1 × ৳25.00</p>
                      </div>
                      <span className="font-medium">৳25.00</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <div>
                        <p className="font-medium">Paracetamol 500mg</p>
                        <p className="text-sm text-gray-500">2 × ৳5.00</p>
                      </div>
                      <span className="font-medium">৳10.00</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-1">
                      <span>Subtotal:</span>
                      <span>৳35.00</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Discount:</span>
                      <span>৳0.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>৳35.00</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button className="bg-blue-100 text-blue-800 p-3 rounded-lg flex items-center justify-center hover:bg-blue-200 transition-colors">
                    <FaSearch className="mr-2" />
                    Add Medicine
                  </button>
                  <button className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors">
                    <FaShoppingCart className="mr-2" />
                    Checkout
                  </button>
                  <button className="bg-purple-100 text-purple-800 p-3 rounded-lg flex items-center justify-center hover:bg-purple-200 transition-colors">
                    <FaUserInjured className="mr-2" />
                    Patient Lookup
                  </button>
                  <button className="bg-red-100 text-red-800 p-3 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors">
                    <FaExclamationTriangle className="mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer/>
    </div>
  );
};

export default PharmacyDashboard;