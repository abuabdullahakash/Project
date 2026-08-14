import React, { useState } from 'react';

interface BrandLogoProps {
  title: string;
  url?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map common names to Simple Icons slugs and brand background colors
const BRAND_MAP: Record<string, { slug: string; bg: string; color: string; fallbackText: string }> = {
  facebook: { slug: 'facebook', bg: 'bg-[#1877F2]', color: 'text-white', fallbackText: 'FB' },
  fb: { slug: 'facebook', bg: 'bg-[#1877F2]', color: 'text-white', fallbackText: 'FB' },
  faccebook: { slug: 'facebook', bg: 'bg-[#1877F2]', color: 'text-white', fallbackText: 'FB' },
  google: { slug: 'google', bg: 'bg-white', color: 'text-slate-900', fallbackText: 'G' },
  gmail: { slug: 'gmail', bg: 'bg-[#EA4335]', color: 'text-white', fallbackText: 'GM' },
  github: { slug: 'github', bg: 'bg-[#24292e]', color: 'text-white', fallbackText: 'GH' },
  git: { slug: 'git', bg: 'bg-[#F05032]', color: 'text-white', fallbackText: 'GIT' },
  gitlab: { slug: 'gitlab', bg: 'bg-[#FC6D26]', color: 'text-white', fallbackText: 'GL' },
  instagram: { slug: 'instagram', bg: 'bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#833AB4]', color: 'text-white', fallbackText: 'IG' },
  twitter: { slug: 'x', bg: 'bg-black', color: 'text-white', fallbackText: 'X' },
  x: { slug: 'x', bg: 'bg-black', color: 'text-white', fallbackText: 'X' },
  linkedin: { slug: 'linkedin', bg: 'bg-[#0A66C2]', color: 'text-white', fallbackText: 'IN' },
  youtube: { slug: 'youtube', bg: 'bg-[#FF0000]', color: 'text-white', fallbackText: 'YT' },
  netflix: { slug: 'netflix', bg: 'bg-[#E50914]', color: 'text-white', fallbackText: 'N' },
  spotify: { slug: 'spotify', bg: 'bg-[#1DB954]', color: 'text-white', fallbackText: 'SP' },
  apple: { slug: 'apple', bg: 'bg-black', color: 'text-white', fallbackText: 'A' },
  icloud: { slug: 'icloud', bg: 'bg-[#3693F3]', color: 'text-white', fallbackText: 'iC' },
  microsoft: { slug: 'microsoft', bg: 'bg-[#00A4EF]', color: 'text-white', fallbackText: 'MS' },
  outlook: { slug: 'microsoftoutlook', bg: 'bg-[#0078D4]', color: 'text-white', fallbackText: 'OL' },
  amazon: { slug: 'amazon', bg: 'bg-[#FF9900]', color: 'text-slate-900', fallbackText: 'AM' },
  aws: { slug: 'amazonwebservices', bg: 'bg-[#232F3E]', color: 'text-white', fallbackText: 'AWS' },
  discord: { slug: 'discord', bg: 'bg-[#5865F2]', color: 'text-white', fallbackText: 'DC' },
  whatsapp: { slug: 'whatsapp', bg: 'bg-[#25D366]', color: 'text-white', fallbackText: 'WA' },
  telegram: { slug: 'telegram', bg: 'bg-[#26A5E4]', color: 'text-white', fallbackText: 'TG' },
  slack: { slug: 'slack', bg: 'bg-[#4A154B]', color: 'text-white', fallbackText: 'SL' },
  canva: { slug: 'canva', bg: 'bg-[#00C4CC]', color: 'text-white', fallbackText: 'CV' },
  figma: { slug: 'figma', bg: 'bg-[#F24E1E]', color: 'text-white', fallbackText: 'FG' },
  adobe: { slug: 'adobe', bg: 'bg-[#FF0000]', color: 'text-white', fallbackText: 'AD' },
  chatgpt: { slug: 'openai', bg: 'bg-[#10A37F]', color: 'text-white', fallbackText: 'AI' },
  openai: { slug: 'openai', bg: 'bg-[#10A37F]', color: 'text-white', fallbackText: 'AI' },
  claude: { slug: 'anthropic', bg: 'bg-[#D97706]', color: 'text-white', fallbackText: 'CL' },
  binance: { slug: 'binance', bg: 'bg-[#F0B90B]', color: 'text-black', fallbackText: 'BN' },
  paypal: { slug: 'paypal', bg: 'bg-[#003087]', color: 'text-white', fallbackText: 'PP' },
  stripe: { slug: 'stripe', bg: 'bg-[#635BFF]', color: 'text-white', fallbackText: 'ST' },
  dropbox: { slug: 'dropbox', bg: 'bg-[#0061FF]', color: 'text-white', fallbackText: 'DB' },
  reddit: { slug: 'reddit', bg: 'bg-[#FF4500]', color: 'text-white', fallbackText: 'RD' },
  tiktok: { slug: 'tiktok', bg: 'bg-black', color: 'text-white', fallbackText: 'TT' },
  pinterest: { slug: 'pinterest', bg: 'bg-[#BD081C]', color: 'text-white', fallbackText: 'PT' },
  wordpress: { slug: 'wordpress', bg: 'bg-[#21759B]', color: 'text-white', fallbackText: 'WP' },
  shopify: { slug: 'shopify', bg: 'bg-[#7AB55C]', color: 'text-white', fallbackText: 'SH' },
  notion: { slug: 'notion', bg: 'bg-black', color: 'text-white', fallbackText: 'NT' },
  zoom: { slug: 'zoom', bg: 'bg-[#2D8CFF]', color: 'text-white', fallbackText: 'ZM' },
  steam: { slug: 'steam', bg: 'bg-[#171a21]', color: 'text-white', fallbackText: 'ST' },
  epic: { slug: 'epicgames', bg: 'bg-black', color: 'text-white', fallbackText: 'EG' },
  behance: { slug: 'behance', bg: 'bg-[#1769FF]', color: 'text-white', fallbackText: 'BE' },
  dribbble: { slug: 'dribbble', bg: 'bg-[#EA4C89]', color: 'text-white', fallbackText: 'DR' },
};

// Gradient fallbacks based on first letter
const GRADIENT_PALETTES = [
  'from-rose-500 to-red-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
];

export function BrandLogo({ title, url, size = 'md', className = '' }: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);
  const [googleFaviconError, setGoogleFaviconError] = useState(false);

