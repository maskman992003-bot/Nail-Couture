import { Sparkles, Wind, Droplets, Heart } from "lucide-react"

const items = [
  { icon: Sparkles, label: "Relax" },
  { icon: Wind, label: "Unwind" },
  { icon: Droplets, label: "Refresh" },
  { icon: Heart, label: "Renew" },
]

export function ExperienceSection() {
  return (
    <section id="experience" className="border-y border-border/60 bg-card">
      <div className="mx-auto grid max-w-7xl items-stretch gap-0 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-medium uppercase tracking-[0.1em] text-foreground sm:text-4xl">
            The Nail Couture
            <br />
            Experience
          </h2>
          <span className="mt-4 block h-px w-16 bg-primary/50" />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Every detail has been carefully curated to create an atmosphere of
            calm, luxury, and beauty.
          </p>

          <div className="mt-9 grid grid-cols-4 gap-4">
            {items.map((it) => (
              <div key={it.label} className="flex flex-col items-center gap-3">
                <it.icon className="h-6 w-6 text-primary" strokeWidth={1.4} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
                  {it.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[300px] lg:min-h-[460px]">
          <img
            src="/images/experience-chairs.png"
            alt="Row of luxury beige pedicure spa chairs in an elegant nail salon"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
