export const flow_basic_1 = [
    {
        id: "whatHappenedBefore",
        question: "What happened before?",
        answer_choices: [
            { label: "After denied something", emoji: "🚫" },
            { label: "After being told no", emoji: "🙅‍♂️" },
            { label: "After nap", emoji: "😴" },
            { label: "During play", emoji: "🧩" },
            { label: "Other", emoji: "➕" }
        ]
    },
      {
        id: "whatDidTheyDo",
        question: "What did they do?",
        subheading: "During the incident, what did they do?",
        answer_choices: [
            { label: "Hit", emoji: "🤛" },
            { label: "Screamed", emoji: "😫" },
            { label: "Refused instruction", emoji: "🙅" },
            { label: "Threw object", emoji: "🪣" },
            { label: "Other", emoji: "➕" }
        ]
    },
    {
        id: "whenDidItHappen",
        question: "When did it happen?",
        answer_choices: [
            { label: "Morning", emoji: "🌅" },
            { label: "Afternoon", emoji: "🌞" },
            { label: "Evening", emoji: "🌇" },
            { label: "Night", emoji: "🌙" },
            { label: "Other", emoji: "➕" }
        ]
    },
    {
        id: "whatHappenedAfter",
        question: "What happened after?",
        answer_choices: [
            { label: "No reaction", emoji: "😐" },
            { label: "Happened again", emoji: "🔁" },
            { label: "Comforted", emoji: "🤗" },
            { label: "Removed item", emoji: "📤" },
            { label: "Given warning", emoji: "⚠️" },
            { label: "Sent to room", emoji: "🚪" },
            { label: "Other", emoji: "➕" }
        ]
    },
    {
        id: "whoWasInvolved",
        question: "Who all was involved?",
        subheading: "Select all that apply",
        answer_choices: [
            { label: "My child", emoji: "🧒" },
            { label: "Sibling", emoji: "👧" },
            { label: "Parent", emoji: "🧑‍🦰" },
            { label: "Teacher", emoji: "👩‍🏫" },
            { label: "Stranger", emoji: "🕵️" },
            { label: "Other", emoji: "➕" }
        ]
    },
    // add optional mood slider 
];