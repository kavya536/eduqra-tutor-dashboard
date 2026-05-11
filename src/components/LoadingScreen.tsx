import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';

export function LoadingScreen({ message = "Loading your workspace..." }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-10 animate-in fade-in duration-700">
      <div className="relative">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary shadow-xl shadow-primary/5"
        >
          <GraduationCap size={48} />
        </motion.div>
        
        {/* Animated Orbits */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 border-2 border-dashed border-primary/20 rounded-[2.5rem]"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-8 border border-dashed border-secondary/10 rounded-[3rem]"
        />
      </div>

      <div className="mt-12 text-center space-y-3">
        <h3 className="text-xl font-black text-on-surface tracking-tight animate-pulse">
          {message}
        </h3>
        <p className="text-on-surface-variant font-medium text-sm max-w-[200px] mx-auto leading-relaxed opacity-60">
          Preparing your premium tutoring dashboard
        </p>
      </div>

      {/* Progress Line */}
      <div className="mt-8 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      </div>
    </div>
  );
}
