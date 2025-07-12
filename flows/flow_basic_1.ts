export const flow_basic_1 = [
  {
    "id": "whatDidTheyDo",
    "question": "What happened?",
    "subheading": "Describe your child's specific behavior or action during the event.",
    "answer_choices": [
      { "label": "Hit", "emoji": "🤛", "sentiment": "negative"},
      { "label": "Followed instructions", emoji: "✅", "sentiment": "positive" },
      { "label": "Screamed", "emoji": "😫", "sentiment": "negative" },
      {"label": "Stayed calm during frustration", "emoji": "🏆", "sentiment": "positive"},
      { "label": "Other", "emoji": "➕", "sentiment": null }
      // { "label": "Threw object", "emoji": "🪣" },
      // { "label": "Refused instruction", "emoji": "🙅" },
    ]
  },
  {
    "id": "whenDidItHappen",
    "question": "When did it happen?",
    "subheading": "Select the time of day the behavior occurred.",
    "answer_choices": [
      { "label": "Morning", "emoji": "🌅", "sentiment": "negative" },
      { "label": "Afternoon", "emoji": "🌞", "sentiment": "negative" },
      { "label": "Evening", "emoji": "🌇", "sentiment": "negative" },
      { "label": "Night", "emoji": "🌙", "sentiment": "negative" },
      { "label": "Other", "emoji": "➕", "sentiment": null }
    ]
  },
  {
    "id": "whatHappenedBefore",
    "question": "What happened before?",
    "subheading": "What led up to the behavior or what triggered it?",
    "answer_choices": [
      { "label": "After denied something", "emoji": "🚫", "sentiment": "negative" },
      { "label": "After being told no", "emoji": "🙅‍♂️", "sentiment": "negative" },
      { "label": "After nap", "emoji": "😴", "sentiment": "negative" },
      { "label": "During play", "emoji": "🧩", "sentiment": "negative" },
      { "label": "Other", "emoji": "➕", "sentiment": null }
    ]
  },
  {
    "id": "whatHappenedAfter",
    "question": "What happened after?",
    "subheading": "Share how your child or others responded following the behavior.",
    "answer_choices": [
      { "label": "No reaction", "emoji": "😐", "sentiment": "negative" },
      { "label": "Happened again", "emoji": "🔁", "sentiment": "negative" },
      { "label": "Comforted", "emoji": "🤗", "sentiment": "negative" },
      { "label": "Removed item", "emoji": "📤", "sentiment": "negative" },
      { "label": "Given warning", "emoji": "⚠️", "sentiment": "negative" },
      { "label": "Sent to room", "emoji": "🚪", "sentiment": "negative" },
      { "label": "Other", "emoji": "➕", "sentiment": null }
    ]
  },
  {
    "id": "whoWasInvolved",
    "question": "Who all was involved?",
    "subheading": "Choose everyone who was present or directly part of the situation.",
    "answer_choices": [
      { "label": "My child", "emoji": "🧒", "sentiment": "negative" },
      { "label": "Sibling", "emoji": "👧", "sentiment": "negative" },
      { "label": "Parent", "emoji": "🧑‍🦰", "sentiment": "negative" },
      { "label": "Teacher", "emoji": "👩‍🏫", "sentiment": "negative" },
      { "label": "Stranger", "emoji": "🕵️", "sentiment": "negative" },
      { "label": "Other", "emoji": "➕", "sentiment": null }
    ]
  },
  {
    "id": "mood",
    "question": "How was your child feeling?",
    "subheading": "Select the mood or emotional state of your child during the incident.",
  }
];