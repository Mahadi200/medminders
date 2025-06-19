import React, { useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { motion } from "framer-motion";
import HelpDesk from "./HelpDesk";
import { FaQuestion } from "react-icons/fa";

const Hero = () => {
  const [showHelpDesk, setShowHelpDesk] = useState(false);

  const [sliderRef] = useKeenSlider({
    loop: true,
    drag: true,
    created(s) {
      s.moveToIdx(1, true); // Start from the first real slide
    },
    slideChanged(s) {
      // Looping behavior
      if (s.track.details.rel === 0) {
        s.moveToIdx(s.slides.length - 2, 0);
      } else if (s.track.details.rel === s.slides.length - 1) {
        s.moveToIdx(1, 0);
      }
    },
  });

  // Slides using public images — do not use import for public assets
  const slides = [
    { id: 4, image: "/image/assets/h3.png" }, // Clone of last slide
    { id: 1, image: "/image/assets/h1.png" },
    { id: 2, image: "/image/assets/h2.png" },
    { id: 3, image: "/image/assets/h3.png" },
    { id: 4, image: "/image/assets/h4.png" },
    { id: 1, image: "/image/assets/h1.png" }, // Clone of first slide
  ];

  // Stethoscope SVG cursor
  const stethoscopeCursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M24 12a8 8 0 0 1-8 8 8 8 0 0 1-8-8V4h2v8a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4h2v8z' fill='%23ffffff'/><path d='M22 24a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-6h2v6a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-6h2v6z' fill='%23ffffff'/><circle cx='16' cy='24' r='2' fill='%23ff0000'/></svg>"), auto`;

  return (
    <section 
      className="relative w-full h-screen max-h-[70vh] overflow-hidden"
      style={{ cursor: stethoscopeCursor }}
    >
      <div ref={sliderRef} className="keen-slider h-full">
        {slides.map((slide, index) => (
          <div key={`${slide.id}-${index}`} className="keen-slider__slide relative">
            <img
              src={slide.image}
              alt={`Slide ${slide.id}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40" />

            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowHelpDesk(true)}
                className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-4 px-8 rounded-full text-xl shadow-xl flex items-center gap-2"
              >
                <FaQuestion className="text-2xl" />
                AI Help Desk
              </motion.button>
            </div>
          </div>
        ))}
      </div>

      {/* HelpDesk modal */}
      <HelpDesk isOpen={showHelpDesk} onClose={() => setShowHelpDesk(false)} />
    </section>
  );
};

export default Hero;
