import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Armchair,
  Construction,
  Droplets,
  Gem,
  HandHeart,
  Heart,
  Leaf,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wind,
} from 'lucide-react';
import { useAppTheme } from '../../hooks/useAppTheme.js';
import {
  LANDING_EXPERIENCE,
  LANDING_FEATURES,
  LANDING_OPENING,
  LANDING_STORY,
  LANDING_WHY_CHOOSE,
} from '../../themes/landingContent.js';
import { getLandingCssVars, getLandingServices, scrollToLandingHash } from '../../themes/themeUtils.js';
import ThemedLandingFooter from './landing/ThemedLandingFooter.jsx';
import ThemedLandingNav from './landing/ThemedLandingNav.jsx';
import CustomerTestimonials from './CustomerTestimonials.jsx';

import './landing/themedLanding.css';

const ICONS = {
  shield: ShieldCheck,
  leaf: Leaf,
  heart: Heart,
  users: Users,
  sparkles: Sparkles,
  gem: Gem,
  userRound: UserRound,
  wind: Wind,
  droplets: Droplets,
  construction: Construction,
  megaphone: Megaphone,
  armchair: Armchair,
  handHeart: HandHeart,
};

const HERO_TAGS = ['Acrylics', 'Gel X', 'Builder Gel', 'Luxury Pedicures', 'Waxing Refinements'];
const HERO_TAGS_2 = ['Medical-Grade Sterilization', 'Non-Toxic Premium Products'];

