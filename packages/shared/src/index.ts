export interface HealthResponse {
  ok: true;
  service: "api";
  timestamp: string;
}

export function createHealthResponse(now: Date = new Date()): HealthResponse {
  return {
    ok: true,
    service: "api",
    timestamp: now.toISOString(),
  };
}

export interface GuideRequest {
  dish: string;
  notes?: string;
}

export interface GuideResponse {
  cache: {
    hit: boolean;
    key: string;
    updatedAt?: string;
  };
  guide: GeneratedDishGuide;
  media: GuideMedia;
}

export interface GeneratedDishGuide {
  isClearDish: boolean;
  closestMatch: {
    suggestedDishName: string;
    reason: string;
  } | null;
  title: string;
  originalName: string;
  pronunciation: {
    pinyin: string;
    ipa?: string;
    audioText: string;
  };
  ingredients: IngredientGroup[];
  recipe: {
    servings: number;
    prepTimeMinutes: number;
    cookTimeMinutes: number;
    totalTimeMinutes: number;
    difficulty: "Easy" | "Medium" | "Hard";
    steps: RecipeStep[];
  };
  chefTips: string[];
  commonMistakes: string[];
  plating: {
    description: string;
    garnishes: string[];
  };
  michelinRewrite: {
    title: string;
    description: string;
    techniqueNotes: string[];
  };
}

export interface IngredientGroup {
  group: "Main" | "Marinade & Seasoning" | "Sauce" | "Garnish";
  items: Ingredient[];
}

export interface Ingredient {
  name: string;
  metric: string;
  us: string;
  notes?: string;
}

export interface RecipeStep {
  order: number;
  title: string;
  instruction: string;
  durationMinutes?: number;
  cues: string[];
}

export interface GuideMedia {
  status: "pending" | "ready" | "partial";
  youtube?: {
    videoId?: string;
    embedUrl?: string;
  };
  photo?: {
    objectKey?: string;
    url?: string;
  };
}
