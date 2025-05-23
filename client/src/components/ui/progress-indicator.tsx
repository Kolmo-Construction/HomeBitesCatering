import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FormStep } from "@/types/form-types";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: FormStep;
  steps: FormStep[];
  stepLabels?: Partial<Record<FormStep, string>>; // Optional mapping of step keys to display names
  activeSteps?: FormStep[]; // Currently active steps (for conditional steps)
}

export const ProgressIndicator = ({
  currentStep,
  steps,
  stepLabels = {},
  activeSteps = steps,
}: ProgressIndicatorProps) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<FormStep[]>([]);

  // Filter out inactive steps and get the current active steps
  const filteredSteps = steps.filter(step => activeSteps.includes(step));

  useEffect(() => {
    // Find the index of the current step in the filtered step list
    const stepIndex = filteredSteps.indexOf(currentStep);
    setActiveStepIndex(stepIndex > -1 ? stepIndex : 0);
    
    // Calculate progress percentage
    const progressPercent = stepIndex > -1 
      ? (stepIndex / (filteredSteps.length - 1)) * 100 
      : 0;
    
    // Animate the progress change
    setProgress(progressPercent);
    
    // Update completed steps
    setCompletedSteps(filteredSteps.slice(0, stepIndex));
  }, [currentStep, filteredSteps]);

  // Get a human-readable label for each step
  const getStepLabel = (step: FormStep) => {
    return stepLabels[step] || step.split(/(?=[A-Z])/).join(" ").replace(/_/g, " ");
  };

  return (
    <div className="w-full py-6 px-2">
      {/* Main progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-8">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between relative">
        {filteredSteps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const isCompleted = completedSteps.includes(step);
          
          return (
            <div key={step} className="relative flex flex-col items-center">
              {/* Step bubble */}
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 z-10",
                  isActive 
                    ? "bg-primary text-white border-primary" 
                    : isCompleted 
                      ? "bg-primary/20 text-primary border-primary" 
                      : "bg-gray-100 text-gray-400 border-gray-300"
                )}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  borderColor: isActive || isCompleted ? "var(--primary)" : "var(--gray-300)",
                  backgroundColor: isActive 
                    ? "var(--primary)" 
                    : isCompleted 
                      ? "var(--primary-light)" 
                      : "var(--gray-100)"
                }}
                transition={{ duration: 0.3 }}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </motion.div>
              
              {/* Step label */}
              <motion.span
                className={cn(
                  "text-xs font-medium text-center absolute -bottom-6 w-24",
                  isActive 
                    ? "text-primary" 
                    : isCompleted 
                      ? "text-gray-600" 
                      : "text-gray-400"
                )}
                animate={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive 
                    ? "var(--primary)" 
                    : isCompleted 
                      ? "var(--gray-700)" 
                      : "var(--gray-400)"
                }}
                transition={{ duration: 0.2 }}
              >
                {getStepLabel(step)}
              </motion.span>
            </div>
          );
        })}
        
        {/* Connecting lines between steps */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2" />
      </div>
    </div>
  );
};