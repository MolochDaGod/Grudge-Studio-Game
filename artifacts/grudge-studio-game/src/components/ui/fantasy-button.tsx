import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const FantasyButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    
    const variants = {
      primary: "bg-gradient-to-b from-primary/90 to-primary/60 text-primary-foreground border border-primary shadow-[0_0_15px_rgba(218,165,32,0.3)] hover:shadow-[0_0_25px_rgba(218,165,32,0.6)] hover:-translate-y-0.5",
      secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:border-primary/50",
      danger: "bg-gradient-to-b from-destructive/90 to-destructive/60 text-destructive-foreground border border-destructive shadow-[0_0_15px_rgba(200,0,0,0.3)] hover:shadow-[0_0_25px_rgba(200,0,0,0.6)]",
      ghost: "bg-transparent text-foreground hover:text-primary hover:bg-white/5 border border-transparent hover:border-white/10"
    };

    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-12 px-6 text-sm",
      lg: "h-14 px-8 text-base font-bold tracking-wider",
      icon: "h-10 w-10 flex items-center justify-center"
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative inline-flex items-center justify-center rounded-sm font-display uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none overflow-hidden group",
          variants[variant],
          sizes[size],
          className
        )}
        {...(props as any)}
      >
        <span className="relative z-10 flex items-center gap-2">{props.children}</span>
        {/* Subtle overlay shine effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite] skew-x-12 z-0" />
      </motion.button>
    )
  }
)
FantasyButton.displayName = "FantasyButton"

export { FantasyButton }
