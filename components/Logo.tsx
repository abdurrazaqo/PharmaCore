import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: {
      icon: 'w-12 h-12',
      main: 'text-base',
      sub: 'text-[10px]',
      gap: 'gap-2'
    },
    md: {
      icon: 'w-14 h-14',
      main: 'text-xl',
      sub: 'text-xs',
      gap: 'gap-2'
    },
    lg: {
      icon: 'w-16 h-16',
      main: 'text-2xl',
      sub: 'text-sm',
      gap: 'gap-2.5'
    }
  };

  const sizeConfig = sizes[size];

  return (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Logo Image */}
      <div className={`${sizeConfig.icon} relative flex-shrink-0`}>
        <img 
          src="/images/logo.PNG" 
          alt="PharmaCore Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <span className={`${sizeConfig.main} font-bold tracking-tight leading-none`}>
          <span className="text-primary">Pharma</span>
          <span className="text-slate-900 dark:text-white">Core</span>
        </span>
        <span className={`${sizeConfig.sub} text-slate-500 dark:text-slate-400 tracking-wide text-right`}>
          <span className="font-normal">by </span>
          <span className="font-bold">365Health</span>
        </span>
      </div>
    </div>
  );
};

export default Logo;
