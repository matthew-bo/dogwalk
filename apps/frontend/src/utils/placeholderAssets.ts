// Placeholder asset generation system for visual feedback during development
// These will be replaced with actual sprite sheets and graphics in production

export interface PlaceholderOptions {
  width: number;
  height: number;
  color: string;
  name: string;
}

// Generate simple SVG placeholders for dog breeds
export const generateDogPlaceholder = (breed: string, color: string): string => {
  const svg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <!-- Dog body -->
      <ellipse cx="32" cy="40" rx="18" ry="12" fill="${color}" stroke="#000" stroke-width="2"/>
      
      <!-- Dog head -->
      <circle cx="32" cy="24" r="14" fill="${color}" stroke="#000" stroke-width="2"/>
      
      <!-- Ears -->
      <ellipse cx="24" cy="18" rx="4" ry="8" fill="${adjustBrightness(color, -20)}" stroke="#000" stroke-width="1"/>
      <ellipse cx="40" cy="18" rx="4" ry="8" fill="${adjustBrightness(color, -20)}" stroke="#000" stroke-width="1"/>
      
      <!-- Eyes -->
      <circle cx="28" cy="22" r="2" fill="#000"/>
      <circle cx="36" cy="22" r="2" fill="#000"/>
      <circle cx="28.5" cy="21.5" r="0.5" fill="#fff"/>
      <circle cx="36.5" cy="21.5" r="0.5" fill="#fff"/>
      
      <!-- Nose -->
      <ellipse cx="32" cy="26" rx="1.5" ry="1" fill="#000"/>
      
      <!-- Mouth -->
      <path d="M 32 27 Q 30 28 28 27" stroke="#000" stroke-width="1" fill="none"/>
      <path d="M 32 27 Q 34 28 36 27" stroke="#000" stroke-width="1" fill="none"/>
      
      <!-- Legs -->
      <rect x="22" y="48" width="4" height="8" fill="${adjustBrightness(color, -10)}" stroke="#000" stroke-width="1"/>
      <rect x="28" y="48" width="4" height="8" fill="${adjustBrightness(color, -10)}" stroke="#000" stroke-width="1"/>
      <rect x="36" y="48" width="4" height="8" fill="${adjustBrightness(color, -10)}" stroke="#000" stroke-width="1"/>
      <rect x="42" y="48" width="4" height="8" fill="${adjustBrightness(color, -10)}" stroke="#000" stroke-width="1"/>
      
      <!-- Tail -->
      <ellipse cx="48" cy="38" rx="8" ry="3" fill="${adjustBrightness(color, -10)}" stroke="#000" stroke-width="1" transform="rotate(20 48 38)"/>
      
      <!-- Breed identifier text -->
      <text x="32" y="62" font-family="Arial, sans-serif" font-size="6" text-anchor="middle" fill="#666">${breed.substring(0, 3).toUpperCase()}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Generate park background elements
export const generateParkBackground = (): string => {
  const svg = `
    <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Sky gradient -->
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#98FB98;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#90EE90;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#228B22;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Sky -->
      <rect width="800" height="300" fill="url(#skyGradient)"/>
      
      <!-- Clouds -->
      <circle cx="150" cy="80" r="20" fill="#fff" opacity="0.8"/>
      <circle cx="170" cy="80" r="25" fill="#fff" opacity="0.8"/>
      <circle cx="190" cy="80" r="20" fill="#fff" opacity="0.8"/>
      
      <circle cx="600" cy="60" r="15" fill="#fff" opacity="0.7"/>
      <circle cx="615" cy="60" r="20" fill="#fff" opacity="0.7"/>
      <circle cx="630" cy="60" r="15" fill="#fff" opacity="0.7"/>
      
      <!-- Ground -->
      <rect y="300" width="800" height="100" fill="url(#grassGradient)"/>
      
      <!-- Path -->
      <ellipse cx="400" cy="380" rx="300" ry="20" fill="#D2B48C"/>
      
      <!-- Trees -->
      <!-- Tree 1 -->
      <rect x="100" y="200" width="8" height="60" fill="#8B4513"/>
      <circle cx="104" cy="200" r="25" fill="#228B22"/>
      
      <!-- Tree 2 -->
      <rect x="650" y="180" width="10" height="80" fill="#8B4513"/>
      <circle cx="655" cy="180" r="30" fill="#32CD32"/>
      
      <!-- Tree 3 -->
      <rect x="300" y="220" width="6" height="40" fill="#8B4513"/>
      <circle cx="303" cy="220" r="20" fill="#228B22"/>
      
      <!-- Benches -->
      <!-- Bench 1 -->
      <rect x="200" y="280" width="50" height="8" fill="#8B4513"/>
      <rect x="205" y="270" width="40" height="4" fill="#8B4513"/>
      <rect x="210" y="288" width="4" height="12" fill="#8B4513"/>
      <rect x="236" y="288" width="4" height="12" fill="#8B4513"/>
      
      <!-- Flowers -->
      <circle cx="250" cy="290" r="2" fill="#FF69B4"/>
      <circle cx="255" cy="292" r="2" fill="#FF1493"/>
      <circle cx="260" cy="289" r="2" fill="#FF69B4"/>
      
      <!-- Ducks in pond (background) -->
      <ellipse cx="500" cy="250" rx="60" ry="20" fill="#4169E1" opacity="0.6"/>
      <ellipse cx="480" cy="250" rx="8" ry="5" fill="#FFD700"/>
      <ellipse cx="520" cy="248" rx="8" ry="5" fill="#FFD700"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Generate UI element placeholders
export const generateUIElement = (type: 'leash_normal' | 'leash_slack' | 'treat_bush' | 'tennis_ball' | 'squirrel'): string => {
  let svg = '';
  
  switch (type) {
    case 'leash_normal':
      svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M 4 4 Q 16 20 28 4" stroke="#8B5CF6" stroke-width="3" fill="none"/>
          <circle cx="4" cy="4" r="2" fill="#8B5CF6"/>
          <circle cx="28" cy="4" r="2" fill="#8B5CF6"/>
        </svg>
      `;
      break;
      
    case 'leash_slack':
      svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M 4 4 Q 10 16 16 12 Q 22 8 28 20" stroke="#374151" stroke-width="3" fill="none" stroke-dasharray="2,2"/>
          <circle cx="4" cy="4" r="2" fill="#374151"/>
          <circle cx="28" cy="20" r="2" fill="#374151"/>
          <!-- Frayed effect -->
          <path d="M 14 14 L 12 16 M 16 10 L 18 8 M 20 10 L 22 12" stroke="#1F2937" stroke-width="1"/>
        </svg>
      `;
      break;
      
    case 'treat_bush':
      svg = `
        <svg width="48" height="32" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg">
          <!-- Bush -->
          <circle cx="24" cy="24" r="12" fill="#228B22"/>
          <circle cx="18" cy="20" r="8" fill="#32CD32"/>
          <circle cx="30" cy="20" r="8" fill="#32CD32"/>
          <!-- Treat -->
          <ellipse cx="24" cy="16" rx="6" ry="3" fill="#DEB887" stroke="#8B4513" stroke-width="1"/>
          <circle cx="20" cy="16" r="1" fill="#8B4513"/>
          <circle cx="28" cy="16" r="1" fill="#8B4513"/>
        </svg>
      `;
      break;
      
    case 'tennis_ball':
      svg = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#ADFF2F" stroke="#228B22" stroke-width="1"/>
          <path d="M 6 8 Q 12 12 18 8" stroke="#fff" stroke-width="2" fill="none"/>
          <path d="M 6 16 Q 12 12 18 16" stroke="#fff" stroke-width="2" fill="none"/>
        </svg>
      `;
      break;
      
    case 'squirrel':
      svg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <!-- Body -->
          <ellipse cx="16" cy="20" rx="6" ry="8" fill="#8B4513"/>
          <!-- Head -->
          <circle cx="16" cy="12" r="5" fill="#8B4513"/>
          <!-- Ears -->
          <ellipse cx="13" cy="8" rx="2" ry="3" fill="#8B4513"/>
          <ellipse cx="19" cy="8" rx="2" ry="3" fill="#8B4513"/>
          <!-- Eyes -->
          <circle cx="14" cy="11" r="1" fill="#000"/>
          <circle cx="18" cy="11" r="1" fill="#000"/>
          <!-- Tail -->
          <ellipse cx="8" cy="16" rx="6" ry="10" fill="#CD853F" transform="rotate(-30 8 16)"/>
          <!-- Arms -->
          <circle cx="10" cy="16" r="2" fill="#8B4513"/>
          <circle cx="22" cy="16" r="2" fill="#8B4513"/>
        </svg>
      `;
      break;
  }
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Generate effect placeholders
export const generateEffect = (type: 'confetti' | 'coins' | 'sparkles' | 'speed_lines'): string => {
  let svg = '';
  
  switch (type) {
    case 'confetti':
      svg = `
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="15" width="4" height="4" fill="#FF69B4" transform="rotate(45 12 17)"/>
          <rect x="25" y="8" width="3" height="3" fill="#00CED1" transform="rotate(30 26.5 9.5)"/>
          <rect x="40" y="20" width="4" height="4" fill="#FFD700" transform="rotate(60 42 22)"/>
          <rect x="15" y="35" width="3" height="3" fill="#FF6347" transform="rotate(15 16.5 36.5)"/>
          <rect x="45" y="45" width="4" height="4" fill="#98FB98" transform="rotate(75 47 47)"/>
          <rect x="30" y="50" width="3" height="3" fill="#DDA0DD" transform="rotate(120 31.5 51.5)"/>
          <rect x="8" y="50" width="4" height="4" fill="#F0E68C" transform="rotate(90 10 52)"/>
          <rect x="50" y="10" width="3" height="3" fill="#FF69B4" transform="rotate(45 51.5 11.5)"/>
        </svg>
      `;
      break;
      
    case 'coins':
      svg = `
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="6" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
          <text x="20" y="24" font-family="Arial" font-size="8" text-anchor="middle" fill="#B8860B">$</text>
          <circle cx="40" cy="15" r="5" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
          <text x="40" y="18" font-family="Arial" font-size="6" text-anchor="middle" fill="#B8860B">$</text>
          <circle cx="15" cy="45" r="7" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
          <text x="15" y="49" font-family="Arial" font-size="9" text-anchor="middle" fill="#B8860B">$</text>
          <circle cx="45" cy="50" r="5" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
          <text x="45" y="53" font-family="Arial" font-size="6" text-anchor="middle" fill="#B8860B">$</text>
        </svg>
      `;
      break;
      
    case 'sparkles':
      svg = `
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="M 16 8 L 18 16 L 26 18 L 18 20 L 16 28 L 14 20 L 6 18 L 14 16 Z" fill="#FFD700"/>
          <path d="M 45 25 L 46 30 L 51 31 L 46 32 L 45 37 L 44 32 L 39 31 L 44 30 Z" fill="#FFF"/>
          <path d="M 20 45 L 21 50 L 26 51 L 21 52 L 20 57 L 19 52 L 14 51 L 19 50 Z" fill="#00CED1"/>
          <path d="M 50 10 L 51 13 L 54 14 L 51 15 L 50 18 L 49 15 L 46 14 L 49 13 Z" fill="#FF69B4"/>
        </svg>
      `;
      break;
      
    case 'speed_lines':
      svg = `
        <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <line x1="10" y1="15" x2="35" y2="15" stroke="#FFF" stroke-width="2" opacity="0.7"/>
          <line x1="8" y1="25" x2="40" y2="25" stroke="#FFF" stroke-width="3" opacity="0.6"/>
          <line x1="12" y1="35" x2="45" y2="35" stroke="#FFF" stroke-width="2" opacity="0.8"/>
          <line x1="6" y1="45" x2="38" y2="45" stroke="#FFF" stroke-width="3" opacity="0.5"/>
          <line x1="14" y1="55" x2="42" y2="55" stroke="#FFF" stroke-width="2" opacity="0.7"/>
        </svg>
      `;
      break;
  }
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Utility function to adjust color brightness
function adjustBrightness(color: string, amount: number): string {
  // Simple brightness adjustment for hex colors
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * amount);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Create placeholder assets on demand
export const createPlaceholderAsset = async (type: string, options?: any): Promise<string> => {
  switch (type) {
    case 'dog':
      return generateDogPlaceholder(options.breed, options.color);
    case 'background':
      return generateParkBackground();
    case 'ui':
      return generateUIElement(options.element);
    case 'effect':
      return generateEffect(options.effect);
    default:
      return '';
  }
};

// Asset cache for placeholder images
const placeholderCache = new Map<string, string>();

export const getCachedPlaceholder = (key: string, generator: () => string): string => {
  if (!placeholderCache.has(key)) {
    placeholderCache.set(key, generator());
  }
  return placeholderCache.get(key)!;
}; 