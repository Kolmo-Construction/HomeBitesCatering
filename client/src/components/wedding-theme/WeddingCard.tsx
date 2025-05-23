import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface WeddingCardProps {
  children: ReactNode;
  className?: string;
}

const WeddingCard: React.FC<WeddingCardProps> = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative bg-white rounded-lg shadow-md overflow-hidden ${className}`}
    >
      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gray-200"></div>
      </div>
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-gray-200"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-gray-200"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gray-200"></div>
      </div>
      
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50/30 pointer-events-none"></div>
      
      {/* Content with padding */}
      <div className="relative p-8">
        {children}
      </div>
    </motion.div>
  );
};

export default WeddingCard;