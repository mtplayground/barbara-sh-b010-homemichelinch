import { useState } from "react";
import { ChefHat, Clock3, Loader2, Search, Sparkles, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type ResultState = "empty" | "loading";

export function AppShell() {
  const [resultState, setResultState] = useState<ResultState>("empty");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <AppHeader />

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] lg:py-7">
          <InputPanel
            isLoading={resultState === "loading"}
            onReset={() => setResultState("empty")}
            onSubmit={() => setResultState("loading")}
          />
          <ResultsPanel state={resultState} />
        </div>
      </div>
    </main>
  );
}

function AppHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-gold">
          <ChefHat className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="overline">Michelin mode</p>
          <h1 className="mt-1 truncate text-2xl font-medium leading-tight md:text-3xl">
            Dish guide
          </h1>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="gold">Lavender</Badge>
        <Badge variant="outline">Charcoal</Badge>
        <Badge variant="wine">Gold accents</Badge>
      </div>
    </header>
  );
}

interface InputPanelProps {
  isLoading: boolean;
  onReset: () => void;
  onSubmit: () => void;
}

function InputPanel({ isLoading, onReset, onSubmit }: InputPanelProps) {
  return (
    <section className="surface flex flex-col p-5 md:p-6" aria-labelledby="input-heading">
      <div className="mb-6">
        <Badge variant="secondary" className="mb-4">
          <Utensils className="mr-1 size-3.5" aria-hidden="true" />
          Input
        </Badge>
        <h2 id="input-heading" className="text-3xl md:text-4xl">
          Choose a dish
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter a Chinese dish name and any kitchen notes for the guide.
        </p>
      </div>

      <form
        className="flex flex-1 flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="dish-name">
            Dish name
          </label>
          <Input autoComplete="off" id="dish-name" name="dish" placeholder="鱼香肉丝" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="dish-notes">
            Notes
          </label>
          <Textarea
            id="dish-notes"
            name="notes"
            placeholder="Weeknight dinner, moderate heat, serves four"
          />
        </div>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Button className="w-full sm:flex-1" disabled={isLoading} type="submit">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            Prepare guide
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={onReset}
            type="button"
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </form>
    </section>
  );
}

interface ResultsPanelProps {
  state: ResultState;
}

function ResultsPanel({ state }: ResultsPanelProps) {
  return (
    <section
      className="surface flex min-h-[520px] flex-col p-5 md:p-6"
      aria-live="polite"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="gold" className="mb-4">
            <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
            Results
          </Badge>
          <h2 className="text-3xl md:text-4xl">Guide preview</h2>
        </div>
        {state === "loading" ? (
          <Badge variant="outline">
            <Clock3 className="mr-1 size-3.5" aria-hidden="true" />
            Building
          </Badge>
        ) : null}
      </div>

      {state === "loading" ? <LoadingState /> : <EmptyState />}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/45 px-6 py-12 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-md bg-secondary text-primary">
        <ChefHat className="size-7" aria-hidden="true" />
      </div>
      <h3 className="text-2xl">No guide yet</h3>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The finished guide will appear here with pronunciation, media, ingredients, recipe
        steps, and chef guidance.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
