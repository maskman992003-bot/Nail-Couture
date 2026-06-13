import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Activity, Beaker } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getFitnessAssessmentPath, getNailAssessmentPath } from '@nail-couture/shared/utils/routes';

const TOOLS = [
  {
    id: 'nail',
    title: 'Nail Health Assessment',
    description:
      'Instant chemistry recommendations, prep protocols, and maintenance timelines based on your nail structure and lifestyle.',
    hrefKey: 'nail',
    icon: Beaker,
    cta: 'Start nail diagnostic',
  },
  {
    id: 'fitness',
    title: 'Fitness Assessment',
    description:
      'Real-time BMI, BMR, TDEE, and body fat calculations with personalized calorie targets — no submit button needed.',
    hrefKey: 'fitness',
    icon: Activity,
    cta: 'Open fitness dashboard',
  },
];

export default function WellnessToolsPromo({ className, id = 'wellness-tools', compact = false }) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const hrefs = {
    fitness: user?.role ? getFitnessAssessmentPath(user.role) : '/fitness-assessment',
    nail: user?.role ? getNailAssessmentPath(user.role) : '/nail-assessment',
  };

  const cardClass = clsx(
    'group rounded-2xl border p-6 transition-all duration-300 hover:border-gold/40 hover:-translate-y-0.5',
    theme === 'dark'
      ? 'border-gold/20 bg-offwhite/[0.02] hover:bg-offwhite/[0.04]'
      : 'border-gold/30 bg-white hover:bg-gold/[0.03]',
  );

  return (
    <section
      id={id}
      className={clsx(
        'py-20 px-4 sm:px-6',
        theme === 'dark' ? 'bg-charcoal' : 'bg-cream',
        className,
      )}
    >
      <div className="max-w-6xl mx-auto">
        {!compact && (
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-3">Wellness Tools</p>
            <h2 className="font-heading text-3xl md:text-4xl text-gold mb-3">Plan Your Care in Real Time</h2>
            <p className={`text-sm max-w-2xl mx-auto ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>
              Free interactive dashboards for nail diagnostics and fitness metrics. Results update instantly as you
              adjust your inputs — save to your profile when you are logged in.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const href = hrefs[tool.hrefKey];

            return (
              <Link key={tool.id} to={href} className={cardClass}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Free tool</p>
                    <h3 className="font-heading text-xl text-gold-strong">{tool.title}</h3>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
                <p className={`text-sm mb-5 leading-relaxed ${theme === 'dark' ? 'text-offwhite/60' : 'text-charcoal/60'}`}>
                  {tool.description}
                </p>
                <span className="inline-flex items-center text-sm font-medium text-gold group-hover:underline">
                  {tool.cta} →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
