import { z } from "zod";

const requiredText = z.string().trim().min(1);

export const IngredientGroupNameSchema = z.enum([
  "Main",
  "Marinade & Seasoning",
  "Sauce",
  "Garnish",
]);

export const IngredientSchema = z.object({
  name: requiredText,
  metric: requiredText,
  us: requiredText,
  notes: z.string().trim().optional(),
});

export const IngredientGroupSchema = z.object({
  group: IngredientGroupNameSchema,
  items: z.array(IngredientSchema).min(1),
});

export const RecipeStepSchema = z.object({
  order: z.number().int().positive(),
  title: requiredText,
  instruction: requiredText,
  durationMinutes: z.number().int().nonnegative().optional(),
  cues: z.array(requiredText).default([]),
});

export const GeneratedDishGuideSchema = z
  .object({
    isClearDish: z.boolean(),
    closestMatch: z
      .object({
        suggestedDishName: requiredText,
        reason: requiredText,
      })
      .nullable(),
    title: requiredText,
    originalName: requiredText,
    pronunciation: z.object({
      pinyin: requiredText,
      ipa: z.string().trim().optional(),
      audioText: requiredText,
    }),
    ingredients: z.array(IngredientGroupSchema).min(3),
    recipe: z.object({
      servings: z.number().int().positive(),
      prepTimeMinutes: z.number().int().nonnegative(),
      cookTimeMinutes: z.number().int().nonnegative(),
      totalTimeMinutes: z.number().int().positive(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      steps: z.array(RecipeStepSchema).min(3),
    }),
    chefTips: z.array(requiredText).min(2),
    commonMistakes: z.array(requiredText).min(2),
    plating: z.object({
      description: requiredText,
      garnishes: z.array(requiredText).default([]),
    }),
    michelinRewrite: z.object({
      title: requiredText,
      description: requiredText,
      techniqueNotes: z.array(requiredText).min(1),
    }),
  })
  .superRefine((guide, context) => {
    if (!guide.isClearDish && !guide.closestMatch) {
      context.addIssue({
        code: "custom",
        path: ["closestMatch"],
        message: "closestMatch is required when isClearDish is false",
      });
    }
  });

export type IngredientGroupName = z.infer<typeof IngredientGroupNameSchema>;
export type GeneratedDishGuide = z.infer<typeof GeneratedDishGuideSchema>;
