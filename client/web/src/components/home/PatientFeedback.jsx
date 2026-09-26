import { motion } from "framer-motion";
import { FaQuoteLeft, FaStar } from "react-icons/fa";

const testimonials = [
  {
    id: 1,
    name: "Maria",
    role: "Patient",
    feedback: "MedMinders has completely changed how I manage my medications. I never miss a dose anymore, and the reminders are so helpful. Highly recommend to anyone on multiple medications!",
    rating: 5,
  },
  {
    id: 2,
    name: "Md. Alif",
    role: "Patient",
    feedback: "The app is intuitive and easy to use. Booking appointments has never been simpler. The doctors are professional and the whole experience feels seamless. Great software!",
    rating: 5,
  },
  {
    id: 3,
    name: "Ayesha Rahman",
    role: "Patient",
    feedback: "I've been using MedMinders for 6 months now and it's been amazing. The medication tracking feature keeps my family on top of their health. Worth every penny!",
    rating: 5,
  },
];

const PatientFeedback = () => {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Patient Feedback</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-teal-500 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Hear from patients who have experienced the benefits of MedMinders. Real stories, real results.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-gradient-to-b from-blue-50 to-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-blue-100"
            >
              <FaQuoteLeft className="text-blue-500 text-3xl mb-4 opacity-80" />
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FaStar key={i} className="text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">{testimonial.feedback}</p>
              <div>
                <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                <p className="text-sm text-blue-600">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PatientFeedback;
