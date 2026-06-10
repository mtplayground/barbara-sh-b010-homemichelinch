import type { HealthResponse } from "@app/shared";
import { ChefHat, Sparkles, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const staticHealthCheck: HealthResponse = {
  ok: true,
  service: "api",
  timestamp: new Date(0).toISOString(),
};

const swatches = [
  ["Background", "bg-background", "text-foreground"],
  ["Charcoal", "bg-foreground", "text-background"],
  ["Gold", "bg-gold", "text-gold-foreground"],
  ["Wine accent", "bg-wine", "text-wine-foreground"],
] as const;

export function App() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="max-w-3xl">
          <Badge variant="gold" className="mb-5">
            <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
            Premium theme tokens
          </Badge>
          <h1>Michelin design system</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Lavender surfaces, charcoal text, gold accents, soft elevation, and a
            serif/sans type pairing are available as Tailwind and shadcn/ui tokens.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
          <section className="surface p-6 md:p-8" aria-labelledby="palette-heading">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="overline">Palette</p>
                <h2 id="palette-heading" className="mt-2">
                  Quiet luxury base
                </h2>
              </div>
              <ChefHat className="size-9 text-primary" aria-hidden="true" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {swatches.map(([label, background, foreground]) => (
                <div
                  className={`${background} ${foreground} rounded-md border border-border/60 p-4 shadow-lift`}
                  key={label}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-8 text-xs opacity-80">theme token</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="surface p-6 md:p-8" aria-labelledby="components-heading">
            <p className="overline">shadcn/ui</p>
            <h2 id="components-heading" className="mt-2">
              Component primitives
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button>
                <Utensils className="size-4" aria-hidden="true" />
                Primary action
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge>Primary</Badge>
              <Badge variant="secondary">Lavender</Badge>
              <Badge variant="wine">Accent</Badge>
              <Badge variant="outline">
                DTO {staticHealthCheck.ok ? "ready" : "pending"}
              </Badge>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
