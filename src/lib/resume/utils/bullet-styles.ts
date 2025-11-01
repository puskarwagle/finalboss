/**
 * Bullet Style Utilities
 * Returns appropriate bullet character based on template style
 */

import type { TemplateStyle } from '../types';

/**
 * Get bullet character for template style
 */
export function getBulletCharacter(style: TemplateStyle): string {
  const bulletStyle = style.bulletStyle || 'round';
  
  switch (bulletStyle) {
    case 'square':
      return style.bulletCharacter || '■';
    
    case 'dash':
      return style.bulletCharacter || '—';
    
    case 'diamond':
      return style.bulletCharacter || '♦';
    
    case 'arrow':
      return style.bulletCharacter || '▸';
    
    case 'custom':
      return style.bulletCharacter || '•';
    
    case 'round':
    default:
      return '•';
  }
}

/**
 * Get bullet color (if custom color specified)
 */
export function getBulletColor(style: TemplateStyle): string | undefined {
  if (style.bulletStyle === 'custom' && style.bulletColor) {
    return style.bulletColor;
  }
  return undefined;
}

