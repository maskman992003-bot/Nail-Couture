import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { FeatureBar } from "@/components/feature-bar"
import { SignatureServices } from "@/components/signature-services"
import { ExperienceSection } from "@/components/experience-section"
import { OpeningSoon } from "@/components/opening-soon"
import { WhyChoose } from "@/components/why-choose"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <FeatureBar />
      <SignatureServices />
      <ExperienceSection />
      <OpeningSoon />
      <WhyChoose />
      <SiteFooter />
    </main>
  )
}