function PremiumHero({ themeConfig, assets, onVip, onServices }) {
  return (
    <section id="home" className="landing-hero-pad px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <p className="landing-label mb-4 sm:mb-5">Luxury Nail &amp; Beauty Lounge</p>
          <h1 className="landing-heading text-4xl sm:text-5xl lg:text-[3.75rem] xl:text-[4.25rem] tracking-wide leading-[1.02] mb-3 uppercase">
            Nail Couture
          </h1>
          <p className="landing-heading text-lg sm:text-xl lg:text-2xl italic tracking-wide mb-4" style={{ color: themeConfig.accentColor }}>
            Beauty &bull; Care &bull; Affection
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] font-medium mb-5" style={{ color: themeConfig.accentColor }}>
            Opening Soon &bull; Uptown New Orleans
          </p>
          <p className="text-sm lg:text-[15px] leading-relaxed mb-5 max-w-md" style={{ color: themeConfig.textSecondary }}>
            Designed to help you feel beautiful, cared for, and completely at ease.
          </p>
          <p className="landing-hero-tags text-[9px] sm:text-[10px] uppercase tracking-[0.12em] leading-relaxed mb-8" style={{ color: themeConfig.textSecondary }}>
            {[...HERO_TAGS, ...HERO_TAGS_2].map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={onVip} className="landing-btn-primary">Join Our VIP Founding List</button>
            <button type="button" onClick={onServices} className="landing-btn-outline">View Services</button>
          </div>
        </div>
        <div className="landing-card overflow-hidden rounded-sm">
          <div className="aspect-[16/10] w-full">
            <img src={assets.hero} alt="Nail Couture luxury reception" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

function BoutiqueHero({ themeConfig, assets, onVip, onServices }) {
  return (
    <section id="home">
      <div className="mx-auto grid max-w-7xl items-stretch gap-0 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col justify-center py-10 sm:py-12 lg:py-20 lg:pr-12">
          <p className="landing-label">Luxury Nail &amp; Beauty Lounge</p>
          <h1 className="landing-heading mt-4 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-normal uppercase leading-[0.95] tracking-tight">
            Nail
            <br />
            Couture
          </h1>
          <p className="landing-heading mt-5 text-xl sm:text-2xl font-normal italic" style={{ color: 'rgba(61, 56, 50, 0.85)' }}>
            Beauty <span style={{ color: themeConfig.accentColor }}>&middot;</span> Care{' '}
            <span style={{ color: themeConfig.accentColor }}>&middot;</span> Affection
          </p>
          <p className="landing-heading mt-2 text-base sm:text-lg italic" style={{ color: themeConfig.accentColor }}>
            Opening Soon <span className="not-italic">&middot;</span> Uptown New Orleans
          </p>
          <p className="landing-body mt-6 max-w-md text-sm font-normal leading-relaxed" style={{ color: themeConfig.textSecondary }}>
            Designed to help you feel beautiful, cared for, and completely at ease.
          </p>
          <div className="mt-7 space-y-2">
            {[HERO_TAGS, HERO_TAGS_2].map((group) => (
              <ul key={group[0]} className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(61, 56, 50, 0.7)' }}>
                {group.map((tag, i) => (
                  <li key={tag} className="flex items-center gap-3">
                    {tag}
                    {i < group.length - 1 && <span style={{ color: `${themeConfig.accentColor}99` }}>&middot;</span>}
                  </li>
                ))}
              </ul>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onVip} className="landing-btn-primary">Join Our VIP Founding List</button>
            <button type="button" onClick={onServices} className="landing-btn-outline">View Services</button>
          </div>
        </div>
        <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[640px]">
          <img src={assets.hero} alt="Nail Couture luxury salon reception" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </section>
  );
}

export default function ThemedHomeLanding() {
  const { themeConfig } = useAppTheme();
  const isBoutique = themeConfig.landing?.layout === 'boutique';
  const assets = themeConfig.landing?.assets ?? {};
  const services = getLandingServices(themeConfig);

  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyFont = document.body.style.fontFamily;
    document.body.style.backgroundColor = themeConfig.backgroundColor;
    document.documentElement.style.backgroundColor = themeConfig.backgroundColor;
    document.body.style.fontFamily = themeConfig.fonts.body;
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.fontFamily = prevBodyFont;
    };
  }, [themeConfig]);

  const scrollToVip = () => scrollToLandingHash('#contact');
  const scrollToServices = () => scrollToLandingHash('#services');

  return (
    <div
      className="nc-themed-landing min-h-screen"
      style={getLandingCssVars(themeConfig)}
      data-landing-layout={themeConfig.landing?.layout}
    >
      <ThemedLandingNav themeConfig={themeConfig} onVipClick={scrollToVip} />

      {isBoutique ? (
        <BoutiqueHero themeConfig={themeConfig} assets={assets} onVip={scrollToVip} onServices={scrollToServices} />
      ) : (
        <PremiumHero themeConfig={themeConfig} assets={assets} onVip={scrollToVip} onServices={scrollToServices} />
      )}

      <section
        className={`landing-section px-4 sm:px-6 lg:px-8 border-y ${isBoutique ? '' : ''}`}
        style={{ borderColor: themeConfig.borderColor, backgroundColor: isBoutique ? themeConfig.cardStyle.background : undefined }}
      >
        <div className={`mx-auto grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-3 lg:grid-cols-5 ${isBoutique ? 'max-w-7xl' : 'max-w-[1200px]'}`}>
          {LANDING_FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon] ?? Sparkles;
            return (
              <div key={feature.title} className="flex flex-col items-center px-1 sm:px-2 text-center">
                {isBoutique ? (
                  <Icon className="h-7 w-7 mb-4" style={{ color: themeConfig.accentColor }} strokeWidth={1.4} />
                ) : (
                  <div className="landing-icon-circle">
                    <Icon className="h-5 w-5" strokeWidth={1.25} aria-hidden />
                  </div>
                )}
                <h3 className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] font-bold mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-[11px] sm:text-xs leading-relaxed" style={{ color: themeConfig.textSecondary }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="services" className="landing-section px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto ${isBoutique ? 'max-w-7xl' : 'max-w-[1200px]'}`}>
          <h2 className="landing-heading text-center text-2xl sm:text-3xl lg:text-4xl tracking-[0.1em] uppercase mb-10 lg:mb-14">
            Our Signature Services
          </h2>
          <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 ${isBoutique ? 'sm:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-3 lg:grid-cols-5 lg:gap-2.5'}`}>
            {services.map((service) => (
              <article key={service.name} className={`group flex flex-col ${isBoutique ? '' : 'landing-card overflow-hidden'}`}>
                <div className="aspect-square overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.alt ?? service.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className={isBoutique ? 'mt-4 text-left' : 'p-3 sm:p-4 text-center flex-1 flex flex-col justify-center'}>
                  <h3 className="text-[10px] sm:text-[11px] uppercase tracking-[0.1em] font-bold mb-1.5">{service.name}</h3>
                  <p className="text-[10px] sm:text-[11px] leading-relaxed" style={{ color: themeConfig.textSecondary }}>
                    {service.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/services" className="landing-btn-outline inline-flex">View All Services</Link>
          </div>
        </div>
      </section>

      <section id="experience" className="border-y" style={{ borderColor: themeConfig.borderColor, backgroundColor: isBoutique ? themeConfig.cardStyle.background : undefined }}>
        <div className={`mx-auto ${isBoutique ? 'grid max-w-7xl items-stretch lg:grid-cols-2' : 'landing-section px-4 sm:px-6 lg:px-8 max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center'}`}>
          <div className={isBoutique ? 'flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8' : ''}>
            <h2 className="landing-heading text-2xl sm:text-3xl lg:text-4xl tracking-[0.08em] uppercase mb-4 sm:mb-6 leading-tight">
              {isBoutique ? (
                <>The Nail Couture<br />Experience</>
              ) : (
                'The Nail Couture Experience'
              )}
            </h2>
            {isBoutique && <span className="block h-px w-16 mb-4" style={{ backgroundColor: `${themeConfig.accentColor}80` }} />}
            <p className="text-sm leading-relaxed mb-6 sm:mb-8 max-w-md" style={{ color: themeConfig.textSecondary }}>
              {isBoutique
                ? 'Every detail has been carefully curated to create an atmosphere of calm, luxury, and beauty.'
                : 'From the moment you arrive, every detail is designed to help you unwind in calm, sophisticated luxury. Warm lighting, refined textures, and a team devoted to making your visit feel intentional.'}
            </p>
            <div className={`flex flex-wrap gap-6 sm:gap-8 ${isBoutique ? 'grid grid-cols-4 gap-4' : ''}`}>
              {LANDING_EXPERIENCE.map((item) => {
                const Icon = ICONS[item.icon] ?? Sparkles;
                return (
                  <div key={item.label} className={`text-center ${isBoutique ? 'flex flex-col items-center gap-3' : 'min-w-[4.5rem]'}`}>
                    {isBoutique ? (
                      <Icon className="h-6 w-6" style={{ color: themeConfig.accentColor }} strokeWidth={1.4} />
                    ) : (
                      <div className="landing-icon-circle mb-2">
                        <Icon className="h-5 w-5" strokeWidth={1.25} aria-hidden />
                      </div>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.16em] font-medium">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={isBoutique ? 'relative min-h-[280px] sm:min-h-[360px] lg:min-h-[460px]' : 'landing-card overflow-hidden rounded-sm'}>
            <div className={isBoutique ? 'absolute inset-0' : 'aspect-[16/10] w-full'}>
              <img
                src={assets.experience}
                alt="Nail Couture lounge interior"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="landing-section px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto text-center ${isBoutique ? 'max-w-5xl' : 'max-w-[800px]'}`}>
          <h2 className="landing-heading text-2xl sm:text-3xl lg:text-4xl tracking-[0.1em] uppercase mb-3">Opening Soon</h2>
          <p className="text-sm mb-10 sm:mb-12" style={{ color: themeConfig.textSecondary }}>
            {isBoutique ? 'Follow our journey as Nail Couture prepares to welcome Uptown New Orleans.' : 'Follow our journey...'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0">
            {LANDING_OPENING.map((item, index) => {
              const Icon = ICONS[item.icon] ?? Construction;
              return (
                <div
                  key={item.label}
                  className={`flex flex-col items-center gap-4 px-4 ${index > 0 ? 'sm:border-l' : ''}`}
                  style={index > 0 ? { borderColor: themeConfig.borderColor } : undefined}
                >
                  <Icon className="h-7 w-8" style={{ color: themeConfig.accentColor }} strokeWidth={1.3} />
                  <span className="landing-heading text-xs sm:text-sm uppercase tracking-[0.14em] font-bold leading-snug">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {isBoutique && assets.gallery ? (
        <section id="gallery" className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.6fr]" style={{ backgroundColor: themeConfig.cardStyle.background }}>
          <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-full">
            <img src={assets.gallery} alt="Fresh flowers in ceramic vases" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="px-4 py-12 sm:px-6 lg:px-12 lg:py-20">
            <h2 className="landing-heading text-center text-2xl sm:text-3xl lg:text-4xl uppercase tracking-[0.1em] mb-10 lg:mb-12">
              Why Clients Choose Nail Couture
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10">
              {LANDING_WHY_CHOOSE.map((item) => {
                const Icon = ICONS[item.icon] ?? Heart;
                return (
                  <div key={item.title} className="flex flex-col items-center text-center">
                    <span className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--landing-accent-soft)' }}>
                      <Icon className="h-6 w-7" style={{ color: themeConfig.accentColor }} strokeWidth={1.4} />
                    </span>
                    <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]">{item.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: themeConfig.textSecondary }}>{item.description}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-12 lg:mt-14 border-t pt-8 lg:pt-10" style={{ borderColor: themeConfig.borderColor }}>
              <h3 className="landing-heading text-xl sm:text-2xl uppercase tracking-[0.08em]">{LANDING_STORY.headline}</h3>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: themeConfig.textSecondary }}>Nail Couture was created with a simple vision:</p>
              <p className="landing-heading mt-2 text-base sm:text-lg italic leading-relaxed" style={{ color: themeConfig.accentColor }}>{LANDING_STORY.tagline}</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: themeConfig.textSecondary }}>{LANDING_STORY.boutiqueExtra}</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="landing-section px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1200px] mx-auto">
              <h2 className="landing-heading text-center text-2xl sm:text-3xl lg:text-4xl tracking-[0.08em] uppercase mb-10 lg:mb-14">
                Why Clients Choose Nail Couture
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
                {LANDING_WHY_CHOOSE.map((item) => {
                  const Icon = ICONS[item.icon] ?? Heart;
                  return (
                    <div key={item.title} className="text-center px-4">
                      <div className="landing-icon-circle">
                        <Icon className="h-6 w-6" strokeWidth={1.25} aria-hidden />
                      </div>
                      <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold mb-3 leading-snug">{item.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: themeConfig.textSecondary }}>{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {assets.story && (
            <section id="story" className="landing-section px-4 sm:px-6 lg:px-8 border-t" style={{ borderColor: themeConfig.borderColor }}>
              <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start">
                <div className="landing-card overflow-hidden max-w-sm mx-auto lg:mx-0 rounded-sm">
                  <div className="aspect-[3/4] w-full">
                    <img src={assets.story} alt="Nail Couture brand detail" className="h-full w-full object-cover" />
                  </div>
                </div>
                <div>
                  <h2 className="landing-heading text-2xl sm:text-3xl lg:text-4xl tracking-[0.08em] uppercase mb-6">{LANDING_STORY.headline}</h2>
                  <p className="landing-heading text-base sm:text-lg italic mb-6 leading-relaxed" style={{ color: themeConfig.accentColor }}>
                    {LANDING_STORY.tagline}
                  </p>
                  <div className="space-y-4 text-sm leading-relaxed" style={{ color: themeConfig.textSecondary }}>
                    {LANDING_STORY.paragraphs.map((paragraph) => (
                      <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {isBoutique && <CustomerTestimonials />}

      <ThemedLandingFooter />
    </div>
  );
}
