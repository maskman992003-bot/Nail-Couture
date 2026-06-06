import type { ImageSourcePropType } from 'react-native';

export type LookbookItem = {
  id: number;
  category: 'Bridal' | 'Minimalist' | 'Extravagant';
  title: string;
  description: string;
  service: string;
  price: string;
  image: ImageSourcePropType;
};

const lookbookImages: Record<number, ImageSourcePropType> = {
  1: require('../../assets/lookbook/nail1.jpg'),
  2: require('../../assets/lookbook/nail2.jpg'),
  3: require('../../assets/lookbook/nail3.jpg'),
  4: require('../../assets/lookbook/nail4.jpg'),
  5: require('../../assets/lookbook/nail5.jpg'),
  6: require('../../assets/lookbook/nail6.jpg'),
  7: require('../../assets/lookbook/nail7.jpg'),
  8: require('../../assets/lookbook/nail8.jpg'),
  9: require('../../assets/lookbook/nail9.jpg'),
  10: require('../../assets/lookbook/nail10.jpg'),
  11: require('../../assets/lookbook/nail11.jpg'),
  12: require('../../assets/lookbook/nail12.jpg'),
};

export const lookbookCategories = ['All', 'Bridal', 'Minimalist', 'Extravagant'] as const;

export const lookbookData: LookbookItem[] = [
  {
    id: 1,
    category: 'Bridal',
    title: 'Pearl Rose Manicure',
    description: 'Delicate pink ombre with pearl accents, perfect for your special day.',
    service: 'Gel-X Extensions with Custom Art',
    price: '$150',
    image: lookbookImages[1],
  },
  {
    id: 2,
    category: 'Minimalist',
    title: 'Modern French',
    description: 'Clean lines and negative space design for the sophisticated minimalist.',
    service: 'Russian Manicure',
    price: '$80',
    image: lookbookImages[2],
  },
  {
    id: 3,
    category: 'Extravagant',
    title: 'Crystal Embellishment',
    description: 'Hand-placed crystals with gradient ombre for maximum impact.',
    service: 'Gel-X with Full Crystal Set',
    price: '$200',
    image: lookbookImages[3],
  },
  {
    id: 4,
    category: 'Bridal',
    title: 'Heart Pink Tips',
    description: 'Sweet heart-designed nails with pink and white accents.',
    service: 'Gel-X Extensions',
    price: '$120',
    image: lookbookImages[4],
  },
  {
    id: 5,
    category: 'Minimalist',
    title: 'Blue Ombre Elegance',
    description: 'Soft blue ombre gel manicure with elegant simplicity.',
    service: 'Signature Russian Manicure',
    price: '$80',
    image: lookbookImages[5],
  },
  {
    id: 6,
    category: 'Extravagant',
    title: 'Navy Gold Art',
    description: 'Ornate navy and gold nail art with glossy finishes.',
    service: 'Gel-X with Chrome Finish',
    price: '$140',
    image: lookbookImages[6],
  },
  {
    id: 7,
    category: 'Bridal',
    title: 'Pearl Luminance',
    description: 'Iridescent pearls with soft pink base for bridal beauty.',
    service: 'Gel-X with Pearl Add-on',
    price: '$135',
    image: lookbookImages[7],
  },
  {
    id: 8,
    category: 'Minimalist',
    title: 'Nude Elegance',
    description: 'Sophisticated nude tones with subtle shimmer finish.',
    service: 'Russian Manicure',
    price: '$85',
    image: lookbookImages[8],
  },
  {
    id: 9,
    category: 'Extravagant',
    title: '3D Flower Art',
    description: 'Sculpted 3D roses with Swarovski crystal centers.',
    service: 'Full Nail Art Set',
    price: '$250',
    image: lookbookImages[9],
  },
  {
    id: 10,
    category: 'Bridal',
    title: 'Rose Gold Glam',
    description: 'Elegant rose gold polish with delicate floral nail art.',
    service: 'Gel-X Extensions',
    price: '$145',
    image: lookbookImages[10],
  },
  {
    id: 11,
    category: 'Minimalist',
    title: 'Pastel Ombre',
    description: 'Subtle pastel gradient for everyday elegance.',
    service: 'Russian Manicure',
    price: '$75',
    image: lookbookImages[11],
  },
  {
    id: 12,
    category: 'Extravagant',
    title: 'Diamond Dust',
    description: 'Full coverage sparkle with crushed diamond effect.',
    service: 'Gel-X with Chrome Finish',
    price: '$180',
    image: lookbookImages[12],
  },
];
