export const flow_basic_1 = [
    {
        "id": "whatDidTheyDo",
        "question": "What happened?",
        "subheading": "Pick a category then the behavior to describe what your child did.",
        "categories": [
            {
                "key": "positiveBehaviors",
                "label": "Positive Behaviors",
                "emoji": "🌟",
                "sentiment": "positive",
                "choices": [
                    { "label": "Followed instructions", "emoji": "✅", "sentiment": "positive" },
                    { "label": "Stayed calm during frustration", "emoji": "🏆", "sentiment": "positive" },
                    { "label": "Used words instead of actions", "emoji": "💬", "sentiment": "positive" },
                    { "label": "Shared with others", "emoji": "🤝", "sentiment": "positive" },
                    { "label": "Helped someone", "emoji": "🆘", "sentiment": "positive" },
                    { "label": "Completed a task", "emoji": "🎯", "sentiment": "positive" },
                    { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
                ],
                "is_editable": true
            },
            {
                "key": "socialSkills",
                "label": "Social Skills",
                "emoji": "👥",
                "sentiment": "positive",
                "choices": [
                    { "label": "Made a friend", "emoji": "🤝", "sentiment": "positive" },
                    { "label": "Joined group activity", "emoji": "👥", "sentiment": "positive" },
                    { "label": "Took turns", "emoji": "🔄", "sentiment": "positive" },
                    { "label": "Apologized sincerely", "emoji": "🙏", "sentiment": "positive" },
                    { "label": "Comforted someone", "emoji": "🤗", "sentiment": "positive" },
                    { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
                ],
                "is_editable": true
            },
            {
                "key": "selfRegulation",
                "label": "Self-Regulation",
                "emoji": "🧠",
                "sentiment": "positive",
                "choices": [
                    { "label": "Calmed down independently", "emoji": "😌", "sentiment": "positive" },
                    { "label": "Used coping strategies", "emoji": "🧘", "sentiment": "positive" },
                    { "label": "Asked for help appropriately", "emoji": "🙋", "sentiment": "positive" },
                    { "label": "Took a break when needed", "emoji": "⏸️", "sentiment": "positive" },
                    { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
                ],
                "is_editable": true
            },
            {
                "key": "academicSkills",
                "label": "Learning & Skills",
                "emoji": "📚",
                "sentiment": "positive",
                "choices": [
                    { "label": "Learned something new", "emoji": "🎓", "sentiment": "positive" },
                    { "label": "Solved a problem", "emoji": "💡", "sentiment": "positive" },
                    { "label": "Read independently", "emoji": "📖", "sentiment": "positive" },
                    { "label": "Completed homework", "emoji": "✏️", "sentiment": "positive" },
                    { "label": "Other", "emoji": "➕", "sentiment": null, "isOther": true }
                ],
                "is_editable": true
            },
            {
                "key": "yourPins",
                "label": "Your Pins",
                "emoji": "📌",
                "sentiment": "positive",
                "choices": [],
                "is_editable": true
            }
        ]
    },
    {
        "id": "whenDidItHappen",
        "question": "When did it happen?",
        "subheading": "Select the time of day the behavior occurred.",
        "answer_choices": [
            { "label": "Morning", "emoji": "🌅", "sentiment": "positive" },
            { "label": "Afternoon", "emoji": "🌞", "sentiment": "positive" },
            { "label": "Evening", "emoji": "🌇", "sentiment": "positive" },
            { "label": "Night", "emoji": "🌙", "sentiment": "positive" },
            { "label": "Other", "emoji": "➕", "sentiment": null }
        ],
        "is_editable": false
    },
    {
        "id": "whatHappenedBefore",
        "question": "What caused the behavior?",
        "subheading": "Think about what contributed to the positive behavior.",
        "answer_choices": [
            { "label": "After praise", "emoji": "👏", "sentiment": "positive" },
            { "label": "Routine was followed", "emoji": "📅", "sentiment": "positive" },
            { "label": "Transition went well", "emoji": "🚪", "sentiment": "positive" },
            { "label": "Felt supported", "emoji": "🤗", "sentiment": "positive" },
            { "label": "Other", "emoji": "➕", "sentiment": null }
        ]
    },
    {
        "id": "whatHappenedAfter",
        "question": "What happened after?",
        "subheading": "How did your child or others react to this positive moment?",
        "answer_choices": [
            { "label": "Celebrated the win", "emoji": "🎉", "sentiment": "positive" },
            { "label": "Smiled or looked proud", "emoji": "😊", "sentiment": "positive" },
            { "label": "Stayed regulated", "emoji": "🧠", "sentiment": "positive" },
            { "label": "Asked to do it again", "emoji": "🔁", "sentiment": "positive" },
            { "label": "Other", "emoji": "➕", "sentiment": null }
        ]
    },
    {
        "id": "whoWasInvolved",
        "question": "Who all was involved?",
        "subheading": "Choose everyone who was present or directly part of the situation.",
        "answer_choices": [
            { "label": "My child", "emoji": "🧒", "sentiment": "positive" },
            { "label": "Sibling", "emoji": "👧", "sentiment": "positive" },
            { "label": "Parent", "emoji": "🧑‍🦰", "sentiment": "positive" },
            { "label": "Teacher", "emoji": "👩‍🏫", "sentiment": "positive" },
            { "label": "Stranger", "emoji": "🕵️", "sentiment": "positive" },
            { "label": "Other", "emoji": "➕", "sentiment": null }
        ]
    },
    {
        "id": "mood",
        "question": "How was your child feeling?",
        "subheading": "Select the mood or emotional state of your child during the situation.",
        "answer_choices": []
    }
];