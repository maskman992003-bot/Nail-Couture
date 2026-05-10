import { useState } from 'react';
import nail1 from '../assets/nail1.jpg';
import nail2 from '../assets/nail2.jpg';
import nail3 from '../assets/nail3.jpg';
import nail4 from '../assets/nail4.jpg';
import nail5 from '../assets/nail5.jpg';
import nail6 from '../assets/nail6.jpg';
import nail7 from '../assets/nail7.jpg';
import nail8 from '../assets/nail8.jpg';
import nail9 from '../assets/nail9.jpg';
import nail10 from '../assets/nail10.jpg';
import nail11 from '../assets/nail11.jpg';
import nail12 from '../assets/nail12.jpg';

const galleryData = [
  {
    id: 1,
    category: 'Bridal',
    title: 'Pearl Rose Manicure',
    description: 'Delicate pink ombre with pearl accents, perfect for your special day.',
    service: 'Gel-X Extensions with Custom Art',
    price: '$150',
    image: nail1,
  },
  {
    id: 2,
    category: 'Minimalist',
    title: 'Modern French',
    description: 'Clean lines and negative space design for the sophisticated minimalist.',
    service: 'Russian Manicure',
    price: '$80',
    image: nail2,
  },
  {
    id: 3,
    category: 'Extravagant',
    title: 'Crystal Embellishment',
    description: 'Hand-placed crystals with gradient ombre for maximum impact.',
    service: 'Gel-X with Full Crystal Set',
    price: '$200',
    image: nail3,
  },
  {
    id: 4,
    category: 'Bridal',
    title: 'Heart Pink Tips',
    description: 'Sweet heart-designed nails with pink and white accents.',
    service: 'Gel-X Extensions',
    price: '$120',
    image: nail4,
  },
  {
    id: 5,
    category: 'Minimalist',
    title: 'Blue Ombre Elegance',
    description: 'Soft blue ombre gel manicure with elegant simplicity.',
    service: 'Signature Russian Manicure',
    price: '$80',
    image: nail5,
  },
  {
    id: 6,
    category: 'Extravagant',
    title: 'Navy Gold Art',
    description: 'Ornate navy and gold nail art with glossy finishes.',
    service: 'Gel-X with Chrome Finish',
    price: '$140',
    image: nail6,
  },
  {
    id: 7,
    category: 'Bridal',
    title: 'Pearl Luminance',
    description: 'Iridescent pearls with soft pink base for bridal beauty.',
    service: 'Gel-X with Pearl Add-on',
    price: '$135',
    image: nail7,
  },
  {
    id: 8,
    category: 'Minimalist',
    title: 'Nude Elegance',
    description: 'Sophisticated nude tones with subtle shimmer finish.',
    service: 'Russian Manicure',
    price: '$85',
    image: nail8,
  },
  {
    id: 9,
    category: 'Extravagant',
    title: '3D Flower Art',
    description: 'Sculpted 3D roses with Swarovski crystal centers.',
    service: 'Full Nail Art Set',
    price: '$250',
    image: nail9,
  },
  {
    id: 10,
    category: 'Bridal',
    title: 'Rose Gold Glam',
    description: 'Elegant rose gold polish with delicate floral nail art.',
    service: 'Gel-X Extensions',
    price: '$145',
    image: nail10,
  },
  {
    id: 11,
    category: 'Minimalist',
    title: 'Pastel Ombre',
    description: 'Subtle pastel gradient for everyday elegance.',
    service: 'Russian Manicure',
    price: '$75',
    image: nail11,
  },
  {
    id: 12,
    category: 'Extravagant',
    title: 'Diamond Dust',
    description: 'Full coverage sparkle with crushed diamond effect.',
    service: 'Gel-X with Chrome Finish',
    price: '$180',
    image: nail12,
  },
];

const categories = ['All', 'Bridal', 'Minimalist', 'Extravagant'];

function Lightbox({ item, onClose }) {
  const scrollToBooking = () => {
    onClose()
    setTimeout(() => {
      const element = document.getElementById('book')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 300)
  }

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-[100] bg-charcoal/95 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-offwhite/60 hover:text-offwhite transition-colors z-10"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center bg-charcoal/50 p-4">
          <img
            src={item.image}
            alt={item.title}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>

        <div className="flex flex-col justify-center text-offwhite p-4">
          <span className="text-gold text-sm tracking-widest uppercase mb-3">
            {item.category}
          </span>
          <h3 className="font-heading text-3xl md:text-4xl mb-4">{item.title}</h3>
          <p className="text-offwhite/70 leading-relaxed mb-6">{item.description}</p>
          
          <div className="py-6 border-y border-offwhite/10 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-offwhite/50">Recommended Service</span>
              <span className="text-offwhite">{item.service}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-offwhite/50">Starting Price</span>
              <span className="text-gold font-heading text-2xl">{item.price}</span>
            </div>
          </div>

          <button
            onClick={scrollToBooking}
            className="px-8 py-4 bg-gold text-charcoal hover:bg-gold/90 transition-all tracking-widest self-start"
          >
            BOOK THIS LOOK
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Lookbook() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedItem, setSelectedItem] = useState(null)

  const filteredItems = activeCategory === 'All'
    ? galleryData
    : galleryData.filter((item) => item.category === activeCategory)

  return (
    <section id="gallery" className="py-24 px-6 bg-offwhite">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-heading text-charcoal text-4xl md:text-5xl mb-4">Couture Lookbook</h2>
          <p className="text-charcoal/60">Inspiration for your next appointment</p>
        </div>

        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 text-sm tracking-wider transition-all ${
                activeCategory === category
                  ? 'bg-charcoal text-offwhite'
                  : 'border border-charcoal/20 text-charcoal/60 hover:border-gold hover:text-gold'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="break-inside-avoid group cursor-pointer relative overflow-hidden bg-charcoal/5"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <div>
                  <span className="text-gold text-xs tracking-wider uppercase">{item.category}</span>
                  <h4 className="text-offwhite font-heading text-lg">{item.title}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedItem && (
        <Lightbox item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </section>
  )
}
