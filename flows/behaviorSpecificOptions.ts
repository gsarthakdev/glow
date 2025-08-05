interface BehaviorOptions {
  antecedents: string[];
  consequences: string[];
}

export const behaviorSpecificOptions: { [behavior: string]: BehaviorOptions } = {
  // Physical Aggression
  "Hitting others": {
    antecedents: [
      "Sibling took their toy",
      "Asked to share with others",
      "Told to stop playing",
      "Denied request for item",
      "Asked to do homework",
      "Told to clean up toys",
      "Asked to wait their turn",
      "Told to be quiet",
      "Asked to put away electronics",
      "Told to eat their food",
      "Asked to get dressed",
      "Told to go to bed",
      "Asked to stop running",
      "Told to sit still",
      "Asked to apologize"
    ],
    consequences: [
      "Time out given",
      "Toy taken away",
      "Apology required",
      "Sent to room",
      "Given warning",
      "Parent intervened",
      "Sibling cried",
      "Activity stopped",
      "Privilege removed",
      "Calm down time",
      "Discussion about behavior",
      "Consequence explained",
      "Behavior ignored",
      "Redirection to different activity",
      "Positive reinforcement for stopping"
    ]
  },
  "Kicking others": {
    antecedents: [
      "Asked to share space",
      "Told to move over",
      "Asked to stop rough play",
      "Denied request for attention",
      "Asked to be gentle",
      "Told to wait in line",
      "Asked to stop jumping",
      "Told to sit properly",
      "Asked to be patient",
      "Told to stop making noise",
      "Asked to help clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to stop running",
      "Asked to be respectful"
    ],
    consequences: [
      "Immediate separation",
      "Activity ended",
      "Apology required",
      "Time out given",
      "Parent intervened",
      "Consequence explained",
      "Calm down time",
      "Redirection needed",
      "Discussion about safety",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Privilege removed",
      "Alternative activity offered",
      "Safety reminder given",
      "Gentle behavior modeled"
    ]
  },
  "Biting": {
    antecedents: [
      "Asked to share food",
      "Told to wait for snack",
      "Asked to stop chewing on things",
      "Denied request for candy",
      "Asked to be gentle",
      "Told to finish meal",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to wait their turn",
      "Told to stop rough play",
      "Asked to be patient",
      "Told to calm down",
      "Asked to stop crying",
      "Told to use words",
      "Asked to be quiet"
    ],
    consequences: [
      "Immediate attention",
      "Safety check performed",
      "Calm down time",
      "Discussion about biting",
      "Alternative behavior suggested",
      "Parent comforted victim",
      "Behavior ignored",
      "Redirection to safe activity",
      "Consequence explained",
      "Positive reinforcement for stopping",
      "Teething toy offered",
      "Gentle behavior modeled",
      "Safety reminder given",
      "Alternative expression encouraged",
      "Professional help considered"
    ]
  },
  "Throwing objects": {
    antecedents: [
      "Asked to put away toys",
      "Told to stop playing",
      "Denied request for item",
      "Asked to clean up",
      "Told to be careful",
      "Asked to share",
      "Told to wait",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to be gentle",
      "Told to finish eating",
      "Asked to get ready",
      "Told to stop running",
      "Asked to be patient",
      "Told to calm down"
    ],
    consequences: [
      "Objects removed",
      "Activity stopped",
      "Safety check performed",
      "Calm down time",
      "Discussion about safety",
      "Parent intervened",
      "Consequence explained",
      "Redirection to safe activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative play suggested",
      "Gentle behavior modeled",
      "Safety reminder given",
      "Privilege removed",
      "Professional help considered"
    ]
  },
  "Pushing": {
    antecedents: [
      "Asked to share space",
      "Told to move over",
      "Asked to wait in line",
      "Denied request for attention",
      "Asked to be patient",
      "Told to stop rough play",
      "Asked to be gentle",
      "Told to sit properly",
      "Asked to help clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to stop running",
      "Asked to be respectful",
      "Told to calm down",
      "Asked to stop making noise"
    ],
    consequences: [
      "Immediate separation",
      "Apology required",
      "Time out given",
      "Parent intervened",
      "Consequence explained",
      "Calm down time",
      "Redirection needed",
      "Discussion about respect",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative behavior suggested",
      "Gentle behavior modeled",
      "Safety reminder given",
      "Privilege removed",
      "Professional help considered"
    ]
  },
  "Pinching": {
    antecedents: [
      "Asked to be gentle",
      "Told to stop rough play",
      "Asked to share",
      "Denied request for attention",
      "Asked to wait",
      "Told to be patient",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to help clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to stop running",
      "Asked to be respectful",
      "Told to calm down",
      "Asked to stop crying"
    ],
    consequences: [
      "Immediate attention",
      "Safety check performed",
      "Calm down time",
      "Discussion about pinching",
      "Alternative behavior suggested",
      "Parent comforted victim",
      "Behavior ignored",
      "Redirection to safe activity",
      "Consequence explained",
      "Positive reinforcement for stopping",
      "Gentle behavior modeled",
      "Safety reminder given",
      "Alternative expression encouraged",
      "Privilege removed",
      "Professional help considered"
    ]
  },

  // Verbal Behaviors
  "Yelling or screaming": {
    antecedents: [
      "Asked to be quiet",
      "Told to stop making noise",
      "Denied request for item",
      "Asked to wait",
      "Told to be patient",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to calm down",
      "Asked to stop running",
      "Told to use inside voice"
    ],
    consequences: [
      "Asked to be quiet",
      "Activity stopped",
      "Calm down time",
      "Discussion about volume",
      "Parent intervened",
      "Consequence explained",
      "Redirection to quiet activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },
  "Crying loudly": {
    antecedents: [
      "Asked to leave park",
      "Told no to candy",
      "Routine disrupted",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be patient",
      "Told to calm down",
      "Asked to stop making noise",
      "Told to use words",
      "Asked to be respectful",
      "Told to wait"
    ],
    consequences: [
      "Comforted",
      "Given attention",
      "Left the situation",
      "Activity stopped",
      "Calm down time",
      "Discussion about feelings",
      "Parent intervened",
      "Consequence explained",
      "Redirection to calming activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered"
    ]
  },
  "Repetitive speech": {
    antecedents: [
      "Asked to stop repeating",
      "Told to be quiet",
      "Asked to wait",
      "Told to be patient",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to calm down",
      "Asked to stop making noise",
      "Told to use words",
      "Asked to be patient"
    ],
    consequences: [
      "Asked to stop",
      "Activity stopped",
      "Calm down time",
      "Discussion about repetition",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },
  "Using inappropriate words or profanity": {
    antecedents: [
      "Asked to be respectful",
      "Told to use appropriate language",
      "Asked to stop",
      "Told to be quiet",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be patient",
      "Told to calm down",
      "Asked to stop making noise",
      "Told to use words",
      "Asked to wait"
    ],
    consequences: [
      "Immediate correction",
      "Activity stopped",
      "Calm down time",
      "Discussion about language",
      "Parent intervened",
      "Consequence explained",
      "Redirection to appropriate activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },
  "Refusal to speak": {
    antecedents: [
      "Asked to answer question",
      "Told to use words",
      "Asked to share feelings",
      "Told to communicate",
      "Asked to respond",
      "Told to speak up",
      "Asked to explain",
      "Told to talk",
      "Asked to tell what happened",
      "Told to express needs",
      "Asked to ask for help",
      "Told to use voice",
      "Asked to participate",
      "Told to engage",
      "Asked to respond to name"
    ],
    consequences: [
      "Given time to respond",
      "Alternative communication offered",
      "Calm down time",
      "Discussion about communication",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for speaking",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown"
    ]
  },
  "Unusual vocal sounds": {
    antecedents: [
      "Asked to be quiet",
      "Told to stop making noise",
      "Asked to use words",
      "Told to communicate",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be patient",
      "Told to calm down",
      "Asked to be respectful",
      "Told to use inside voice",
      "Asked to wait"
    ],
    consequences: [
      "Asked to stop",
      "Activity stopped",
      "Calm down time",
      "Discussion about sounds",
      "Parent intervened",
      "Consequence explained",
      "Redirection to quiet activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },

  // Repetitive Behaviors
  "Hand flapping": {
    antecedents: [
      "Asked to stop",
      "Told to be still",
      "Asked to sit properly",
      "Told to calm down",
      "Asked to be patient",
      "Told to wait",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise"
    ],
    consequences: [
      "Given alternative activity",
      "Calm down time",
      "Discussion about behavior",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown",
      "Understanding expressed"
    ]
  },
  "Rocking back and forth": {
    antecedents: [
      "Asked to stop",
      "Told to be still",
      "Asked to sit properly",
      "Told to calm down",
      "Asked to be patient",
      "Told to wait",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise"
    ],
    consequences: [
      "Given alternative activity",
      "Calm down time",
      "Discussion about behavior",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown",
      "Understanding expressed"
    ]
  },
  "Spinning objects or self": {
    antecedents: [
      "Asked to stop",
      "Told to be still",
      "Asked to sit properly",
      "Told to calm down",
      "Asked to be patient",
      "Told to wait",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise"
    ],
    consequences: [
      "Given alternative activity",
      "Calm down time",
      "Discussion about behavior",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown",
      "Understanding expressed"
    ]
  },
  "Tapping or hitting surfaces repeatedly": {
    antecedents: [
      "Asked to stop",
      "Told to be quiet",
      "Asked to be gentle",
      "Told to calm down",
      "Asked to be patient",
      "Told to wait",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise"
    ],
    consequences: [
      "Asked to stop",
      "Activity stopped",
      "Calm down time",
      "Discussion about behavior",
      "Parent intervened",
      "Consequence explained",
      "Redirection to quiet activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },
  "Covering ears or eyes repeatedly": {
    antecedents: [
      "Asked to stop",
      "Told to pay attention",
      "Asked to listen",
      "Told to look",
      "Asked to be present",
      "Told to engage",
      "Asked to share",
      "Told to stop playing",
      "Asked to clean up",
      "Told to finish eating",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise"
    ],
    consequences: [
      "Given space",
      "Calm down time",
      "Discussion about behavior",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown",
      "Understanding expressed"
    ]
  },
  "Repetitively lining up objects": {
    antecedents: [
      "Asked to stop",
      "Told to clean up",
      "Asked to put away",
      "Told to finish",
      "Asked to move on",
      "Told to wait",
      "Asked to share",
      "Told to stop playing",
      "Asked to get ready",
      "Told to sit still",
      "Asked to be patient",
      "Told to calm down",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise"
    ],
    consequences: [
      "Given time to finish",
      "Calm down time",
      "Discussion about behavior",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown",
      "Understanding expressed"
    ]
  },

  // Routine & Social Challenges
  "Refusing transition": {
    antecedents: [
      "Asked to leave park",
      "Told to go home",
      "Asked to stop playing",
      "Told to get ready",
      "Asked to clean up",
      "Told to finish activity",
      "Asked to move on",
      "Told to wait",
      "Asked to be patient",
      "Told to calm down",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to share"
    ],
    consequences: [
      "Given extra time",
      "Activity stopped",
      "Calm down time",
      "Discussion about transition",
      "Parent intervened",
      "Consequence explained",
      "Redirection to new activity",
      "Behavior ignored",
      "Positive reinforcement for stopping",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },
  "Resisting meals": {
    antecedents: [
      "Asked to eat",
      "Told to finish food",
      "Asked to try new food",
      "Told to sit at table",
      "Asked to stop playing",
      "Told to focus on eating",
      "Asked to be patient",
      "Told to wait",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to share",
      "Told to calm down",
      "Asked to get ready"
    ],
    consequences: [
      "Given extra time",
      "Meal ended",
      "Calm down time",
      "Discussion about eating",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for eating",
      "Alternative food offered",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  },
  "Refusing bedtime / leaving bed": {
    antecedents: [
      "Asked to go to bed",
      "Told to stay in bed",
      "Asked to be quiet",
      "Told to sleep",
      "Asked to stop playing",
      "Told to calm down",
      "Asked to be patient",
      "Told to wait",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to share",
      "Told to finish activity",
      "Asked to get ready"
    ],
    consequences: [
      "Given extra time",
      "Activity stopped",
      "Calm down time",
      "Discussion about bedtime",
      "Parent intervened",
      "Consequence explained",
      "Redirection to bed",
      "Behavior ignored",
      "Positive reinforcement for staying in bed",
      "Alternative activity offered",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Calming technique used",
      "Patience shown"
    ]
  },
  "Running away / elopement": {
    antecedents: [
      "Asked to stay close",
      "Told to come back",
      "Asked to stop running",
      "Told to wait",
      "Asked to be patient",
      "Told to calm down",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to share",
      "Told to finish activity",
      "Asked to get ready",
      "Told to stop playing",
      "Asked to clean up"
    ],
    consequences: [
      "Immediate pursuit",
      "Safety check performed",
      "Calm down time",
      "Discussion about safety",
      "Parent intervened",
      "Consequence explained",
      "Redirection to safe activity",
      "Behavior ignored",
      "Positive reinforcement for staying close",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Safety reminder given"
    ]
  },
  "Avoiding group interaction": {
    antecedents: [
      "Asked to join group",
      "Told to participate",
      "Asked to share",
      "Told to engage",
      "Asked to be social",
      "Told to interact",
      "Asked to be patient",
      "Told to wait",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to get ready",
      "Told to calm down",
      "Asked to stop playing"
    ],
    consequences: [
      "Given space",
      "Activity continued without them",
      "Calm down time",
      "Discussion about social interaction",
      "Parent intervened",
      "Consequence explained",
      "Redirection to individual activity",
      "Behavior ignored",
      "Positive reinforcement for joining",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used",
      "Patience shown"
    ]
  },
  "Refusing instructions": {
    antecedents: [
      "Asked to do task",
      "Told to follow direction",
      "Asked to help",
      "Told to cooperate",
      "Asked to be patient",
      "Told to wait",
      "Asked to be respectful",
      "Told to use words",
      "Asked to stop making noise",
      "Told to sit still",
      "Asked to share",
      "Told to finish activity",
      "Asked to get ready",
      "Told to calm down",
      "Asked to stop playing"
    ],
    consequences: [
      "Given extra time",
      "Activity stopped",
      "Calm down time",
      "Discussion about following instructions",
      "Parent intervened",
      "Consequence explained",
      "Redirection to different activity",
      "Behavior ignored",
      "Positive reinforcement for following instructions",
      "Alternative expression suggested",
      "Gentle reminder given",
      "Privilege removed",
      "Professional help considered",
      "Alternative activity offered",
      "Calming technique used"
    ]
  }
};

// Helper function to get shuffled options for a behavior
export function getShuffledOptions(behavior: string, questionType: 'antecedents' | 'consequences', currentSet: number = 0): string[] {
  const options = behaviorSpecificOptions[behavior];
  if (!options) {
    // Fallback options for behaviors not in our database
    const fallbackAntecedents = [
      "Asked to do something they didn't want to do",
      "Told to stop an activity they were enjoying",
      "Denied a request they made",
      "Asked to wait or be patient",
      "Told to follow instructions",
      "Asked to share or take turns",
      "Told to be quiet or calm down",
      "Asked to transition to a new activity",
      "Told to finish what they were doing",
      "Asked to help with a task"
    ];
    
    const fallbackConsequences = [
      "Time out was given",
      "Activity was stopped",
      "Privilege was removed",
      "Parent intervened",
      "Discussion about behavior",
      "Consequence was explained",
      "Calm down time was given",
      "Redirection to different activity",
      "Behavior was ignored",
      "Positive reinforcement for stopping"
    ];
    
    const fallbackOptions = questionType === 'antecedents' ? fallbackAntecedents : fallbackConsequences;
    const optionsPerSet = 5;
    const startIndex = (currentSet * optionsPerSet) % fallbackOptions.length;
    const endIndex = Math.min(startIndex + optionsPerSet, fallbackOptions.length);
    
    return fallbackOptions.slice(startIndex, endIndex);
  }

  const allOptions = options[questionType];
  const optionsPerSet = 5; // Show 5 options at a time
  const startIndex = (currentSet * optionsPerSet) % allOptions.length;
  const endIndex = Math.min(startIndex + optionsPerSet, allOptions.length);
  
  return allOptions.slice(startIndex, endIndex);
}

// Helper function to get total number of sets for a behavior
export function getTotalSets(behavior: string, questionType: 'antecedents' | 'consequences'): number {
  const options = behaviorSpecificOptions[behavior];
  if (!options) {
    // For fallback options, we have 10 options total, showing 5 per set
    return 2; // 10 options / 5 per set = 2 sets
  }

  return Math.ceil(options[questionType].length / 5);
} 