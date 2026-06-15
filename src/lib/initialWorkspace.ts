import type { ArgumentElement, Workspace } from "./types";

/** Build the 4 argument elements for a content section, given the A/B prefix. */
function buildArguments(prefix: "A" | "B"): ArgumentElement[] {
  return [1, 2, 3, 4].map((index) => ({
    id: `${prefix}${index}`,
    index,
    kind: index <= 2 ? "main" : "link",
    mainStatement: "",
    primaryTechnique: "",
    primaryLandingPoint: "",
    chains: [],
  }));
}

/** A pristine, blank IO outline — shown when there is no usage record yet. */
export function createInitialWorkspace(): Workspace {
  return {
    title: "",
    opening: {
      greeting: "",
      giDefinition: "",
    },
    literary: {
      intro: "",
      arguments: buildArguments("A"),
    },
    transition: "",
    nonLiterary: {
      intro: "",
      arguments: buildArguments("B"),
    },
    conclusion: "",
    excerpts: [
      { id: "excerpt-literary", title: "文学文本：原文节选", content: "" },
      { id: "excerpt-nonliterary", title: "非文学文本：原文节选", content: "" },
    ],
  };
}
