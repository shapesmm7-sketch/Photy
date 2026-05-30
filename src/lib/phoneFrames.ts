
import iphone15PMWhite from '../assets/images/iphone_15_pm_white_1779295845868.png';
import iphone15PMGold from '../assets/images/iphone_15_pm_gold_1779295865607.png';
import samsungS23UWhite from '../assets/images/samsung_s23_u_white_1779295882944.png';
import pixel6Black from '../assets/images/pixel_6_black_1779295899384.png';
import pixel7Pro from '../assets/images/pixel_7_pro_mockup_1779295431967.png';
import tecnoC20Blue from '../assets/images/tecno_camon_20_blue_1779295969262.png';
import minimalWhite from '../assets/images/minimal_white_frame_mockup_1779295278057.png';

export interface PhoneFrame {
  id: string;
  name: string;
  model: string;
  brand: 'iPhone' | 'Samsung' | 'Google' | 'Other' | 'Generic';
  color: string;
  image: string;
  screenRect: {
    top: number; // Percent
    left: number; // Percent
    width: number; // Percent
    height: number; // Percent
    radius: number; // Percent of width
  };
}

export const PHONE_FRAMES: PhoneFrame[] = [
  // iPhone
  {
    id: 'iphone-15-pm-white',
    name: 'iPhone 15 Pro Max (White)',
    model: 'iPhone 15 Pro Max',
    brand: 'iPhone',
    color: 'White',
    image: iphone15PMWhite,
    screenRect: { top: 2.2, left: 4.5, width: 91, height: 95.6, radius: 12 }
  },
  {
    id: 'iphone-15-pm-gold',
    name: 'iPhone 15 Pro Max (Gold)',
    model: 'iPhone 15 Pro Max',
    brand: 'iPhone',
    color: 'Gold',
    image: iphone15PMGold,
    screenRect: { top: 2.2, left: 4.5, width: 91, height: 95.6, radius: 12 }
  },

  // Samsung
  {
    id: 'samsung-s23-u-white',
    name: 'Galaxy S23 Ultra (White)',
    model: 'Galaxy S23 Ultra',
    brand: 'Samsung',
    color: 'White',
    image: samsungS23UWhite,
    screenRect: { top: 1.5, left: 2.5, width: 95, height: 97, radius: 4 }
  },

  // Google
  {
    id: 'pixel-6-black',
    name: 'Pixel 6 (Black)',
    model: 'Pixel 6',
    brand: 'Google',
    color: 'Black',
    image: pixel6Black,
    screenRect: { top: 2, left: 3, width: 94, height: 96, radius: 8 }
  },
  {
    id: 'pixel-7-pro',
    name: 'Pixel 7 Pro (Porcelain)',
    model: 'Pixel 7 Pro',
    brand: 'Google',
    color: 'Porcelain',
    image: pixel7Pro,
    screenRect: { top: 2.1, left: 3.2, width: 93.6, height: 95.8, radius: 10 }
  },
  // Other
  {
    id: 'tecno-camon-20-blue',
    name: 'Tecno Camon 20 (Blue)',
    model: 'Tecno Camon 20',
    brand: 'Other',
    color: 'Blue',
    image: tecnoC20Blue,
    screenRect: { top: 2, left: 4.5, width: 91, height: 96, radius: 8 }
  },

  // Generic
  {
    id: 'minimal-white',
    name: 'Minimal White',
    model: 'Generic',
    brand: 'Generic',
    color: 'White',
    image: minimalWhite,
    screenRect: { top: 3, left: 3, width: 94, height: 94, radius: 12 }
  }
];

