import React from "react";
import { motion } from "framer-motion";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface WeddingInputProps {
  label: string;
  field: any;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  type?: string;
  maxLength?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const WeddingInput: React.FC<WeddingInputProps> = ({ 
  label, 
  field, 
  placeholder, 
  required, 
  autoComplete, 
  type = "text",
  maxLength,
  onChange 
}) => {
  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const highlightAnimation = {
    initial: { width: "0%" },
    focus: { width: "100%", transition: { duration: 0.6 } },
    blur: { width: "0%", transition: { duration: 0.6 } }
  };

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="relative"
    >
      <FormItem className="group">
        <FormLabel className="font-serif text-rose-700">
          {label}{required && <span className="text-rose-500 ml-1">*</span>}
        </FormLabel>
        <div className="relative">
          <FormControl>
            <Input
              {...field}
              className="border-rose-200 hover:border-rose-300 focus:border-rose-400 focus:ring-rose-100 
                         transition-all duration-300 bg-white/80 hover:bg-white px-4"
              placeholder={placeholder}
              required={required}
              autoComplete={autoComplete}
              type={type}
              maxLength={maxLength}
              onChange={onChange || field.onChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </FormControl>
          
          {/* Elegant animated highlight line */}
          <motion.div 
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-rose-200 via-rose-400 to-rose-200"
            initial="initial"
            animate={isFocused ? "focus" : "blur"}
            variants={highlightAnimation}
          />
        </div>
        <FormMessage className="text-rose-500" />
      </FormItem>
    </motion.div>
  );
};

export default WeddingInput;