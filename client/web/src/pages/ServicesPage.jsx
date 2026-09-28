import { FaUserMd, FaUserInjured, FaHospital, FaPills, FaShieldAlt, FaChartLine, FaMobileAlt, FaCalendarAlt, FaFileMedicalAlt, FaClipboardCheck, FaMoneyBillWave } from "react-icons/fa";
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

  const stakeholderGroups = [
    {
      id: "doctors",
      title: "For Healthcare Providers",
      icon: <FaUserMd className="text-4xl" />,
      color: "from-blue-500 to-blue-700",
      benefits: [
        "✓ Streamlined patient management",
        "✓ Digital prescription workflow",
        "✓ 40% faster consultations",
        "✓ Integrated medical records",
        "✓ Continuing education credits"
      ],
      cta: "Start 30-Day Free Trial",
      testimonial: "Medminders reduced my admin time by 60% - now I focus on patients, not paperwork."
    },
    {
      id: "hospitals",
      title: "For Hospital Administrators",
      icon: <FaHospital className="text-4xl" />,
      color: "from-purple-500 to-purple-700",
      benefits: [
        "✓ Centralized patient data",
        "✓ 30% reduction in readmissions",
        "✓ Real-time bed management",
        "✓ Automated billing systems",
        "✓ Compliance tracking"
      ],
      cta: "Request Enterprise Demo",
      testimonial: "Our ICU efficiency improved by 45% within 3 months of implementation."
    },
    {
      id: "pharma",
      title: "For Pharmaceutical Leaders",
      icon: <FaPills className="text-4xl" />,
      color: "from-green-500 to-green-700",
      benefits: [
        "✓ Medication adherence tracking",
        "✓ Direct provider communication",
        "✓ Real-world evidence collection",
        "✓ Targeted health campaigns",
        "✓ Supply chain analytics"
      ],
      cta: "Explore Partnership Options",
      testimonial: "Gained 25% better insights into prescription patterns across Bangladesh."
    },
    {
      id: "patients",
      title: "For Patients & Families",
      icon: <FaUserInjured className="text-4xl" />,
      color: "from-red-500 to-red-700",
      benefits: [
        "✓ Medication reminders (90% effective)",
        "✓ Instant doctor access",
        "✓ Digital health records",
        "✓ Family health tracking",
        "✓ Emergency support"
      ],
      cta: "Download Free App",
      testimonial: "My mother's diabetes management improved dramatically with dose reminders."
    }
  ];

  const valueMetrics = [
    { icon: <FaCalendarAlt />, value: "50K+", label: "Monthly Consultations" },
    { icon: <FaFileMedicalAlt />, value: "1.2M", label: "Prescriptions Processed" },
    { icon: <FaClipboardCheck />, value: "92%", label: "Adherence Rate" },
    { icon: <FaMoneyBillWave />, value: "৳250M", label: "Client Savings" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 py-20 px-4 text-white">
          <div className="max-w-6xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              Bangladesh's Most Trusted Healthcare Platform
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl max-w-3xl mx-auto mb-8"
            >
              Specialized solutions for every healthcare stakeholder
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <button className="bg-white text-blue-600 font-bold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors shadow-lg">
                Book Demo
              </button>
              <button className="bg-transparent border-2 border-white px-8 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors">
                View Pricing
              </button>
            </motion.div>
          </div>
        </div>

        {/* Value Metrics */}
        <div className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {valueMetrics.map((metric, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  className="bg-gray-50 p-6 rounded-xl text-center hover:shadow-lg transition-shadow"
                >
                  <div className="text-blue-600 text-3xl mb-4 flex justify-center">
                    {metric.icon}
                  </div>
                  <h3 className="text-3xl font-bold mb-2">{metric.value}</h3>
                  <p className="text-gray-600">{metric.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Stakeholder Solutions */}
        <div className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-16"
            >
              Tailored Solutions for Your Needs
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {stakeholderGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-gradient-to-br ${group.color} text-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow`}
                >
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="bg-amber-300 bg-opacity-20 p-3 rounded-full mr-4">
                        {group.icon}
                      </div>
                      <h3 className="text-2xl font-bold">{group.title}</h3>
                    </div>
                    
                    <ul className="space-y-3 mb-8">
                      {group.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mb-6 p-4 bg-cyan-500 bg-opacity-10 rounded-lg">
                      <p className="italic">"{group.testimonial}"</p>
                    </div>
                    
                    <button className="w-full bg-amber-200 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                      {group.cta}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion Section */}
        <div className="py-20 px-4 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-6"
            >
              Ready to Transform Healthcare Delivery?
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className=" bg-amber-400 bg-opacity-10 p-3 rounded-lg">
                  <p className="font-semibold">For Individuals</p>
                  <p className="text-sm">৳200-500/month</p>
                </div>
                <div className="bg-amber-400 bg-opacity-10 p-3 rounded-lg">
                  <p className="font-semibold">For Clinics</p>
                  <p className="text-sm">৳5,000-15,000/month</p>
                </div>
                <div className="bg-amber-400 bg-opacity-10 p-3 rounded-lg">
                  <p className="font-semibold">Enterprise</p>
                  <p className="text-sm">Custom Pricing</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <button className="bg-white text-blue-800 font-bold px-8 py-4 rounded-lg hover:bg-amber-400 transition-colors text-lg">
                Get Started Today
              </button>
              <button className="bg-transparent border-2 border-white px-8 py-4 rounded-lg hover:bg-amber-400 hover:bg-opacity-10 transition-colors text-lg">
                Compare Plans
              </button>
            </motion.div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              Trusted By Leading Healthcare Organizations
            </motion.h2>
            
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {[
                { name: "Dhaka Medical College", logo: "DMC" },
                { name: "Square Pharmaceuticals", logo: "SQUARE" },
                { name: "Bangladesh Medical Association", logo: "BMA" },
                { name: "Popular Diagnostics", logo: "POPULAR" }
              ].map((org, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  className="bg-gray-50 p-6 rounded-xl text-center hover:shadow-md transition-shadow"
                >
                  <div className="h-16 flex items-center justify-center text-2xl font-bold text-blue-600 mb-2">
                    {org.logo}
                  </div>
                  <p className="text-gray-600">{org.name}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ServicesPage;