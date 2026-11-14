# DecisionModel examples

One call and a typical result for each method. The outputs are made up to show their shape and what they mean; real values will vary.

The input is the `state`: a string, or an object whose field names give the model context, like `location` below.

## Setup

```ts
import { DecisionModel, type Criteria, type Levels } from "./DecisionModel";

const decisions = new DecisionModel("google/gemini-decision-1");

const URGENCY: Levels = ["can wait", "today", "right now"];

const TEAMS: Criteria = {
  billing: "Payments, invoices and refunds",
  technical: "Bugs and broken features",
  sales: "Questions about buying",
};

const FEELINGS: Criteria = {
  positive: "The reviewer is happy with it",
  negative: "The reviewer is unhappy with it",
  mixed: "The reviewer is both happy and unhappy with it",
  not_mentioned: "The review doesn't talk about this",
};
```

## `predicate`

One probability.

```ts
await decisions.predicate(
  "Is this message spam?",
  "Congratulations! You've won a free iPhone. Click here to claim it.",
);
// 0.97
```

## `predicates`

One probability per name. Here, the ticket is missing what the customer expected.

```ts
await decisions.predicates(
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

A level index. With can wait / today / right now, 1.9 means almost "right now".

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

One level index per name, with its confidence, on a low / medium / high scale. You pick the threshold for each.

```ts
await decisions.scores(
  {
    formality: "How formal is this text?",
    friendliness: "How friendly does this text sound?",
    clarity: "How clear is the main point?",
  },
  ["low", "medium", "high"],
  "hey, can u send the report asap? thx",
);
// {
//   formality: { score: 0.2, confidence: 0.9 },
//   friendliness: { score: 1.3, confidence: 0.55 },
//   clarity: { score: 1.8, confidence: 0.85 },
// }
```

## `choice`

One option name, or `null` when the model is torn.

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

One option name per name, with its confidence, all from the same options. You pick the threshold for each.

```ts
await decisions.choices(
  {
    price: "How does the reviewer feel about the price?",
    design: "How does the reviewer feel about the design?",
    speed: "How does the reviewer feel about the app's speed?",
  },
  FEELINGS,
  "Love the new look, but it's slow and way too expensive.",
);
// {
//   price: { choice: "negative", confidence: 0.95 },
//   design: { choice: "positive", confidence: 0.9 },
//   speed: { choice: "negative", confidence: 0.8 },
// }
```

## `create`

The raw API response, for any mix of questions. OpenRouter calls a yes/no question a `noul`.

```ts
await decisions.create({
  state: { title: "Humorquiz med Jompa", location: "Cash bar" },
  questions: {
    is_recurring: { type: "noul", instructions: "Does this event repeat weekly?" },
    category: { type: "choice", instructions: "Which category fits?", criteria: TEAMS },
  },
});
// {
//   answers: {
//     is_recurring: { type: "noul", noul: 0.88 },
//     category: { type: "choice", choice: "sales", confidence: 0.41, probabilities: { ... } },
//   },
//   model: "google/gemini-decision-1",
//   usage: { inputTokens: 212, outputTokens: 0, cost: 0.0000212 },
// }
```
