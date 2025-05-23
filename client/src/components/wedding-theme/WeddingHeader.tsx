import React from "react";
import { motion } from "framer-motion";

interface WeddingHeaderProps {
  title: string;
  subtitle?: string;
}

const WeddingHeader: React.FC<WeddingHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="relative overflow-hidden mb-10">
      {/* Elegant border frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-rose-300 opacity-70"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-rose-300 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-rose-300 opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-rose-300 opacity-70"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-rose-300 to-transparent"></div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-rose-300 to-transparent"></div>
      </div>
      
      {/* Content with animations */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center py-12 px-6"
      >
        <motion.h2 
          className="font-serif text-4xl font-light text-rose-500 mb-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          {title}
        </motion.h2>
        
        {subtitle && (
          <motion.p 
            className="text-lg text-gray-600 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            {subtitle}
          </motion.p>
        )}
        
        {/* Decorative flourish */}
        <motion.div 
          className="mt-4 flex justify-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: "spring" }}
        >
          <svg width="120" height="30" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 15H35" stroke="#FDA4AF" strokeWidth="1" />
            <path d="M85 15H120" stroke="#FDA4AF" strokeWidth="1" />
            <path d="M47,15 C47,12 50,9 54,9 C58,9 60,12 60,15 C60,18 58,21 54,21 C50,21 47,18 47,15 Z" stroke="#FDA4AF" strokeWidth="1" fill="none" />
            <path d="M60,15 C60,12 63,9 67,9 C71,9 73,12 73,15 C73,18 71,21 67,21 C63,21 60,18 60,15 Z" stroke="#FDA4AF" strokeWidth="1" fill="none" />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default WeddingHeader;