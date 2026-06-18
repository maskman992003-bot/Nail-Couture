import { Button } from "@/components/ui/button"

const services = [
  {
    name: "Acrylics",
    desc: "Strong, stylish, and beautifully sculpted.",
    img: "/images/service-acrylics.png",
    alt: "Hands with nude pink acrylic nails",
  },
  {
    name: "Gel X",
    desc: "Lightweight, natural-looking perfection.",
    img: "/images/service-gelx.png",
    alt: "Hands with natural gel nails",
  },
  {
    name: "Builder Gel",
    desc: "Strength with elegance. Built to last.",
    img: "/images/service-builder.png",
    alt: "Hands with pink builder gel nails",
  },
  {
    name: "Luxury Pedicures",
    desc: "Indulgent rituals for healthy, beautiful feet.",
    img: "/images/service-pedicure.png",
    alt: "Luxury pedicure with flowers in spa bowl",
  },
  {
    name: "Waxing Refinements",
    desc: "Expert waxing for smooth, refined results.",
    img: "/images/service-waxing.png",
    alt: "Woman receiving a facial waxing treatment",
  },
]

export function SignatureServices() {
  return (
    <section id="services" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="text-center font-heading text-3xl font-medium uppercase tracking-[0.12em] text-foreground sm:text-4xl">
          Our Signature Services
        </h2>

        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {services.map((s) => (
            <article key={s.name} className="group flex flex-col">
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={s.img || "/placeholder.svg"}
                  alt={s.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                {s.name}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button
            asChild
            variant="outline"
            className="rounded-none border-primary/40 bg-transparent px-7 py-5 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground hover:bg-accent/40"
          >
            <a href="#services">View All Services</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
