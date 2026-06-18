import { ShieldCheck, Leaf, Heart, UserRound, Gem } from "lucide-react"

const features = [
  {
    icon: ShieldCheck,
    title: "Medical-Grade Sterilization",
    desc: "Hospital-level protocols for your safety and peace of mind.",
  },
  {
    icon: Leaf,
    title: "Non-Toxic Premium Products",
    desc: "Carefully selected, clean and luxurious.",
  },
  {
    icon: Heart,
    title: "Beauty + Care Affection",
    desc: "More than a service, a moment for you.",
  },
  {
    icon: UserRound,
    title: "Expert Technicians",
    desc: "Highly trained specialists in precision nail artistry.",
  },
  {
    icon: Gem,
    title: "Luxury Experience",
    desc: "Elevated ambience and unparalleled comfort.",
  },
]

export function FeatureBar() {
  return (
    <section className="border-y border-border/60 bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex flex-col items-center px-2 text-center"
          >
            <f.icon className="h-7 w-7 text-primary" strokeWidth={1.4} />
            <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              {f.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
