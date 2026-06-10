export interface DishGuidePromptInput {
  dishName: string;
  notes?: string;
}

export const DISH_GUIDE_SYSTEM_PROMPT = [
  "You generate premium Chinese dish cooking guides for home cooks.",
  "Return only valid JSON. Do not wrap JSON in markdown fences.",
  "Use practical culinary judgment and avoid unsupported health or safety claims.",
  "If the user input is ambiguous or misspelled, set isClearDish to false and provide closestMatch while generating the guide for the suggested dish.",
].join(" ");

export function buildDishGuidePrompt(input: DishGuidePromptInput) {
  const notes = input.notes?.trim();

  return `
Generate a complete structured dish guide for this input:

Dish: ${input.dishName}
${notes ? `Cook notes: ${notes}` : "Cook notes: none"}

Return a single JSON object with this exact shape:
{
  "isClearDish": true,
  "closestMatch": null,
  "title": "English display title",
  "originalName": "Original Chinese name when known",
  "pronunciation": {
    "pinyin": "Mandarin pinyin with tone marks or numbers",
    "ipa": "Optional IPA",
    "audioText": "Short phrase suitable for speech synthesis"
  },
  "ingredients": [
    {
      "group": "Main | Marinade & Seasoning | Sauce | Garnish",
      "items": [
        { "name": "ingredient", "metric": "metric amount", "us": "US amount", "notes": "optional note" }
      ]
    }
  ],
  "recipe": {
    "servings": 4,
    "prepTimeMinutes": 20,
    "cookTimeMinutes": 10,
    "totalTimeMinutes": 30,
    "difficulty": "Easy | Medium | Hard",
    "steps": [
      {
        "order": 1,
        "title": "step title",
        "instruction": "specific cooking instruction",
        "durationMinutes": 5,
        "cues": ["visual or aroma cue"]
      }
    ]
  },
  "chefTips": ["specific technique tip"],
  "commonMistakes": ["specific mistake to avoid"],
  "plating": {
    "description": "serving and presentation guidance",
    "garnishes": ["optional garnish"]
  },
  "michelinRewrite": {
    "title": "polished restaurant-style title",
    "description": "elevated menu-style rewrite",
    "techniqueNotes": ["restaurant-level technique note"]
  }
}

Rules:
- Ingredient groups must use only the listed group names.
- Include metric and US amounts for every ingredient.
- Recipe steps must be complete enough to cook the dish without outside context.
- commonMistakes and chefTips must be concrete, not generic.
- If closestMatch is not null, set isClearDish to false and explain the suggestion.
`.trim();
}
