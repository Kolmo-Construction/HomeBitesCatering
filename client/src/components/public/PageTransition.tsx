import React, { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  direction?: 'next' | 'prev';
  isActive?: boolean;
}

export function PageTransition({ 
  children, 
  direction = 'next', 
  isActive = true 
}: PageTransitionProps) {
  
  const variants = {
    enter: (direction: string) => ({
      x: direction === 'next' ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: string) => ({
      x: direction === 'next' ? -1000 : 1000,
      opacity: 0
    })
  };

  if (!isActive) {
    return null;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`page-transition-${Math.random()}`}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 }
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}