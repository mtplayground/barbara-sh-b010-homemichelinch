import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import type { GuideResponse } from "@app/shared";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChefHat,
  Clock3,
  ImageIcon,
  Lightbulb,
  ListChecks,
  Loader2,
  PlayCircle,
  RefreshCcw,
  Search,
  Sparkles,
  Utensils,
  Video,
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
const INGREDIENT_GROUP_ORDER = ["Main", "Marinade & Seasoning", "Sauce", "Garnish"];

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
        <RecipeStats guide={guide} />
      </div>

      <MediaBlocks media={response.media} title={guide.title} />

      <IngredientsBlock guide={guide} />
      <RecipeBlock guide={guide} />

      <MichelinChefMode guide={guide} />
    </div>
  );
}

function RecipeStats({ guide }: { guide: GuideResponse["guide"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <GuideMetric label="Prep" value={`${guide.recipe.prepTimeMinutes} min`} />
      <GuideMetric label="Cook" value={`${guide.recipe.cookTimeMinutes} min`} />
      <GuideMetric label="Total" value={`${guide.recipe.totalTimeMinutes} min`} />
      <GuideMetric label="Serves" value={String(guide.recipe.servings)} />
      <GuideMetric label="Difficulty" value={guide.recipe.difficulty} />
    </div>
  );
}

function IngredientsBlock({ guide }: { guide: GuideResponse["guide"] }) {
  const orderedGroups = getOrderedIngredientGroups(guide.ingredients);

  return (
    <section className="rounded-lg border border-border bg-background/45 p-4">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="overline">Ingredients</p>
          <h3 className="mt-1 text-2xl">Mise en place</h3>
        </div>
        <Badge variant="outline">
          <ListChecks className="mr-1 size-3.5" aria-hidden="true" />
          {orderedGroups.reduce((total, group) => total + group.items.length, 0)} items
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {orderedGroups.map((group) => (
          <div
            className="rounded-md border border-border/70 bg-background/70 p-4"
            key={group.group}
          >
            <h4 className="text-lg">{group.group}</h4>
            <div className="mt-3 divide-y divide-border/60">
              {group.items.map((ingredient) => (
                <div
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)_minmax(120px,0.35fr)]"
                  key={`${group.group}-${ingredient.name}-${ingredient.metric}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {ingredient.name}
                    </p>
                    {ingredient.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ingredient.notes}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{ingredient.metric}</p>
                  <p className="text-sm text-muted-foreground">{ingredient.us}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecipeBlock({ guide }: { guide: GuideResponse["guide"] }) {
  const speech = useSpeechSynthesis();
  const recipeNarration = buildRecipeNarration(guide);

  return (
    <section className="rounded-lg border border-border bg-background/45 p-4">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="overline">Recipe</p>
          <h3 className="mt-1 text-2xl">Method</h3>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Badge variant="gold">
            <BookOpen className="mr-1 size-3.5" aria-hidden="true" />
            {guide.recipe.steps.length} steps
          </Badge>
          {speech.isSupported ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (speech.isSpeaking) {
                  speech.cancel();
                  return;
                }

                speech.speak(recipeNarration, { lang: "en-US", rate: 0.9 });
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
              {speech.isSpeaking ? "Stop reading" : "Read recipe aloud"}
            </Button>
          ) : null}
        </div>
      </div>

      <ol className="mt-5 space-y-4">
        {guide.recipe.steps.map((step) => (
          <li
            className="rounded-md border border-border/70 bg-background/70 p-4"
            key={step.order}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {step.order}
                </span>
                <div className="min-w-0">
                  <h4 className="text-lg">{step.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{step.instruction}</p>
                </div>
              </div>
              {step.durationMinutes !== undefined ? (
                <Badge className="shrink-0" variant="outline">
                  <Clock3 className="mr-1 size-3.5" aria-hidden="true" />
                  {step.durationMinutes} min
                </Badge>
              ) : null}
            </div>

            {step.cues.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {step.cues.map((cue) => (
                  <Badge key={`${step.order}-${cue}`} variant="secondary">
                    {cue}
                  </Badge>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <GuidanceList
          icon={<Lightbulb className="size-4" aria-hidden="true" />}
          items={guide.chefTips}
          title="Chef tips"
        />
        <GuidanceList
          icon={<AlertTriangle className="size-4" aria-hidden="true" />}
          items={guide.commonMistakes}
          title="Common mistakes"
        />
        <PlatingBlock guide={guide} />
      </div>
    </section>
  );
}

function MichelinChefMode({ guide }: { guide: GuideResponse["guide"] }) {
  return (
    <section className="rounded-lg border border-gold/35 bg-gold-soft/55 p-4 shadow-gold">
      <div className="flex flex-col gap-3 border-b border-gold/30 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="overline text-primary">Michelin Chef Mode</p>
          <h3 className="mt-1 text-2xl">{guide.michelinRewrite.title}</h3>
        </div>
        <Badge variant="wine">
          <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
          Chef finish
        </Badge>
      </div>

      <p className="mt-5 text-base leading-7 text-foreground">
        {guide.michelinRewrite.description}
      </p>

      {guide.michelinRewrite.techniqueNotes.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {guide.michelinRewrite.techniqueNotes.map((note) => (
            <div
              className="rounded-md border border-gold/30 bg-background/65 p-4"
              key={note}
            >
              <div className="flex gap-3">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                </span>
                <p className="text-sm leading-6 text-muted-foreground">{note}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function buildRecipeNarration(guide: GuideResponse["guide"]): string {
  const ingredientNarration = getOrderedIngredientGroups(guide.ingredients)
    .map((group) => {
      const items = group.items
        .map((ingredient) => {
          const note = ingredient.notes ? `, ${ingredient.notes}` : "";
          return `${ingredient.name}, ${ingredient.metric}, or ${ingredient.us}${note}`;
        })
        .join("; ");

      return `${group.group}: ${items}.`;
    })
    .join("\n");

  const stepNarration = guide.recipe.steps
    .map((step) => {
      const duration =
        step.durationMinutes !== undefined ? ` ${step.durationMinutes} minutes.` : "";
      const cues = step.cues.length > 0 ? ` Look for ${step.cues.join(", ")}.` : "";
      return `Step ${step.order}. ${step.title}. ${step.instruction}${duration}${cues}`;
    })
    .join("\n");

  const chefTips =
    guide.chefTips.length > 0 ? `Chef tips. ${guide.chefTips.join(". ")}.` : "";
  const commonMistakes =
    guide.commonMistakes.length > 0
      ? `Common mistakes. ${guide.commonMistakes.join(". ")}.`
      : "";
  const platingGarnishes =
    guide.plating.garnishes.length > 0
      ? ` Garnish with ${guide.plating.garnishes.join(", ")}.`
      : "";

  return [
    `${guide.title}. ${guide.originalName}.`,
    `Serves ${guide.recipe.servings}. Prep time ${guide.recipe.prepTimeMinutes} minutes. Cook time ${guide.recipe.cookTimeMinutes} minutes. Total time ${guide.recipe.totalTimeMinutes} minutes. Difficulty ${guide.recipe.difficulty}.`,
    `Ingredients.\n${ingredientNarration}`,
    `Method.\n${stepNarration}`,
    chefTips,
    commonMistakes,
    `Plating. ${guide.plating.description}.${platingGarnishes}`,
    `Michelin Chef Mode. ${guide.michelinRewrite.title}. ${guide.michelinRewrite.description}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function GuidanceList({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 p-4">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h4 className="text-lg">{title}</h4>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li className="text-sm text-muted-foreground" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlatingBlock({ guide }: { guide: GuideResponse["guide"] }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 p-4">
      <div className="flex items-center gap-2">
        <span className="text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <h4 className="text-lg">Plating</h4>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{guide.plating.description}</p>
      {guide.plating.garnishes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {guide.plating.garnishes.map((garnish) => (
            <Badge key={garnish} variant="gold">
              {garnish}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getOrderedIngredientGroups(groups: GuideResponse["guide"]["ingredients"]) {
  return [...groups].sort((left, right) => {
    const leftIndex = INGREDIENT_GROUP_ORDER.indexOf(left.group);
    const rightIndex = INGREDIENT_GROUP_ORDER.indexOf(right.group);
    return normalizeSortIndex(leftIndex) - normalizeSortIndex(rightIndex);
  });
}

function normalizeSortIndex(index: number): number {
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function MediaBlocks({ media, title }: { media: GuideResponse["media"]; title: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <DishPhotoBlock media={media} title={title} />
      <VideoEmbedBlock media={media} title={title} />
    </div>
  );
}

function DishPhotoBlock({
  media,
  title,
}: {
  media: GuideResponse["media"];
  title: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = media.photo?.url;
  const canShowPhoto = Boolean(photoUrl) && !imageFailed;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background/45">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <div>
          <p className="overline">Photo</p>
          <h3 className="mt-1 text-xl">Dish portrait</h3>
        </div>
        <Badge variant={canShowPhoto ? "gold" : "outline"}>
          <ImageIcon className="mr-1 size-3.5" aria-hidden="true" />
          {canShowPhoto ? "Ready" : "Pending"}
        </Badge>
      </div>

      <div className="aspect-[4/3] bg-muted">
        {canShowPhoto ? (
          <img
            alt={`${title} plated dish`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={photoUrl}
          />
        ) : (
          <MediaFallback
            icon={<ImageIcon className="size-8" aria-hidden="true" />}
            title="Photo pending"
            copy="A signed dish photo will appear here when media enrichment is ready."
          />
        )}
      </div>
    </section>
  );
}

function VideoEmbedBlock({
  media,
  title,
}: {
  media: GuideResponse["media"];
  title: string;
}) {
  const embedUrl = getYouTubeEmbedUrl(media.youtube);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background/45">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <div>
          <p className="overline">Video</p>
          <h3 className="mt-1 text-xl">Cooking reference</h3>
        </div>
        <Badge variant={embedUrl ? "gold" : "outline"}>
          <Video className="mr-1 size-3.5" aria-hidden="true" />
          {embedUrl ? "Embed" : "Pending"}
        </Badge>
      </div>

      <div className="aspect-video bg-muted">
        {embedUrl ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl}
            title={`${title} cooking video`}
          />
        ) : (
          <MediaFallback
            icon={<PlayCircle className="size-8" aria-hidden="true" />}
            title="Video pending"
            copy="An embeddable cooking video will appear here when media enrichment is ready."
          />
        )}
      </div>
    </section>
  );
}

function MediaFallback({
  copy,
  icon,
  title,
}: {
  copy: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-md bg-secondary text-primary">
        {icon}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

function getYouTubeEmbedUrl(youtube: GuideResponse["media"]["youtube"]): string | null {
  if (youtube?.embedUrl && isAllowedYouTubeEmbedUrl(youtube.embedUrl)) {
    return youtube.embedUrl;
  }

  if (youtube?.videoId && /^[A-Za-z0-9_-]{6,20}$/.test(youtube.videoId)) {
    return `https://www.youtube-nocookie.com/embed/${youtube.videoId}`;
  }

  return null;
}

function isAllowedYouTubeEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.hostname === "www.youtube.com" ||
        url.hostname === "www.youtube-nocookie.com") &&
      url.pathname.startsWith("/embed/")
    );
  } catch {
    return false;
  }
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
