import { FaUserMd, FaUserInjured, FaHospital, FaPills, FaCrown, FaStar, FaRegStar, FaCheck } from "react-icons/fa";
import { motion } from "framer-motion";
import Navbar from "../components/home/Navbar";
import Footer from "../components/home/Footer";

const ServicesPage = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const pricingPlans = [
    {
      title: "Basic Free",
      price: "$0",
      features: [
        "Basic health tracking",
        "Medication reminders",
        "General health tips",
        "Limited support"
      ],
      icon: <FaRegStar className="text-yellow-400" />,
      color: "from-gray-100 to-gray-200"
    },
    {
      title: "Premium",
      price: "$9.99/mo",
      features: [
        "Advanced health analytics",
        "Doctor consultations (2/month)",
        "Priority support",
        "Personalized health plans",
        "Hospital discount partners"
      ],
      icon: <FaStar className="text-yellow-400" />,
      color: "from-blue-100 to-blue-200"
    },
    {
      title: "Ultra Premium",
      price: "$24.99/mo",
      features: [
        "Unlimited doctor consultations",
        "24/7 emergency support",
        "Pharmacy discounts",
        "Annual health checkups",
        "Personal health assistant",
        "Family package (up to 5 members)"
      ],
      icon: <FaCrown className="text-yellow-400" />,
      color: "from-purple-100 to-purple-200"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 py-20 px-4 text-white">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-6xl mx-auto text-center"
          >
            <motion.h1 variants={fadeIn} className="text-4xl md:text-5xl font-bold mb-4">
              Our Healthcare Services
            </motion.h1>
            <motion.p variants={fadeIn} className="text-xl md:text-2xl max-w-3xl mx-auto">
              Tailored solutions for doctors, patients, hospitals, and pharmacies
            </motion.p>
          </motion.div>
        </div>

        {/* Services Grid */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {/* Doctor Service */}
            <motion.div
              variants={fadeIn}
              className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="bg-blue-600 p-6 text-white">
                <FaUserMd className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">For Doctors</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Patient management system</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>E-prescription tools</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Telemedicine platform</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Continuing medical education</span>
                  </li>
                </ul>
                <div className="mt-6 text-sm text-gray-500">
                  Starting from $49/month for individual practitioners
                </div>
              </div>
            </motion.div>

            {/* Patient Service */}
            <motion.div
              variants={fadeIn}
              className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="bg-green-600 p-6 text-white">
                <FaUserInjured className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">For Patients</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Personal health records</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Medication reminders</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Doctor appointment booking</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Health progress tracking</span>
                  </li>
                </ul>
                <div className="mt-6 text-sm text-gray-500">
                  Free basic plan available
                </div>
              </div>
            </motion.div>

            {/* Hospital Service */}
            <motion.div
              variants={fadeIn}
              className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="bg-purple-600 p-6 text-white">
                <FaHospital className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">For Hospitals</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Electronic Health Records</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Staff management system</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Inventory management</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Billing and insurance</span>
                  </li>
                </ul>
                <div className="mt-6 text-sm text-gray-500">
                  Custom pricing based on hospital size
                </div>
              </div>
            </motion.div>

            {/* Pharmacy Service */}
            <motion.div
              variants={fadeIn}
              className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
            >
              <div className="bg-red-600 p-6 text-white">
                <FaPills className="text-4xl mb-2" />
                <h3 className="text-2xl font-bold">For Pharmacies</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Inventory management</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Prescription verification</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Patient medication history</span>
                  </li>
                  <li className="flex items-start">
                    <FaCheck className="text-green-500 mt-1 mr-2" />
                    <span>Auto-refill reminders</span>
                  </li>
                </ul>
                <div className="mt-6 text-sm text-gray-500">
                  Starting from $29/month
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Pricing Section */}
        <div className="bg-gray-50 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Choose the plan that fits your needs
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  whileHover={{ y: -10 }}
                  className={`bg-gradient-to-br ${plan.color} rounded-xl shadow-lg overflow-hidden`}
                >
                  <div className="p-6 text-center">
                    <div className="flex justify-center text-3xl mb-2">
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
                    <div className="text-4xl font-bold mb-4">{plan.price}</div>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <FaCheck className="text-green-500 mt-1 mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button className={`w-full py-3 px-6 rounded-lg font-semibold ${
                      index === 0 ? "bg-gray-300 text-gray-800" : 
                      index === 1 ? "bg-blue-500 text-white" : 
                      "bg-purple-600 text-white"
                    } hover:opacity-90 transition-opacity`}>
                      {index === 0 ? "Get Started" : "Subscribe Now"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-green-600 py-16 px-4 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-6"
            >
              Ready to Transform Healthcare?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl mb-8"
            >
              Join thousands of healthcare providers and patients using Mediminders
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <button className="bg-white text-red-600 font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Get Started for Free
              </button>
              <button className="bg-transparent border-2 border-white px-8 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors">
                Contact Sales
              </button>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServicesPage;