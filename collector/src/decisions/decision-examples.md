# DecisionModel examples

One call and a typical result for each method. The outputs are made up to show their shape and what they mean; real values will vary.

## Setup

```ts
import { DecisionModel, type Choice, type Level } from "./DecisionModel";

const decisions = new DecisionModel("gpt-6-luna");

const URGENCY: Level[] = [{ label: "can wait" }, { label: "today" }, { label: "right now" }];

const TEAMS: Choice[] = [
  { value: "billing", description: "Payments, invoices and refunds" },
  { value: "technical", description: "Bugs and broken features" },
  { value: "sales", description: "Questions about buying" },
];

const FEELINGS: Choice[] = [
  { value: "positive" },
  { value: "negative" },
  { value: "mixed" },
  { value: "not_mentioned", description: "The review doesn't talk about this" },
];
```

## `predicate`

One probability.

```ts
await decisions.predicate("Is this message spam?",
  "Congratulations! You've won a free iPhone. Click here to claim it.");
// 0.97
```

## `predicates`

One probability per name. Here, the ticket is missing what the customer expected.

```ts
await decisions.predicates({
  order_number: "Does the message include an order number?",
  problem: "Does the message describe what went wrong?",
  expected: "Does the message say what the customer expected instead?",
}, "I was charged twice for order 2048.");
// { order_number: 0.99, problem: 0.95, expected: 0.12 }
```

## `score`

A level index. With can wait / today / right now, 1.9 means almost "right now".

```ts
await decisions.score("How quickly does this message need a response?", URGENCY,
  "The site is down and customers can't check out!", 0.6);
// 1.9
```

## `scores`

One level index per name, with its confidence, on a low / medium / high scale. You pick the threshold for each.

```ts
await decisions.scores({
  formality: "How formal is this text?",
  friendliness: "How friendly does this text sound?",
  clarity: "How clear is the main point?",
}, [{ label: "low" }, { label: "medium" }, { label: "high" }],
  "hey, can u send the report asap? thx");
// {
//   formality: { score: 0.2, confidence: 0.9 },
//   friendliness: { score: 1.3, confidence: 0.55 },
//   clarity: { score: 1.8, confidence: 0.85 },
// }
```

## `choice`

One value, or `null` when the model is torn.

```ts
await decisions.choice("Which team should handle this?", TEAMS,
  "My invoice shows the wrong VAT number.", 0.8);
// "billing"

await decisions.choice("Which team should handle this?", TEAMS,
  "The app crashed when I tried to pay.", 0.8);
// null  (split between billing and technical, so below 0.8 confidence)
```

## `choices`

One value per name, with its confidence, all from the same options. You pick the threshold for each.

```ts
await decisions.choices({
  price: "How does the reviewer feel about the price?",
  design: "How does the reviewer feel about the design?",
  speed: "How does the reviewer feel about the app's speed?",
}, FEELINGS, "Love the new look, but it's slow and way too expensive.");
// {
//   price: { choice: "negative", confidence: 0.95 },
//   design: { choice: "positive", confidence: 0.9 },
//   speed: { choice: "negative", confidence: 0.8 },
// }
```
