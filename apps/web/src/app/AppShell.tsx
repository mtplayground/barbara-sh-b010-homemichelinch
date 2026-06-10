import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { GuideResponse } from "@app/shared";
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock3,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Utensils,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createGuide, GuideApiError } from "@/features/guide/api";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

type FormError = string | null;

export function AppShell() {
  const [dish, setDish] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<FormError>(null);
  const guideMutation = useMutation({
    mutationFn: createGuide,
  });
  const isLoading = guideMutation.isPending;
  const resultState = isLoading
    ? "loading"
    : guideMutation.data
      ? "ready"
      : guideMutation.error
        ? "error"
        : "empty";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <AppHeader />

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] lg:py-7">
          <InputPanel
            dish={dish}
            formError={formError}
            isLoading={isLoading}
            notes={notes}
            onDishChange={(value) => {
              setDish(value);
              setFormError(null);
            }}
            onNotesChange={setNotes}
            onReset={() => {
              setDish("");
              setNotes("");
              setFormError(null);
              guideMutation.reset();
            }}
            onSubmit={() => {
              const trimmedDish = dish.trim();

              if (!trimmedDish) {
                setFormError("Enter a dish name before preparing the guide.");
                return;
              }

              setFormError(null);
              guideMutation.mutate({
                dish: trimmedDish,
                notes: notes.trim() || undefined,
              });
            }}
          />
          <ResultsPanel
            error={guideMutation.error}
            guideResponse={guideMutation.data}
            onUseSuggestion={(suggestedDishName) => {
              setDish(suggestedDishName);
              setFormError(null);
              guideMutation.mutate({
                dish: suggestedDishName,
                notes: notes.trim() || undefined,
              });
            }}
            state={resultState}
          />
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
  dish: string;
  formError: FormError;
  isLoading: boolean;
  notes: string;
  onDishChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onReset: () => void;
  onSubmit: () => void;
}

function InputPanel({
  dish,
  formError,
  isLoading,
  notes,
  onDishChange,
  onNotesChange,
  onReset,
  onSubmit,
}: InputPanelProps) {
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
          <Input
            aria-invalid={Boolean(formError)}
            autoComplete="off"
            disabled={isLoading}
            id="dish-name"
            name="dish"
            onChange={(event) => onDishChange(event.target.value)}
            placeholder="鱼香肉丝"
            value={dish}
          />
          {formError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {formError}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="dish-notes">
            Notes
          </label>
          <Textarea
            disabled={isLoading}
            id="dish-notes"
            name="notes"
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Weeknight dinner, moderate heat, serves four"
            value={notes}
          />
        </div>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Button className="w-full sm:flex-1" disabled={isLoading} type="submit">
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            {isLoading ? "Preparing" : "Prepare guide"}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={isLoading && !dish && !notes}
            onClick={onReset}
            type="button"
            variant="outline"
          >
            <RefreshCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </form>
    </section>
  );
}

type ResultState = "empty" | "loading" | "ready" | "error";

interface ResultsPanelProps {
  error: Error | null;
  guideResponse?: GuideResponse;
  onUseSuggestion: (suggestedDishName: string) => void;
  state: ResultState;
}

function ResultsPanel({
  error,
  guideResponse,
  onUseSuggestion,
  state,
}: ResultsPanelProps) {
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
        {state === "ready" ? (
          <Badge variant={guideResponse?.cache.hit ? "outline" : "gold"}>
            <CheckCircle2 className="mr-1 size-3.5" aria-hidden="true" />
            {guideResponse?.cache.hit ? "Cached" : "Fresh"}
          </Badge>
        ) : null}
      </div>

      {state === "loading" ? <LoadingState /> : null}
      {state === "error" ? <ErrorState error={error} /> : null}
      {state === "ready" && guideResponse ? (
        <GuidePreview response={guideResponse} onUseSuggestion={onUseSuggestion} />
      ) : null}
      {state === "empty" ? <EmptyState /> : null}
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

function ErrorState({ error }: { error: Error | null }) {
  const message =
    error instanceof GuideApiError
      ? error.message
      : "The guide service could not complete the request.";

  return (
    <div className="flex flex-1 flex-col justify-center rounded-lg border border-destructive/30 bg-background/45 px-6 py-12">
      <div className="mb-5 flex size-14 items-center justify-center rounded-md bg-destructive text-destructive-foreground">
        <AlertCircle className="size-7" aria-hidden="true" />
      </div>
      <h3 className="text-2xl">Guide unavailable</h3>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function GuidePreview({
  response,
  onUseSuggestion,
}: {
  response: GuideResponse;
  onUseSuggestion: (suggestedDishName: string) => void;
}) {
  const { guide } = response;
  const closestMatch = guide.closestMatch;

  return (
    <div className="flex flex-1 flex-col gap-5">
      {closestMatch ? (
        <div className="rounded-lg border border-gold/30 bg-gold-soft/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Closest match: {closestMatch.suggestedDishName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{closestMatch.reason}</p>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => onUseSuggestion(closestMatch.suggestedDishName)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Search className="size-4" aria-hidden="true" />
              Use match
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <DishTitlePronunciation guide={guide} />

        <div className="grid gap-3 sm:grid-cols-3">
          <GuideMetric label="Difficulty" value={guide.recipe.difficulty} />
          <GuideMetric label="Total" value={`${guide.recipe.totalTimeMinutes} min`} />
          <GuideMetric label="Serves" value={String(guide.recipe.servings)} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-background/45 p-4">
          <h3 className="text-xl">Ingredients</h3>
          <div className="mt-4 space-y-3">
            {guide.ingredients.slice(0, 3).map((group) => (
              <div key={group.group}>
                <p className="text-sm font-semibold">{group.group}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.items
                    .slice(0, 3)
                    .map((item) => item.name)
                    .join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background/45 p-4">
          <h3 className="text-xl">First steps</h3>
          <ol className="mt-4 space-y-3">
            {guide.recipe.steps.slice(0, 3).map((step) => (
              <li className="text-sm text-muted-foreground" key={step.order}>
                <span className="font-semibold text-foreground">
                  {step.order}. {step.title}
                </span>
                <span className="block">{step.instruction}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-background/45 p-4">
        <h3 className="text-xl">{guide.michelinRewrite.title}</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {guide.michelinRewrite.description}
        </p>
      </section>
    </div>
  );
}

function DishTitlePronunciation({ guide }: { guide: GuideResponse["guide"] }) {
  const speech = useSpeechSynthesis();
  const pronunciationText = [
    guide.pronunciation.pinyin,
    guide.pronunciation.ipa ? guide.pronunciation.ipa : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-lg border border-border bg-background/45 p-4">
      <p className="overline">Dish</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-3xl">{guide.title}</h3>
          <p className="mt-2 text-sm font-semibold text-primary">{guide.originalName}</p>
        </div>
        {speech.isSupported ? (
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              if (speech.isSpeaking) {
                speech.cancel();
                return;
              }

              speech.speak(guide.pronunciation.audioText, { lang: "zh-CN" });
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {speech.isSpeaking ? (
              <VolumeX className="size-4" aria-hidden="true" />
            ) : (
              <Volume2 className="size-4" aria-hidden="true" />
            )}
            {speech.isSpeaking ? "Stop" : "Play pronunciation"}
          </Button>
        ) : null}
      </div>

      <div className="mt-5 rounded-md border border-border/70 bg-background/70 p-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Pronunciation
        </p>
        <p className="mt-2 text-base font-semibold text-foreground">
          {pronunciationText}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {guide.pronunciation.audioText}
        </p>
      </div>
    </section>
  );
}

function GuideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/45 p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
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
