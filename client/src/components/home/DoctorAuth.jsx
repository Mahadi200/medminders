import { useState } from 'react';
import { FaUserMd, FaLock, FaEnvelope, FaIdCard, FaHospital, FaPhone, FaClinicMedical, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from "../home/Navbar";
import Footer from "../home/Footer";

const DoctorAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setModalContent({
      title: isLogin ? 'লগইন সফল হয়েছে!' : 'নিবন্ধন সম্পন্ন হয়েছে!',
      message: isLogin
        ? 'আপনি সফলভাবে নিবন্ধিত চিকিৎসক ড্যাশবোর্ডে প্রবেশ করছেন।'
        : 'আপনার চিকিৎসক অ্যাকাউন্টের আবেদন গৃহীত হয়েছে। BMDC রেজিস্ট্রেশন যাচাইয়ের পর অ্যাকাউন্ট পূর্ণ সক্রিয় হবে।',
      icon: <FaUserMd className="text-4xl text-[#028090] mb-3 mx-auto" />
    });
    setShowModal(true);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FA]">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-4 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="w-full max-w-md bg-white rounded-2xl border border-[#D1E3EB] shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#0A2342] p-6 text-white text-center border-b border-[#0F3A66]">
            <div className="w-12 h-12 rounded-xl bg-[#028090] flex items-center justify-center mx-auto mb-3">
              <FaUserMd className="text-2xl text-white" />
            </div>
            <h2 className="text-xl font-bold">
              {isLogin ? 'নিবন্ধিত চিকিৎসক লগইন' : 'চিকিৎসক নিবন্ধন (BMDC Verified)'}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              MedMinders Clinical Doctor Portal
            </p>
          </div>

          {/* Verification Governance Notice */}
          <div className="bg-[#E0F2F1] p-3 text-xs text-[#004D40] flex items-center gap-2 border-b border-[#D1E3EB]">
            <FaShieldAlt className="text-sm shrink-0" />
            <span>BMDC নম্বর যাচাইয়ের পূর্বে কোনো প্রেসক্রিপশন ডিজিটালভাবে স্বাক্ষরিত হবে না।</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#D1E3EB] text-sm">
            <button
              className={`flex-1 py-3.5 font-bold transition ${isLogin ? 'text-[#028090] border-b-2 border-[#028090] bg-[#F4F8FA]' : 'text-[#627D98] hover:text-[#102A43]'}`}
              onClick={() => setIsLogin(true)}
            >
              লগইন (Login)
            </button>
            <button
              className={`flex-1 py-3.5 font-bold transition ${!isLogin ? 'text-[#028090] border-b-2 border-[#028090] bg-[#F4F8FA]' : 'text-[#627D98] hover:text-[#102A43]'}`}
              onClick={() => setIsLogin(false)}
            >
              নতুন নিবন্ধন (Register)
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[#334E68] font-bold mb-1">চিকিৎসকের পূর্ণ নাম</label>
                  <input
                    type="text"
                    placeholder="ডাঃ ফাতিমা বেগম"
                    className="w-full px-3.5 py-2.5 border border-[#D1E3EB] rounded-xl focus:ring-2 focus:ring-[#028090] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#334E68] font-bold mb-1">BMDC রেজিস্ট্রেশন নম্বর</label>
                  <input
                    type="text"
                    placeholder="A-54912"
                    className="w-full px-3.5 py-2.5 border border-[#D1E3EB] rounded-xl focus:ring-2 focus:ring-[#028090] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#334E68] font-bold mb-1">হাসপাতাল বা ক্লিনিক</label>
                  <input
                    type="text"
                    placeholder="ঢাকা মেডিকেল কলেজ হাসপাতাল"
                    className="w-full px-3.5 py-2.5 border border-[#D1E3EB] rounded-xl focus:ring-2 focus:ring-[#028090] outline-none"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[#334E68] font-bold mb-1">ইমেইল ঠিকানা</label>
              <input
                type="email"
                placeholder="doctor@medminders.local"
                className="w-full px-3.5 py-2.5 border border-[#D1E3EB] rounded-xl focus:ring-2 focus:ring-[#028090] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#334E68] font-bold mb-1">পাসওয়ার্ড</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-[#D1E3EB] rounded-xl focus:ring-2 focus:ring-[#028090] outline-none"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#028090] hover:bg-[#00A896] text-white py-3 rounded-xl font-bold text-sm shadow-xs transition"
            >
              {isLogin ? 'ড্যাশবোর্ডে প্রবেশ করুন' : 'নিবন্ধন নিশ্চিত করুন'}
            </button>

            <p className="text-center text-[#627D98] pt-2">
              {isLogin ? 'অ্যাকাউন্ট নেই? ' : 'ইতিমধ্যে অ্যাকাউন্ট আছে? '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#028090] font-bold hover:underline"
              >
                {isLogin ? 'নতুন নিবন্ধন' : 'লগইন করুন'}
              </button>
            </p>
          </form>
        </motion.div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-[#0A2342]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center border border-[#D1E3EB] shadow-2xl"
            >
              {modalContent?.icon}
              <h3 className="text-lg font-bold text-[#102A43] mb-2">{modalContent?.title}</h3>
              <p className="text-xs text-[#334E68] mb-6 leading-relaxed">{modalContent?.message}</p>
              <button
                onClick={() => {
                  setShowModal(false);
                  navigate('/doctor-layout');
                }}
                className="w-full bg-[#028090] hover:bg-[#00A896] text-white py-2.5 rounded-xl font-bold text-xs transition"
              >
                ড্যাশবোর্ডে এগিয়ে যান (Continue)
              </button>
            </motion.div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default DoctorAuth;