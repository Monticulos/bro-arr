# DecisionModel examples

One call and a typical result for each method. The outputs are made up to show their shape and what they mean; real values will vary.

## Setup

```ts
import {
  DecisionModel,
  type ChoiceCriteria,
  type ScoreCriteria,
} from "./DecisionModel";

const decisions = new DecisionModel("google/gemini-decision-1");

const URGENCY: ScoreCriteria = ["can wait", "today", "right now"];

const TEAMS: ChoiceCriteria = {
  billing: "Payments, invoices and refunds",
  technical: "Bugs and broken features",
  sales: "Questions about buying",
};

const FEELINGS: ChoiceCriteria = {
  positive: "The reviewer is happy with it",
  negative: "The reviewer is unhappy with it",
  mixed: "The reviewer is both happy and unhappy with it",
  not_mentioned: "The review doesn't talk about this",
};
```

## `noul`

One probability.

```ts
await decisions.noul(
  "Is this message spam?",
  "Congratulations! You've won a free iPhone. Click here to claim it.",
);
// 0.97
```

## `nouls`

One probability per name. Here, the ticket is missing what the customer expected.

```ts
await decisions.nouls(
  {
    order_number: "Does the message include an order number?",
    problem: "Does the message describe what went wrong?",
    expected: "Does the message say what the customer expected instead?",
  },
  "I was charged twice for order 2048.",
);
// { order_number: 0.99, problem: 0.95, expected: 0.12 }
```

## `score`

A score between 0 and the last criterion. With can wait / today / right now, 1.9 means almost "right now".

```ts
await decisions.score(
  "How quickly does this message need a response?",
  URGENCY,
  "The site is down and customers can't check out!",
  0.6,
);
// 1.9
```

## `scores`

The whole answer per name, on a low / medium / high scale. You pick the threshold for each.

```ts
await decisions.scores(
  {
    formality: "How formal is this text?",
    clarity: "How clear is the main point?",
  },
  ["low", "medium", "high"],
  "hey, can u send the report asap? thx",
);
// {
//   formality: { type: "score", score: 0.2, confidence: 0.9, probabilities: { ... },
//                legend: { "0": "low", "1": "medium", "2": "high" } },
//   clarity: { type: "score", score: 1.8, confidence: 0.85, probabilities: { ... },
//              legend: { "0": "low", "1": "medium", "2": "high" } },
// }
```

## `choice`

The name of one criterion, or `null` when the model is torn.

```ts
await decisions.choice(
  "Which team should handle this?",
  TEAMS,
  { ticket: "My invoice shows the wrong VAT number." },
  0.8,
);
// "billing"

await decisions.choice(
  "Which team should handle this?",
  TEAMS,
  { ticket: "The app crashed when I tried to pay." },
  0.8,
);
// null  (split between billing and technical, so below 0.8 confidence)
```

## `choices`

The whole answer per name, all from the same criteria. You pick the threshold for each.

```ts
await decisions.choices(
  {
    price: "How does the reviewer feel about the price?",
    speed: "How does the reviewer feel about the app's speed?",
  },
  FEELINGS,
  "Love the new look, but it's slow and way too expensive.",
);
// {
//   price: { type: "choice", choice: "negative", confidence: 0.95,
//            probabilities: { negative: 0.95, mixed: 0.03, ... } },
//   speed: { type: "choice", choice: "negative", confidence: 0.8,
//            probabilities: { negative: 0.8, mixed: 0.15, ... } },
// }
```

## `create`

The raw API response, for any mix of questions. The API has a fourth question type, `box`, which draws one bounding box around a target in an image. Nothing here needs it, so it has no method of its own — ask it through `create`, with `typesafe/jev-1.14`, which is the only model that answers it.

```ts
await decisions.create({
  state: { title: "Humorquiz med Jompa", location: "Cash bar" },
  questions: {
    is_recurring: {
      type: "noul",
      instructions: "Does this event repeat weekly?",
    },
    team: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: TEAMS,
    },
  },
});
// {
//   answers: {
//     is_recurring: { type: "noul", noul: 0.88 },
//     team: { type: "choice", choice: "sales", confidence: 0.41, probabilities: { ... } },
//   },
//   model: "google/gemini-decision-1",
//   usage: { inputTokens: 212, outputTokens: 0, cost: 0.0000212 },
// }
```
