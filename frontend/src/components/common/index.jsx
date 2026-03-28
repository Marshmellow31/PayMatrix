import { motion } from "framer-motion";

export const Button = ({ children, variant = "primary", className = "", ...props }) => {
  const variants = {
    primary: "bg-primary text-background hover:bg-primary/90",
    secondary: "bg-surface-container-highest/40 backdrop-blur-premium text-primary border border-on-surface-variant/10 hover:bg-surface-container-highest/60",
    ghost: "bg-transparent text-on-surface-variant hover:text-primary transition-colors",
    error: "bg-error-container text-on-error-container hover:opacity-90",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      className={`px-8 py-3 rounded-lg font-bold text-sm transition-all focus:outline-none focus:ring-1 focus:ring-primary/20 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const Input = ({ label, error, className = "", ...props }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-on-surface-variant uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-surface-container-lowest border-none rounded-lg px-4 py-3 text-on-background placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none ${
          error ? "ring-1 ring-error-container" : ""
        }`}
        {...props}
      />
      {error && <span className="text-[10px] text-error font-medium ml-1 uppercase">{error}</span>}
    </div>
  );
};

export const Card = ({ children, className = "", hover = false, ...props }) => {
  return (
    <div
      className={`bg-surface-container-high rounded-lg p-6 border border-on-surface-variant/5 ${
        hover ? "hover:translate-y-[-2px] transition-transform duration-300" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
