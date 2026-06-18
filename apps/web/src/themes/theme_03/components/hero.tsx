import { Button } from "@/components/ui/button"

const tags = [
  "Acrylics",
  "Gel X",
  "Builder Gel",
  "Luxury Pedicures",
  "Waxing Refinements",
]

const tags2 = ["Medical-Grade Sterilization", "Non-Toxic Premium Products"]

export function Hero() {
  return (
    <section id="home" className="bg-background">
      <div className="mx-auto grid max-w-7xl items-stretch gap-0 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Left copy */}
        <div className="flex flex-col justify-center py-12 lg:py-20 lg:pr-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary">
            Luxury Nail &amp; Beauty Lounge
          </p>
          <h1 className="mt-4 font-heading text-6xl font-medium leading-[0.95] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
            Nail
            <br />
            Couture
          </h1>

          <p className="mt-5 font-heading text-2xl italic text-foreground/80">
            Beauty <span className="text-primary">&middot;</span> Care{" "}
            <span className="text-primary">&middot;</span> Affection
          </p>
          <p className="mt-2 font-heading text-lg italic text-primary">
            Opening Soon <span className="not-italic">&middot;</span> Uptown New
            Orleans
          </p>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Designed to help you feel beautiful, cared for, and completely at
            ease.
          </p>

          <div className="mt-7 space-y-2">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
              {tags.map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  {t}
                  {i < tags.length - 1 && (
                    <span className="text-primary/60">&middot;</span>
                  )}
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
              {tags2.map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  {t}
                  {i < tags2.length - 1 && (
                    <span className="text-primary/60">&middot;</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              className="rounded-none bg-primary px-6 py-5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground hover:bg-primary/90"
            >
              <a href="#contact">Join Our VIP Founding List</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-none border-primary/40 bg-transparent px-6 py-5 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground hover:bg-accent/40"
            >
              <a href="#services">View Services</a>
            </Button>
          </div>
        </div>

        {/* Right image */}
        <div className="relative min-h-[320px] lg:min-h-[640px]">
          <img
            src="/images/hero-reception.png"
            alt="Nail Couture luxury salon reception with glowing gold monogram and white roses"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
