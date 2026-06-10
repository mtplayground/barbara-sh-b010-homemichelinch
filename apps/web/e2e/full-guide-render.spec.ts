import { expect, test } from "@playwright/test";

import type { GuideResponse } from "@app/shared";

test("renders a full guide after submitting fish-fragrant shredded pork", async ({
  page,
}) => {
  let requestBody: unknown;

  await page.route("**/api/guide", async (route) => {
    requestBody = route.request().postDataJSON();

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createGuideResponse()),
    });
  });

  await page.goto("/");
  await page.getByLabel("Dish name").fill("鱼香肉丝");
  await page
    .getByLabel("Notes")
    .fill("Weeknight dinner, balanced sweet-sour heat, serves four");
  await page.getByRole("button", { name: "Prepare guide" }).click();

  await expect(page.getByText("Fresh")).toBeVisible();
  expect(requestBody).toEqual({
    dish: "鱼香肉丝",
    notes: "Weeknight dinner, balanced sweet-sour heat, serves four",
  });

  await expect(
    page.getByRole("heading", { name: "Fish-Fragrant Shredded Pork" }),
  ).toBeVisible();
  await expect(page.getByText("鱼香肉丝", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("yú xiāng ròu sī")).toBeVisible();
  await expect(page.getByText("Prep", { exact: true })).toBeVisible();
  await expect(page.getByText("Cook", { exact: true })).toBeVisible();
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expect(page.getByText("Serves", { exact: true })).toBeVisible();
  await expect(page.getByText("Difficulty", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Dish portrait" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Fish-Fragrant Shredded Pork plated dish" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cooking reference" })).toBeVisible();
  await expect(
    page.locator('iframe[title="Fish-Fragrant Shredded Pork cooking video"]'),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Mise en place" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Main", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Marinade & Seasoning", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sauce", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Garnish", exact: true })).toBeVisible();
  await expect(page.getByText("Pork tenderloin")).toBeVisible();
  await expect(page.getByText("250 g")).toBeVisible();
  await expect(page.getByText("9 oz")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Velvet pork" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build sauce" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flash-fry and glaze" })).toBeVisible();
  await expect(page.getByText("pork separates cleanly")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chef tips" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Common mistakes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plating" })).toBeVisible();

  await expect(page.getByText("Michelin Chef Mode")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lacquered Pork Threads with Pickled Chili Jus",
    }),
  ).toBeVisible();
  await expect(page.getByText("Balance sweet, sour, and heat")).toBeVisible();
});

function createGuideResponse(): GuideResponse {
  return {
    cache: {
      hit: false,
      key: "鱼香肉丝",
      updatedAt: "2026-06-10T01:00:00.000Z",
    },
    guide: {
      isClearDish: true,
      closestMatch: null,
      title: "Fish-Fragrant Shredded Pork",
      originalName: "鱼香肉丝",
      pronunciation: {
        pinyin: "yú xiāng ròu sī",
        ipa: "y̌ ɕjáŋ ɻôu sɹ̩́",
        audioText: "鱼香肉丝",
      },
      ingredients: [
        {
          group: "Main",
          items: [
            {
              name: "Pork tenderloin",
              metric: "250 g",
              us: "9 oz",
              notes: "julienned",
            },
            {
              name: "Wood ear mushrooms",
              metric: "30 g",
              us: "1 oz",
            },
          ],
        },
        {
          group: "Marinade & Seasoning",
          items: [
            {
              name: "Shaoxing wine",
              metric: "15 ml",
              us: "1 tbsp",
            },
            {
              name: "Cornstarch",
              metric: "8 g",
              us: "1 tbsp",
            },
          ],
        },
        {
          group: "Sauce",
          items: [
            {
              name: "Chinkiang vinegar",
              metric: "20 ml",
              us: "1 tbsp plus 1 tsp",
            },
            {
              name: "Pickled chili paste",
              metric: "25 g",
              us: "1 1/2 tbsp",
            },
          ],
        },
        {
          group: "Garnish",
          items: [
            {
              name: "Scallion greens",
              metric: "10 g",
              us: "2 tbsp",
            },
          ],
        },
      ],
      recipe: {
        servings: 4,
        prepTimeMinutes: 20,
        cookTimeMinutes: 10,
        totalTimeMinutes: 30,
        difficulty: "Medium",
        steps: [
          {
            order: 1,
            title: "Velvet pork",
            instruction:
              "Marinate pork with wine, salt, and cornstarch until each strand is lightly coated.",
            durationMinutes: 8,
            cues: ["pork separates cleanly", "surface looks glossy"],
          },
          {
            order: 2,
            title: "Build sauce",
            instruction:
              "Whisk vinegar, sugar, soy, stock, and chili paste until smooth.",
            durationMinutes: 4,
            cues: ["sugar dissolves"],
          },
          {
            order: 3,
            title: "Flash-fry and glaze",
            instruction:
              "Stir-fry aromatics, pork, mushrooms, and sauce over high heat until lacquered.",
            durationMinutes: 6,
            cues: ["sauce clings", "pork stays tender"],
          },
        ],
      },
      chefTips: [
        "Cut pork evenly so it cooks in seconds.",
        "Keep the wok hot before the sauce enters.",
      ],
      commonMistakes: [
        "Overcrowding the wok cools the pan.",
        "Too much vinegar can flatten the chili aroma.",
      ],
      plating: {
        description:
          "Pile the glossy pork threads in a shallow bowl with the sauce pooled lightly at the edge.",
        garnishes: ["Scallion greens", "A few drops chili oil"],
      },
      michelinRewrite: {
        title: "Lacquered Pork Threads with Pickled Chili Jus",
        description:
          "A refined expression of Sichuan fish-fragrant balance with tender pork, bright vinegar, and a polished chili sheen.",
        techniqueNotes: [
          "Balance sweet, sour, and heat before the sauce hits the wok.",
          "Finish fast so the pork stays supple.",
        ],
      },
    },
    media: {
      status: "ready",
      youtube: {
        videoId: "abc123XYZ",
        embedUrl: "https://www.youtube-nocookie.com/embed/abc123XYZ",
      },
      photo: {
        objectKey: "app_barbara_sh_b010_homemichelinch_a42e73/dish-photos/yuxiang.jpg",
        url: imageDataUrl(),
      },
    },
  };
}

function imageDataUrl(): string {
  return [
    "data:image/svg+xml;utf8,",
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#f6edf8"/><circle cx="320" cy="240" r="150" fill="#c9a227"/><text x="320" y="250" text-anchor="middle" font-family="serif" font-size="42" fill="#2b2528">鱼香肉丝</text></svg>',
    ),
  ].join("");
}
