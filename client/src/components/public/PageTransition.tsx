import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  direction: 'next' | 'prev';
  isActive: boolean;
}

// Animation variants for the page transitions
const variants = {
  enter: (direction: 'next' | 'prev') => ({
    x: direction === 'next' ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'next' | 'prev') => ({
    x: direction === 'next' ? -300 : 300,
    opacity: 0,
  }),
};

export function PageTransition({ children, direction, isActive }: PageTransitionProps) {
  const [key, setKey] = useState(Date.now());
  
  // Update key when children change to force re-render
  useEffect(() => {
    setKey(Date.now());
  }, [children]);
  
  return (
    <AnimatePresence initial={false} mode="wait" custom={direction}>
      <motion.div
        key={key}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}