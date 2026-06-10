import type { GeneratedDishGuide } from "../generation/index.js";

export function createGuideFixture(
  overrides: Partial<GeneratedDishGuide> = {},
): GeneratedDishGuide {
  return {
    isClearDish: true,
    closestMatch: null,
    title: "Mapo Tofu",
    originalName: "麻婆豆腐",
    pronunciation: {
      pinyin: "má pó dòu fu",
      ipa: "mǎ pʰwǒ tôu fu",
      audioText: "麻婆豆腐",
    },
    ingredients: [
      {
        group: "Main",
        items: [
          {
            name: "Silken tofu",
            metric: "450 g",
            us: "1 lb",
            notes: "cut into cubes",
          },
        ],
      },
      {
        group: "Marinade & Seasoning",
        items: [
          {
            name: "Doubanjiang",
            metric: "30 g",
            us: "2 tbsp",
          },
        ],
      },
      {
        group: "Sauce",
        items: [
          {
            name: "Chicken stock",
            metric: "180 ml",
            us: "3/4 cup",
          },
        ],
      },
      {
        group: "Garnish",
        items: [
          {
            name: "Scallions",
            metric: "10 g",
            us: "2 tbsp",
          },
        ],
      },
    ],
    recipe: {
      servings: 4,
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      totalTimeMinutes: 35,
      difficulty: "Medium",
      steps: [
        {
          order: 1,
          title: "Prepare aromatics",
          instruction: "Mince garlic and ginger, then slice scallions.",
          durationMinutes: 5,
          cues: ["aromatics are even"],
        },
        {
          order: 2,
          title: "Bloom the paste",
          instruction: "Fry doubanjiang in oil until fragrant and red.",
          durationMinutes: 3,
          cues: ["oil turns red", "paste smells savory"],
        },
        {
          order: 3,
          title: "Simmer tofu",
          instruction: "Add stock and tofu, then simmer gently until seasoned through.",
          durationMinutes: 12,
          cues: ["sauce thickens", "tofu stays intact"],
        },
      ],
    },
    chefTips: ["Use gentle heat after tofu goes in", "Toast peppercorns fresh"],
    commonMistakes: ["Stirring too hard", "Skipping the oil bloom"],
    plating: {
      description: "Serve in a shallow warm bowl with glossy sauce around the tofu.",
      garnishes: ["Scallions", "Sichuan pepper"],
    },
    michelinRewrite: {
      title: "Silken Tofu in Scarlet Sichuan Jus",
      description:
        "A refined mapo tofu with aromatic chili oil, tender curds, and a balanced numbing finish.",
      techniqueNotes: ["Bloom chili bean paste slowly."],
    },
    ...overrides,
  };
}
