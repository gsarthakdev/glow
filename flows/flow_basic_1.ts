export const flow_basic_1 = [
  {
    "id": "whatDidTheyDo",
    "question": "What happened?",
    "subheading": "Pick a category then the behavior to describe what your child did.",
    "categories": [
      {
        "key": "physicalAggression",
        "label": "Physical Aggression",
        "emoji": "🥊",
        "sentiment": "negative",
        "choices": [
          { "label": "Hitting others", "emoji": "🤛", "sentiment": "negative" },
          { "label": "Kicking others", "emoji": "🦶", "sentiment": "negative" },
          { "label": "Biting", "emoji": "🦷", "sentiment": "negative" },
          { "label": "Throwing objects", "emoji": "🎯", "sentiment": "negative" },
          { "label": "Pushing", "emoji": "🤜", "sentiment": "negative" },
          { "label": "Pinching", "emoji": "🤏", "sentiment": "negative" },
          { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
        ],
        "is_editable": true
      },
      {
        "key": "verbalBehaviors",
        "label": "Verbal Behaviors",
        "emoji": "📣",
        "sentiment": "negative",
        "choices": [
          { "label": "Yelling or screaming", "emoji": "😫", "sentiment": "negative" },
          { "label": "Leading caregiver to item/place", "emoji": "🚶", "sentiment": "negative" },
          { "label": "Crying loudly", "emoji": "😭", "sentiment": "negative" },
          { "label": "Pointing to an object", "emoji": "👉", "sentiment": "negative" },
          { "label": "Repetitive speech", "emoji": "🔁", "sentiment": "negative" },
          { "label": "Using hand gestures to communicate", "emoji": "🤙", "sentiment": "negative" },
          { "label": "Using inappropriate words or profanity", "emoji": "🗯️", "sentiment": "negative" },
          { "label": "Using AAC / speech device", "emoji": "📱", "sentiment": "negative" },
          { "label": "Refusal to speak", "emoji": "🤐", "sentiment": "negative" },
          { "label": "Using PECS / picture cards", "emoji": "🖼️", "sentiment": "negative" },
          { "label": "Unusual vocal sounds", "emoji": "🎤", "sentiment": "negative" },
          { "label": "Using sign language", "emoji": "🤟", "sentiment": "negative" },
          { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
        ],
        "is_editable": true
      },
      {
        "key": "repetitiveBehaviors",
        "label": "Self-actions / Repetitive Behaviors",
        "emoji": "🔄",
        "sentiment": "negative",
        "choices": [
          { "label": "Hand flapping", "emoji": "👐", "sentiment": "negative" },
          { "label": "Rocking back and forth", "emoji": "🪑", "sentiment": "negative" },
          { "label": "Spinning objects or self", "emoji": "🌀", "sentiment": "negative" },
          { "label": "Tapping or hitting surfaces repeatedly", "emoji": "📏", "sentiment": "negative" },
          { "label": "Covering ears or eyes repeatedly", "emoji": "🙉", "sentiment": "negative" },
          { "label": "Repetitively lining up objects", "emoji": "📚", "sentiment": "negative" },
          { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
        ],
        "is_editable": true
      },
      {
        "key": "routineChallenges",
        "label": "Routine & Social Challenges",
        "emoji": "⏰",
        "sentiment": "negative",
        "choices": [
          { "label": "Refusing transition", "emoji": "🚪", "sentiment": "negative" },
          { "label": "Resisting meals", "emoji": "🍽️", "sentiment": "negative" },
          { "label": "Refusing bedtime / leaving bed", "emoji": "🛏️", "sentiment": "negative" },
          { "label": "Running away / elopement", "emoji": "🏃", "sentiment": "negative" },
          { "label": "Avoiding group interaction", "emoji": "👥", "sentiment": "negative" },
          { "label": "Refusing instructions", "emoji": "🙅", "sentiment": "negative" },
          { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
        ],
        "is_editable": true
      },
      {
        "key": "yourPins",
        "label": "Your Pins",
        "emoji": "📌",
        "sentiment": "negative",
        "choices": [
          // { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
        ],
        "is_editable": true
      }
    ],
    is_editable: false
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
    ],
    "is_editable": false
  },
  {
    "id": "whatHappenedBefore",
    // "question": "What caused the behavior?",
    "question": "What led up to the behavior or what triggered it?",
    // "subheading": "What led up to the behavior or what triggered it?",
    "subheading": null,
    "answer_choices": []
  },
  {
    "id": "whatHappenedAfter",
    // "question": "What happened after?",
    // "question": "Share how your child or others responded following the behavior.",
    "question": "Share what happened following the behavior.",
    // "subheading": "Share how your child or others responded following the behavior.",
    "answer_choices": []
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
    ],
    "is_editable": true
  },
  {
    "id": "mood",
    "question": "How was your child feeling?",
    // "subheading": "Select the mood or emotional state of your child during the incident.",
    "subheading": "",
    "answer_choices": [],
    "is_editable": false
  }
];