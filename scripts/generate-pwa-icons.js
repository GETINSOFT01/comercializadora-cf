// Script para generar iconos PWA básicos
// Este script crea iconos SVG simples para la PWA

const fs = require('fs');
const path = require('path');

// Crear directorio de iconos si no existe
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Template SVG básico para el icono de la aplicación
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1976d2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1565c0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.1}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" 
        font-weight="bold" fill="white" text-anchor="middle" dy="0.35em">CF</text>
</svg>`;

// Tamaños de iconos necesarios para PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generar iconos SVG
iconSizes.forEach(size => {
  const svgContent = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svgContent.trim());
  console.log(`Generated ${filename}`);
});

// Crear iconos adicionales para shortcuts
const shortcutIcons = {
  'shortcut-client.svg': `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="10" fill="#4caf50"/>
  <circle cx="48" cy="35" r="12" fill="white"/>
  <path d="M25 75 Q25 60 48 60 Q71 60 71 75 Z" fill="white"/>
</svg>`,
  'shortcut-service.svg': `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="10" fill="#ff9800"/>
  <rect x="20" y="25" width="56" height="46" rx="4" fill="white"/>
  <rect x="25" y="35" width="46" height="3" fill="#ff9800"/>
  <rect x="25" y="45" width="46" height="3" fill="#ff9800"/>
  <rect x="25" y="55" width="30" height="3" fill="#ff9800"/>
</svg>`,
  'shortcut-dashboard.svg': `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="10" fill="#9c27b0"/>
  <rect x="15" y="15" width="25" height="25" rx="3" fill="white"/>
  <rect x="56" y="15" width="25" height="25" rx="3" fill="white"/>
  <rect x="15" y="56" width="25" height="25" rx="3" fill="white"/>
  <rect x="56" y="56" width="25" height="25" rx="3" fill="white"/>
</svg>`
};

// Generar iconos de shortcuts
Object.entries(shortcutIcons).forEach(([filename, svgContent]) => {
  fs.writeFileSync(path.join(iconsDir, filename), svgContent.trim());
  console.log(`Generated ${filename}`);
});

// Crear favicon básico
const faviconSizes = [16, 32];
faviconSizes.forEach(size => {
  const svgContent = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svgContent.trim());
  console.log(`Generated favicon ${filename}`);
});

console.log('\n✅ PWA icons generated successfully!');
console.log('📁 Icons location:', iconsDir);
console.log('🔧 Note: For production, consider using PNG versions of these icons');
