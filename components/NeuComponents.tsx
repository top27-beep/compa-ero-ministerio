import React from 'react';
import { NeuProps } from '../types';

// Utility for merging classes
const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');

// Specific shadows for the theme
const SHADOW_OUT = "shadow-[6px_6px_12px_#c8ccd4,-6px_-6px_12px_#ffffff]";
const SHADOW_IN = "shadow-[inset_6px_6px_12px_#c8ccd4,inset_-6px_-6px_12px_#ffffff]";

export const NeuCard: React.FC<NeuProps> = ({ children, className }) => {
  return (
    <div className={cn("bg-neu-base rounded-2xl p-6", SHADOW_OUT, className)}>
      {children}
    </div>
  );
};

export const NeuButton: React.FC<NeuProps & { disabled?: boolean }> = ({ children, className, onClick, active, disabled }) => {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={cn(
        "rounded-xl px-6 py-3 font-semibold transition-all duration-200 flex items-center justify-center",
        "active:scale-95",
        active ? `${SHADOW_IN} text-neu-accent` : `${SHADOW_OUT} text-gray-600 hover:text-neu-accent`,
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
};

export const NeuInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-neu-base rounded-xl px-4 py-3 outline-none transition-all text-gray-700",
        SHADOW_IN,
        "focus:ring-2 focus:ring-neu-accent/20",
        props.className
      )}
    />
  );
};

export const NeuTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full bg-neu-base rounded-xl px-4 py-3 outline-none transition-all text-gray-700 resize-none",
        SHADOW_IN,
        "focus:ring-2 focus:ring-neu-accent/20",
        props.className
      )}
    />
  );
};

export const NeuIconButton: React.FC<NeuProps & { icon: React.ReactNode }> = ({ icon, onClick, active, className }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                active ? `${SHADOW_IN} text-neu-accent` : `${SHADOW_OUT} text-gray-500`,
                className
            )}
        >
            {icon}
        </button>
    )
}