  // Extract domain or query key
  const cleanTitle = (title || '').toLowerCase().trim();
  
  let domain = '';
  if (url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
  }

  // Match brand by title keyword or domain
  const matchedKey = Object.keys(BRAND_MAP).find(key => {
    return cleanTitle.includes(key) || (domain && domain.includes(key));
  });

  const brandInfo = matchedKey ? BRAND_MAP[matchedKey] : null;

  // Derive size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-10 h-10 sm:w-11 sm:h-11 text-sm rounded-xl',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 text-base rounded-2xl'
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5 sm:w-6 sm:h-6',
    lg: 'w-7 h-7 sm:w-8 sm:h-8'
  }[size];

  // Try fetching logo in priority:
  // 1. SimpleIcons CDN if brand match exists
  // 2. Google Favicon V2 if domain exists
  // 3. Stylized Gradient Monogram
  const simpleIconUrl = brandInfo ? `https://cdn.simpleicons.org/${brandInfo.slug}/ffffff` : null;
  const googleFaviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;

  // Gradient selection for fallback
  const charCode = (title || 'P').charCodeAt(0) || 0;
  const gradientClass = GRADIENT_PALETTES[charCode % GRADIENT_PALETTES.length];
  const fallbackLetter = (title || 'P').slice(0, 2).toUpperCase();

  // If SimpleIcons matched and hasn't failed
  if (simpleIconUrl && !imgError) {
    return (
      <div 
        className={`${sizeClasses} ${brandInfo?.bg || 'bg-slate-800'} flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10 overflow-hidden ${className}`}
      >
        <img
          src={simpleIconUrl}
          alt={title}
          className={`${iconSizes} object-contain`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // If domain exists and google favicon hasn't failed
  if (googleFaviconUrl && !googleFaviconError) {
    return (
      <div 
        className={`${sizeClasses} bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-md ring-1 ring-black/5 dark:ring-white/10 p-1.5 overflow-hidden ${className}`}
      >
        <img
          src={googleFaviconUrl}
          alt={title}
          className={`${iconSizes} object-contain`}
          referrerPolicy="no-referrer"
          onError={() => setGoogleFaviconError(true)}
        />
      </div>
    );
  }

  // Fallback: Colorful Gradient Lettering
  return (
    <div 
      className={`${sizeClasses} bg-gradient-to-br ${gradientClass} flex items-center justify-center font-black text-white shrink-0 shadow-md tracking-wider select-none ring-1 ring-white/20 ${className}`}
    >
      {fallbackLetter}
    </div>
  );
}
