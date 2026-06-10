import assert from "node:assert/strict";
import test from "node:test";

import {
  ClaudeGenerationError,
  parseGeneratedDishGuide,
} from "./claudeGenerationService.js";
import { createGuideFixture } from "../test/fixtures.js";

test("parseGeneratedDishGuide extracts and validates a guide JSON object", () => {
  const guide = createGuideFixture();
  const parsed = parseGeneratedDishGuide(
    `Here is the structured guide:\n${JSON.stringify(guide)}\nEnjoy.`,
  );

  assert.equal(parsed.title, "Mapo Tofu");
  assert.equal(parsed.ingredients[0]?.group, "Main");
  assert.equal(parsed.recipe.steps.length, 3);
  assert.equal(
    parsed.michelinRewrite.techniqueNotes[0],
    "Bloom chili bean paste slowly.",
  );
});

test("parseGeneratedDishGuide requires closestMatch for unclear dishes", () => {
  const guide = createGuideFixture({
    isClearDish: false,
    closestMatch: null,
  });

  assert.throws(
    () => parseGeneratedDishGuide(JSON.stringify(guide)),
    (error) =>
      error instanceof ClaudeGenerationError &&
      error.message === "Claude response did not match guide schema",
  );
});
