"use client"

import type React from "react"

import { Mail, MapPin, Phone, Camera, MessageCircle } from "lucide-react"
import { NCLogo } from "@/components/nc-logo"
import { Button } from "@/components/ui/button"

export function SiteFooter() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.currentTarget.reset()
  }

  return (
    <footer id="contact" className="bg-background">
      {/* VIP signup */}
      <div className="border-y border-border/60 bg-accent/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Mail className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </span>
            <div>
              <h3 className="font-heading text-xl uppercase tracking-[0.1em] text-foreground">
                Be the First to Experience Nail Couture
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Join our VIP Founding List for exclusive offers, early access,
                and grand opening options.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-md gap-2 lg:w-auto"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              aria-label="Email address"
              className="h-11 flex-1 rounded-none border border-border bg-background px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary lg:w-64"
            />
            <Button
              type="submit"
              className="h-11 rounded-none bg-primary px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
            >
              Join Our VIP Founding List
            </Button>
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="text-sm">
          <NCLogo />
          <p className="mt-3 font-heading text-sm italic text-primary">
            Beauty &middot; Care &middot; Affection
          </p>
        </div>

        <div className="space-y-3 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              5500 Tchoupitoulas St #32-24
              <br />
              New Orleans, LA 70115
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-primary" />
            (504) 488-7879
          </p>
        </div>

        <div className="flex flex-col justify-start">
          <span className="font-heading text-sm uppercase tracking-[0.16em] text-foreground">
            Opening Fall 2026
          </span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
            Follow Us
          </p>
          <div className="mt-3 flex gap-3">
            {[Camera, MessageCircle, Phone].map((Icon, i) => (
              <a
                key={i}
                href="#contact"
                aria-label="Social media link"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Nail Couture. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
