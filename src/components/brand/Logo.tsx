import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: "light" | "dark" | "premium" | "white" | "luxury";
  showText?: boolean;
  imageUrl?: string | null;
  siteName?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 64, 
  variant = "premium",
  showText = false,
  imageUrl = null,
  siteName = "CRPAZ"
}) => {
  const isWhite = variant === "white";
  const isDark = variant === "dark";
  const isLuxury = variant === "luxury";
  
  // Refined colors for different brand expressions
  const colors = {
    // Deep Green from the Casamance forests
    green: isWhite ? "#FFFFFF" : isDark ? "#101828" : isLuxury ? "#064E3B" : "#1B4D21", 
    // Gold/Bronze for the premium touch
    trunk: isWhite ? "#FFFFFFCC" : isDark ? "#344054" : isLuxury ? "#D4AF37" : "#4A2B15",
    // Foliage colors
    leaves: isWhite ? "#FFFFFF" : isDark ? "#064E3B" : isLuxury ? "#0F5F38" : "#1B4D21",
    // Accent for the Luxury/Gold variant
    gold: "#D4AF37"
  };

  return (
    <div 
      className={`relative inline-flex items-center gap-4 ${className}`}
      style={{ width: showText ? "auto" : size, height: size }}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={siteName} 
          className="object-contain transition-all duration-500 hover:scale-105" 
          style={{ width: size, height: size }} 
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-all duration-700 ease-in-out"
        >
        {/* Outer Ring - Multi-layered for premium Depth */}
        <circle 
          cx="150" cy="150" r="142" 
          stroke={isLuxury ? colors.gold : colors.green} 
          strokeWidth={isLuxury ? "2" : "4"} 
          strokeOpacity={isLuxury ? "0.4" : "1"}
        />
        <circle 
          cx="150" cy="150" r="136" 
          stroke={isLuxury ? colors.gold : colors.green} 
          strokeWidth={isLuxury ? "4" : "0"} 
        />
        <circle 
          cx="150" cy="150" r="115" 
          stroke={isLuxury ? colors.gold : colors.green} 
          strokeWidth="3" 
        />
        
        {/* TEXT PATHS */}
        <path id="pathTop" d="M 50, 150 A 100,100 0 0,1 250,150" fill="none" />
        <path id="pathBottom" d="M 50, 150 A 100,100 0 0,0 250,150" fill="none" />

        {/* TEXT: COOPÉRATIVE RÉGIONALE */}
        <text 
          style={{ 
            fontSize: "20px", 
            fontWeight: 800, 
            fill: isLuxury ? colors.gold : colors.green,
            fontFamily: "'Playfair Display', serif"
          }} 
          className="uppercase tracking-[0.12em]"
        >
          <textPath xlinkHref="#pathTop" startOffset="50%" textAnchor="middle">
            Coopérative Régionale
          </textPath>
        </text>

        {/* TEXT: DES PLANTEURS ET AGRICULTEURS DE ZIGUINCHOR */}
        <text 
          style={{ 
            fontSize: "13px", 
            fontWeight: 700, 
            fill: isLuxury ? colors.gold : colors.green,
            fontFamily: "'DM Sans', sans-serif"
          }} 
          className="uppercase tracking-[0.06em]"
        >
          <textPath xlinkHref="#pathBottom" startOffset="50%" textAnchor="middle">
            des Planteurs et Agriculteurs de Ziguinchor
          </textPath>
        </text>

        {/* SIDE ORNAMENTS (Tree Icons) */}
        <g transform="translate(38, 150) scale(0.15)">
            <rect x="-4" y="0" width="8" height="40" fill={isLuxury ? colors.gold : colors.trunk} />
            <circle cx="0" cy="-5" r="25" fill={isLuxury ? colors.gold : colors.leaves} />
        </g>
        <g transform="translate(262, 150) scale(0.15)">
            <rect x="-4" y="0" width="8" height="40" fill={isLuxury ? colors.gold : colors.trunk} />
            <circle cx="0" cy="-5" r="25" fill={isLuxury ? colors.gold : colors.leaves} />
        </g>

        {/* CENTRAL TREE - Artistic Silhouette */}
        <g transform="translate(150, 135)">
          {/* Trunk with better taper */}
          <path d="M-6 65 L-10 65 L-4 0 L4 0 L10 65 L6 65 Z" fill={isLuxury ? colors.gold : colors.trunk} />
          
          {/* Foliage - More organic, overlapping organic shapes */}
          <g className="filter drop-shadow-sm">
            <circle cx="0" cy="0" r="52" fill={isLuxury ? colors.gold : colors.leaves} />
            <circle cx="-32" cy="-5" r="32" fill={isLuxury ? colors.gold : colors.leaves} />
            <circle cx="32" cy="-5" r="32" fill={isLuxury ? colors.gold : colors.leaves} />
            <circle cx="-12" cy="-32" r="38" fill={isLuxury ? colors.gold : colors.leaves} />
            <circle cx="12" cy="-32" r="38" fill={isLuxury ? colors.gold : colors.leaves} />
            <circle cx="0" cy="-42" r="28" fill={isLuxury ? colors.gold : colors.leaves} />
            
            {/* Highlights for that premium "gloss" finish */}
            {!isLuxury && (
              <>
                <circle cx="-12" cy="-18" r="14" fill="white" fillOpacity="0.12" />
                <circle cx="12" cy="-8" r="10" fill="white" fillOpacity="0.08" />
              </>
            )}
            
            {/* Luxury variant gets an extra inner detail to feel like a minted coin */}
            {isLuxury && (
              <path 
                d="M-20 10 Q 0 -20, 20 10" 
                stroke="#064E3B" 
                strokeWidth="2" 
                fill="none" 
                strokeOpacity="0.2"
              />
            )}
          </g>
        </g>

        {/* CRPAZ BRANING - Modern Slab Serif Feel */}
        <text
          x="150"
          y="228"
          textAnchor="middle"
          style={{ 
            fontSize: "36px", 
            fontWeight: 900,
            fill: isLuxury ? colors.gold : colors.green, 
            letterSpacing: "2.5px",
            fontFamily: "'Playfair Display', serif"
          }}
        >
          {siteName.substring(0, 5)}
        </text>
      </svg>
      )}

      {showText && (
        <div className="flex flex-col justify-center">
          <h2 className={` font-semibold tracking-tight leading-none ${isWhite ? 'text-white' : 'text-foreground'} ${isLuxury ? 'text-gradient-gold' : ''}`} style={{ fontSize: typeof size === 'number' ? size * 0.4 : '1.5rem' }}>
            {siteName}
          </h2>
          <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] leading-none mt-1 sm:mt-2 ${isWhite ? 'text-white/60' : 'text-primary'} ${isLuxury ? 'text-gold' : ''}`}>
            Casamance
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
