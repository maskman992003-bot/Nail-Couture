import { Construction, Users, Megaphone } from "lucide-react"

const items = [
  { icon: Construction, label: "Construction Updates" },
  { icon: Users, label: "Team Introductions" },
  { icon: Megaphone, label: "Grand Opening Announcement" },
]

export function OpeningSoon() {
  return (
    <section id="about" className="bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-heading text-3xl font-medium uppercase tracking-[0.12em] text-foreground sm:text-4xl">
          Opening Soon
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Follow our journey as Nail Couture prepares to welcome Uptown New
          Orleans.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:divide-x sm:divide-border">
          {items.map((it) => (
            <div
              key={it.label}
              className="flex flex-col items-center gap-4 px-4"
            >
              <it.icon className="h-8 w-8 text-primary" strokeWidth={1.3} />
              <span className="font-heading text-sm uppercase tracking-[0.16em] text-foreground">
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
