import { Leaf, Armchair, HandHeart } from "lucide-react"

const reasons = [
  {
    icon: Leaf,
    title: "Premium Non-Toxic Products",
    desc: "Your health and safety are our highest priority.",
  },
  {
    icon: Armchair,
    title: "Thoughtfully Curated Comfort",
    desc: "We use only high-quality, clean, and luxurious brands.",
  },
  {
    icon: HandHeart,
    title: "Personalized Service",
    desc: "We take the time to understand and care for you.",
  },
]

export function WhyChoose() {
  return (
    <section id="gallery" className="grid bg-card lg:grid-cols-[0.85fr_1.6fr]">
      {/* Flowers image */}
      <div className="relative min-h-[300px] lg:min-h-full">
        <img
          src="/images/flowers-vases.png"
          alt="Ceramic vases with fresh white and pink roses on a wooden table"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
        <h2 className="text-center font-heading text-3xl font-medium uppercase tracking-[0.1em] text-foreground sm:text-4xl">
          Why Clients Choose Nail Couture
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {reasons.map((r) => (
            <div key={r.title} className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/50">
                <r.icon className="h-7 w-7 text-primary" strokeWidth={1.4} />
              </span>
              <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {r.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {r.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-border pt-10">
          <h3 className="font-heading text-2xl font-medium uppercase tracking-[0.08em] text-foreground">
            Our Story
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Nail Couture was created with a simple vision:
          </p>
          <p className="mt-2 font-heading text-lg italic leading-relaxed text-primary">
            To bring elevated beauty, meticulous care, and genuine hospitality
            to Uptown New Orleans.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Every detail&mdash;from our premium materials and medical-grade
            sterilization standards to our carefully selected furnishings&mdash;has
            been chosen to create an experience that feels luxurious, welcoming,
            and uniquely personal. We believe self-care is more than a service.
            It&apos;s a moment of connection, confidence, and renewal. Our
            mission is to make every visit one in which you feel your absolute
            best.
          </p>
        </div>
      </div>
    </section>
  )
}
