export const FIGHTER_PERSONALITIES = {
    NORMAL: 'Normal',
    AGGRESSIVE: 'Aggressive',
    SHOWMAN: 'Showman',
    PROFESSIONAL: 'Professional',
    MENTAL: 'Mental'
};

export const PRESS_CONFERENCE_QUESTIONS = [
    {
        id: 'STYLES_MATCHUP',
        text: "How do the styles match up for this fight?",
        minRep: 1, maxRep: 10,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“It’s a solid matchup. Both styles bring something different.”", xp: 0 },
                { text: "“We’ll see whose adjustments matter most on the night.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“My style smashes his. He won’t cope.”", xp: 1 },
                { text: "“He’s built for my pace and that’s bad for him.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“It’s speed vs drama and I’m bringing both!”", xp: 2 },
                { text: "“Fans are getting a style clash they’ll remember.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“It’s a technical matchup. Execution will decide it.”", xp: 0 },
                { text: "“We prepared for every stylistic scenario.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“His style is predictable. I’ve solved him already.”", xp: 1 },
                { text: "“He’s walking into a trap and doesn’t know it.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "“He thinks he understands my style? Cute.”", xp: 1 },
                { text: "“He’ll find out styles don’t win fights — fighters do.”", xp: 1 }
            ]
        }
    },
    {
        id: 'OLDER_OPPONENT',
        text: "How do you think your opponent being older will impact the bout?",
        minRep: 1, maxRep: 10,
        trigger: (f, opp) => opp && (opp.age - f.age > 5),
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "It makes no difference", xp: 0 },
                { text: "I didn't think about it", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "You'd think he'd be smarter at this age", xp: 1 },
                { text: "Time to take Old Yeller out to pasture", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "He's from a different era", xp: 1 },
                { text: "My parents watched him on black & white TV", xp: 4 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "He's established and had a good career", xp: 0 },
                { text: "I respect him and don't think age matters", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "He's a relic it's time to send him home in a coffin", xp: -5 },
                { text: "With age comes wisdom", xp: -2 }
            ],
            OPPONENT: [
                { text: "He's just young and ignorant", xp: 0 },
                { text: "I'm tired of the disrespect", xp: 2 }
            ]
        }
    },
    {
        id: 'YOUNGER_OPPONENT',
        text: "How do you think your opponent being younger will impact the bout?",
        minRep: 1, maxRep: 10,
        trigger: (f, opp) => opp && (f.age - opp.age > 5),
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“Age doesn’t win fights training and preparation does.”", xp: 0 },
                { text: "“Younger or older, it’s still just two people in a ring.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“He’s too green. I’ll show him levels.”", xp: 1 },
                { text: "“He’s fast, but he’s not ready for my pressure.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“He’s young and flashy but I’m seasoned and stylish!”", xp: 2 },
                { text: "“Youth is great… until experience slaps it around.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“Youth brings energy, experience brings control.”", xp: 0 },
                { text: "“We’ve prepared for his pace and enthusiasm.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“He’s a kid. I’ll make him question everything.”", xp: 1 },
                { text: "“He’ll learn the hard way what real fighters look like.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "He thinks my youth is a weakness? He'll learn.", xp: 1 },
                { text: "I'll run circles around the old man.", xp: 1 }
            ]
        }
    },
    {
        id: 'WON_LAST_FIGHT',
        text: "You’re coming off a win, how does that momentum help you?",
        minRep: 1, maxRep: 10,
        trigger: (f) => f.record.history && f.record.history.length > 0 && f.record.history[0].outcome === 'WIN',
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“A win helps confidence, but every fight is new.”", xp: 0 },
                { text: "“Momentum is good, but I stay grounded.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“I’m on a roll. He’s next.”", xp: 1 },
                { text: "“Winning felt good but now I want more.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“I’m coming off a highlight! Let’s make another.”", xp: 2 },
                { text: "“Momentum? I’m basically a hype train.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“We built on the last performance.”", xp: 0 },
                { text: "“We corrected mistakes and improved.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“Winning reminded me how easy this is.”", xp: 1 },
                { text: "“I’m in his head already you know he saw my last fight.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "His last win means nothing to me.", xp: 1 },
                { text: "He's overconfident. That's a mistake.", xp: 1 }
            ]
        }
    },
    {
        id: 'BIG_STAGE',
        text: "Do you hope to be on the big stage one day?",
        minRep: 1, maxRep: 3,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“That’s the dream for every fighter.”", xp: 0 },
                { text: "“If I keep working, I’ll get there.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“I’m coming for the top. No one’s stopping me.”", xp: 1 },
                { text: "“Big stage? I’m kicking the door down.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“The big stage? I was born for it!”", xp: 2 },
                { text: "“Spotlights love me so it’s destiny.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“If I stay disciplined, opportunities will come.”", xp: 0 },
                { text: "“One step at a time. Earn it properly.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“I’ll be there sooner than people think.”", xp: 1 },
                { text: "“I visualise it every day — it’s happening.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "“He talks big, but he has to earn it.”", xp: 0 },
                { text: "“We’ll see if he’s built for that level.”", xp: 0 }
            ]
        }
    },
    {
        id: 'INSPIRATION',
        text: "Who inspired your boxing journey?",
        minRep: 4, maxRep: 6,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“A few fighters I grew up watching.”", xp: 0 },
                { text: "“My family supported me from day one.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“The warriors. The ones who fought anyone.”", xp: 1 },
                { text: "“I was inspired by fighters who never backed down.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“The entertainers and the ones who lit up arenas!”", xp: 2 },
                { text: "“Anyone who made boxing fun to watch.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“My coach and the greats of the sport.”", xp: 0 },
                { text: "“People who carried themselves with professionalism.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“I inspired myself. No idols.”", xp: 1 },
                { text: "“I watched everyone and decided I’d surpass them.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "“Good inspirations… but inspiration won’t save him.”", xp: 0 },
                { text: "“He’s got idols but I’m nobody’s idol.”", xp: 0 }
            ]
        }
    },
    {
        id: 'CEILING',
        text: "Where do you see your boxing ceiling?",
        minRep: 1, maxRep: 6,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“As high as I can push it.”", xp: 0 },
                { text: "“I’m still learning, still growing.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“At the top. Champion. End of story.”", xp: 1 },
                { text: "“My ceiling is higher than anyone here.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“Sky’s the limit and I’ve packed a parachute!”", xp: 2 },
                { text: "“I’m aiming for greatness and entertainment.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“As far as my work ethic takes me.”", xp: 0 },
                { text: "“I don’t set limits — I set goals.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“Higher than anyone expects.”", xp: 1 },
                { text: "“I’ll surpass every name they compare me to.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "“He’s dreaming too big.”", xp: 0 },
                { text: "“He’ll find out ceilings exist for a reason.”", xp: 0 }
            ]
        }
    },
    {
        id: 'CHAMPIONSHIP_FEELING',
        text: "How does it feel to be fighting for a championship?",
        minRep: 3, maxRep: 10,
        trigger: (f, opp, event) => event && event.titleFight,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“It’s an honour. I’m ready.”", xp: 1 },
                { text: "“This is what we work for.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“This belt is mine. He’s just holding it.”", xp: 2 },
                { text: "“I’m taking everything he has.”", xp: 2 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“A title fight? Perfect. More cameras!”", xp: 3 },
                { text: "“This is my moment — enjoy the show!”", xp: 3 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“It’s the result of hard work.”", xp: 1 },
                { text: "“I’m focused on performing at my best.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“I’ve visualised this for years.”", xp: 1 },
                { text: "“He won’t handle the pressure I bring.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "“He thinks he’s ready? We’ll see.”", xp: 1 },
                { text: "“He’s not taking this from me.”", xp: 1 }
            ]
        }
    },
    {
        id: 'CELEBRITY_SCANDAL',
        text: "What's your thoughts on the recent celebrity scandal?",
        minRep: 4, maxRep: 8,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“Not my business. I focus on boxing.”", xp: 0 },
                { text: "“I don’t follow that stuff.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“People need to mind their own lives.”", xp: 1 },
                { text: "“Drama like that is pathetic.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“Wild story! Keeps the internet busy.”", xp: 1 },
                { text: "“I’ll let the memes handle that one.”", xp: 1 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“I don’t comment on things outside the sport.”", xp: 0 },
                { text: "“Not relevant to my preparation.”", xp: 0 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“Distractions like that ruin careers.”", xp: 1 },
                { text: "“Shows how weak people can be mentally.”", xp: 1 }
            ],
            OPPONENT: [
                { text: "“He’s dodging the question… interesting.”", xp: 2 },
                { text: "“He’s pretending he doesn’t care.”", xp: 0 }
            ]
        }
    },
    {
        id: 'BUY_TICKETS',
        text: "Why should fans buy tickets for this fight?",
        minRep: 1, maxRep: 3,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“It’ll be a competitive fight.”", xp: 0, tickets: 5 },
                { text: "“Both of us bring effort every time.”", xp: 0, tickets: 5 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“Because I’m bringing a knockout.”", xp: 1, tickets: 10 },
                { text: "“Someone’s getting stopped.”", xp: 1, tickets: 10 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“I put on a show every time!”", xp: 2, tickets: 15 },
                { text: "“You’ll get entertainment from start to finish.”", xp: 2, tickets: 15 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“Two skilled fighters giving their all.”", xp: 0, tickets: 5 },
                { text: "“It’s a proper boxing match.”", xp: 0, tickets: 5 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“I’m making a statement.”", xp: 1, tickets: 10 },
                { text: "“You’ll witness something memorable.”", xp: 1, tickets: 10 }
            ],
            OPPONENT: [
                { text: "“Buy them to see him get humbled.”", xp: 1, tickets: 5 },
                { text: "“Fans know I always deliver.”", xp: 1, tickets: 5 }
            ]
        }
    },
    {
        id: 'TUNE_IN',
        text: "Why should fans tune in to this event?",
        minRep: 4, maxRep: 10,
        options: {
            [FIGHTER_PERSONALITIES.NORMAL]: [
                { text: "“It’s a strong card with real competitive matchups. Fans will get quality boxing.”", reputation: 5, tickets: 120, viewership: 8 },
                { text: "“Everyone on this event is coming to win. It’s worth watching from start to finish.”", reputation: 5, tickets: 100, viewership: 6 }
            ],
            [FIGHTER_PERSONALITIES.AGGRESSIVE]: [
                { text: "“Because someone’s getting stopped. People love knockouts, and I’m delivering one.”", reputation: 8, tickets: 180, viewership: 12 },
                { text: "“Tune in if you want violence. I’m ending this fight early.”", reputation: 10, tickets: 200, viewership: 15 }
            ],
            [FIGHTER_PERSONALITIES.SHOWMAN]: [
                { text: "“This whole event is box‑office — entertainment from the first bell to the last.”", reputation: 10, tickets: 200, viewership: 18 },
                { text: "“If you want drama, flair, and a show worth talking about, this is the one.”", reputation: 9, tickets: 190, viewership: 16 }
            ],
            [FIGHTER_PERSONALITIES.PROFESSIONAL]: [
                { text: "“It’s a high‑level event with well‑matched fighters. Fans will appreciate the skill on display.”", reputation: 6, tickets: 130, viewership: 7 },
                { text: "“This card represents the best of the sport with disciplined fighters and real competition.”", reputation: 5, tickets: 120, viewership: 6 }
            ],
            [FIGHTER_PERSONALITIES.MENTAL]: [
                { text: "“Because I’m stealing the show and people will be talking about my performance for weeks.”", reputation: 8, tickets: 170, viewership: 12 },
                { text: "“Tune in if you want to see a psychological dismantling. I’m making a statement.”", reputation: 9, tickets: 180, viewership: 14 }
            ],
            OPPONENT: [
                { text: "“Tune in to see me win. I’m the real headline here.”", reputation: 6, tickets: 140, viewership: 8 },
                { text: "“I’m the reason this event matters. Fans know I always deliver.”", reputation: 7, tickets: 150, viewership: 10 }
            ]
        }
    }
];


export const INJURY_SEVERITY = {
    INJURED: 'INJURED',
    BADLY_INJURED: 'BADLY_INJURED',
    SEVERELY_INJURED: 'SEVERELY_INJURED'
};

export const INJURY_DATA = {
    // CUTS (Headshots only - In Fight)
    'CUT_CHEEK': {
        name: 'Cut cheek',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Head',
        recoveryRange: [1, 1],
        effects: { vision: 0.95 },
        triggers: { inFight: true }
    },
    'BADLY_CUT_CHEEK': {
        name: 'Badly Cut Cheek',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [3, 3],
        effects: { vision: 0.85 },
        triggers: { inFight: true }
    },
    'CUT_EYELID': {
        name: 'Cut Eyelid',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Head',
        recoveryRange: [4, 4],
        effects: { vision: 0.75 },
        triggers: { inFight: true }
    },
    'BADLY_CUT_EYELID': {
        name: 'Badly cut eyelid',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [4, 4],
        effects: { vision: 0.65 },
        triggers: { inFight: true }
    },
    'CUT_EYEBROW': {
        name: 'Cut Eyebrow',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Head',
        recoveryRange: [1, 1],
        effects: { vision: 0.90 },
        triggers: { inFight: true }
    },
    'BADLY_CUT_EYEBROW': {
        name: 'Badly cut eyebrow',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [3, 3],
        effects: { vision: 0.80 },
        triggers: { inFight: true }
    },
    'CUT_FOREHEAD': {
        name: 'Cut forehead',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Head',
        recoveryRange: [4, 4],
        effects: { vision: 0.95 },
        triggers: { inFight: true }
    },
    'BADLY_CUT_FOREHEAD': {
        name: 'Badly cut forehead',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [8, 8],
        effects: { vision: 0.85 },
        triggers: { inFight: true }
    },
    'CUT_BELOW_EYE': {
        name: 'Cut below the eye',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Head',
        recoveryRange: [2, 2],
        effects: { vision: 0.85 },
        triggers: { inFight: true }
    },
    'BADLY_CUT_BELOW_EYE': {
        name: 'Badly cut below the eye',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [4, 4],
        effects: { vision: 0.70 },
        triggers: { inFight: true }
    },

    // TRAINING / GENERIC
    'PULLED_HAMSTRING': {
        name: 'Pulled Hamstring',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Legs',
        recoveryRange: [2, 4],
        effects: { speed: 0.8, dodge: 0.8 },
        triggers: { training: true, inFight: false }
    },
    'SPRAINED_ANKLE': {
        name: 'Sprained Ankle',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Legs',
        recoveryRange: [1, 3],
        effects: { speed: 0.7, dodge: 0.7 },
        triggers: { training: true, inFight: true }
    },
    'BRUISED_RIBS': {
        name: 'Bruised Ribs',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Body',
        recoveryRange: [2, 3],
        effects: { power: 0.9, stamina: 0.8 },
        triggers: { training: true, inFight: true }
    },
    'FRACTURED_RIB': {
        name: 'Fractured Rib',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Body',
        recoveryRange: [6, 8],
        effects: { power: 0.7, stamina: 0.6 },
        triggers: { training: true, inFight: true }
    },
    'SPRAINED_WRIST': {
        name: 'Sprained Wrist',
        severity: INJURY_SEVERITY.INJURED,
        bodyPart: 'Arm',
        recoveryRange: [2, 4],
        effects: { power: 0.7, technique: 0.9 },
        triggers: { training: true, inFight: true }
    },
    'BROKEN_HAND': {
        name: 'Broken Hand',
        severity: INJURY_SEVERITY.BADLY_INJURED,
        bodyPart: 'Arm',
        recoveryRange: [8, 12],
        effects: { power: 0.4, technique: 0.7 },
        triggers: { training: true, inFight: true }
    },
    'TORN_BICEP': {
        name: 'Torn Bicep',
        severity: INJURY_SEVERITY.SEVERELY_INJURED,
        bodyPart: 'Arm',
        recoveryRange: [16, 24],
        effects: { power: 0.3, technique: 0.6 },
        triggers: { training: true, inFight: false }
    },

    // OTHER HEAD / SERIOUS
    'CONCUSSION': {
        name: 'Concussion',
        severity: INJURY_SEVERITY.SEVERELY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [8, 16],
        effects: { immediateStoppage: true, vision: 0.5, speed: 0.5 },
        triggers: { inFight: true, training: true }
    },
    'BROKEN_JAW': {
        name: 'Broken Jaw',
        severity: INJURY_SEVERITY.SEVERELY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [24, 24],
        effects: { immediateStoppage: true },
        triggers: { inFight: true }
    },
    'HEAD_TRAUMA': {
        name: 'Head Trauma',
        severity: INJURY_SEVERITY.SEVERELY_INJURED,
        bodyPart: 'Head',
        recoveryRange: [8, 8],
        effects: { immediateStoppage: true },
        triggers: { inFight: true }
    }
};

export const INJURIES = [];

export const PROMOTION_ACTIVITIES = {
    1: [
        { text: "Your fighter decided to tell a mate about the fight.", tickets: 1, oncePerCamp: true },
        { text: "Your fighter brought their family to his fight.", tickets: 3, oncePerCamp: true },
        { text: "Your fighter did nothing to promote the fight.", tickets: 0 },
        { text: "Your fighter was lazy and forgot to promote the fight.", tickets: 0 },
        { text: "Your fighter doesn’t like the spotlight and didn’t promote the fight.", tickets: 0, maxCharisma: 5 },
        { text: "Your fighter posted on BoxoGram to promote the fight.", xp: 1 },
        { text: "Your fighter posted a hilarious cat video on ClockTick.", xp: 20, chance: 0.001 },
        { text: "Your fighter attempted to sell tickets at the {place}.", tickets: [1, 10], chance: 0.5, places: ['church', 'corner shop', 'library', 'pub', 'train station', 'strip club', 'council building', 'local gym', 'car wash'] },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 30 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [2, 10] },
        { text: "Your fighter left a flyer at the local supermarket.", tickets: [2, 5] }
    ],
    2: [
        { text: "Your fighter decided to tell a mate about the fight.", bonusCash: 50, oncePerCamp: true },
        { text: "Your fighter brought their family to his fight.", tickets: 3, oncePerCamp: true },
        { text: "Your fighter did nothing to promote the fight.", tickets: 0 },
        { text: "Your fighter posted on BoxoGram to promote the fight.", xp: 1 },
        { text: "Your boxer tried befriend a famous boxer.", xp: 10, chance: 0.02 },
        { text: "Your boxer shouted ‘Koogz’ at a local boxing show.", xp: 1, chance: 0.001 },
        { text: "Your boxer ran a gym class for local children.", xp: 2 },
        { text: "Your fighter attempted to sell tickets at the {place}.", tickets: [5, 20], chance: 0.5, places: ['library', 'pub', 'train station', 'strip club', 'council building', 'local gym'] },
        { text: "Your fighter sold 5 VIP tickets to a local businessman.", vipTickets: 5, chance: 0.02 },
        { text: "Your fighter engaged in a street fight. He was victorious by KO.", xp: 10, legalCosts: 50, chance: 0.005, oncePerCamp: true },
        { text: "Your fighter engaged in a street fight. He was knocked out beside the bins.", xp: -20, injury: { name: "Knocked out by the bins", weeksRemaining: 1, severity: 0.1 }, chance: 0.005, oncePerCamp: true, minWeeksAway: 1 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 30 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [10, 20] },
        { text: "Your fighter doesn’t like the spotlight and didn’t promote the fight.", tickets: 0, maxCharisma: 50 },
        { text: "Your fighter left a flyer at the local supermarket.", tickets: [2, 5] },
        { text: "Your fighter got a makeover.", charisma: 1, chance: 0.01, oncePerCamp: true }
    ],
    3: [
        { text: "Your fighter brought their family to his fight.", tickets: 3, oncePerCamp: true },
        { text: "Your fighter did nothing to promote the fight.", tickets: 0 },
        { text: "Your fighter posted on BoxoGram to promote the fight.", xp: 1 },
        { text: "Your fighter sold tickets around the local gym.", tickets: [5, 20], chance: 0.05 },
        { text: "Your fighter tried befriend a famous boxer.", xp: 10, chance: 0.03 },
        { text: "Your fighter organised boxing channel interview.", xp: 1 },
        { text: "Your fighter stood next to his model wife for a photoshoot.", xp: 5, chance: 0.001 },
        { text: "Your fighter sold 5 VIP tickets to a local businessman.", vipTickets: 5, chance: 0.02 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 30 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [10, 20] },
        { text: "Your fighter tried to sell tickets around the local prison. Surprisingly nobody could come.", tickets: 0, chance: 0.02, oncePerCamp: true },
        { text: "Your fighter doesn’t like the spotlight and didn’t promote the fight.", tickets: 0, maxCharisma: 50 },
        { text: "Your fighter got a makeover.", charisma: 1, chance: 0.01, oncePerCamp: true }
    ],
    4: [ // Regional
        { text: "Your fighter brought their family to his fight.", tickets: 3, oncePerCamp: true },
        { text: "Your fighter did nothing to promote the fight.", tickets: 0 },
        { text: "Your fighter posted on BoxoGram to promote the fight.", xp: 1 },
        { text: "Your fighter tried befriend a famous boxer.", xp: 10, chance: 0.05 },
        { text: "Your fighter organised boxing channel interview.", xp: 1 },
        { text: "Your fighter ate a lot of Chinese food.", stamina: -5, xp: [1, 5], chance: 0.01, oncePerFighter: true },
        { text: "Your fighter appeared in the local newspaper for an interview.", xp: 10, chance: 0.01 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 30 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [30, 50] },
        { text: "Your fighter doesn’t like the spotlight and didn’t promote the fight.", tickets: 0, maxCharisma: 50 }
    ],
    5: [ // Pro (Full-Timer)
        { text: "Your fighter misspelt a series of words on social media, delighting his fans.", xp: 5, chance: 0.001 },
        { text: "Your fighter did nothing to promote the fight.", tickets: 0 },
        { text: "Your fighter made a gym video for YouVideo.", xp: 5 },
        { text: "Your fighter made a funny post on BoxoGram.", xp: 5 },
        { text: "Your fighter organised boxing channel interview.", xp: 2 },
        { text: "Your fighter appeared in the local newspaper for an interview.", xp: 4, chance: 0.20 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 40 },
        { text: "Your fighter posted on BoxoGram to promote the fight.", xp: 1 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [40, 75] }
    ],
    6: [ // National
        { text: "Your fighter appeared on a Boxing Radio Channel.", xp: 5 },
        { text: "Your fighter organised boxing channel interview.", xp: 3 },
        { text: "Your fighter organised a Boxing Trade Magazine interview.", xp: 5, oncePerCamp: true },
        { text: "Your fighter appeared in the local newspaper for an interview.", xp: 5 },
        { text: "Your fighter appeared ringside for a TV fight.", xp: 10, oncePerCamp: true },
        { text: "Your fighter insulted an opponent on social media.", xp: 25, chance: 0.05 },
        { text: "Your fighter entered the ring and called out a higher reputation fighter.", xp: 10, chance: 0.005 },
        { text: "Your fighter joined an adult content website.", xp: 10, chance: 0.001 },
        { text: "Your fighter appeared as a pundit for a local promoters televised show.", xp: 5 },
        { text: "Your fighter did nothing to promote the fight.", tickets: 0 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 40 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [100, 200] }
    ],
    7: [ // Top National
        { text: "Your fighter appeared on a national Sports programme.", xp: 5 },
        { text: "Your fighter attended a national boxing magazine interview.", xp: 5 },
        { text: "Your fighter appeared on some guy’s podcast.", xp: [1, 3] },
        { text: "Your fighter appeared ringside for a TV fight.", xp: 2 },
        { text: "Your fighter bragged about ability on social media.", xp: [-11, 10] },
        { text: "Your fighter met and posed for a photo with a boxing legend.", xp: 10 },
        { text: "Your fighter signed a deal with a local {place} company.", xp: 1, revenue: 1000, places: ['carpet', 'cleaning', 'building', 'welding', 'plumbing'] },
        { text: "Your fighter started a debate about scoring on Boxogram.", xp: 1, oncePerCamp: true },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 8 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [150, 250] }
    ],
    8: [ // Continental
        { text: "Your fighter bragged about his ability on social media.", xp: [-10, 5] },
        { text: "Your fighter posed with a boxing legend.", xp: 10 },
        { text: "Your fighter pulled off a crypto scam.", xp: -10, revenue: 10000, chance: 0.01 },
        { text: "Your fighter made an appearance on an international boxing TV channel.", xp: 10 },
        { text: "Your fighter launched a clothing brand.", xp: 50, revenue: 10000, chance: 0.01, oncePerCamp: true },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 50 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [250, 500] }
    ],
    9: [ // Intercontinental
        { text: "Your fighter showed off a hidden talent on social media.", xp: 50, minCharisma: 70 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 50 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [1000, 2000] }
    ],
    10: [ // World
        { text: "Your fighter announced a deal with a worldwide brand.", xp: 100, revenue: 100000 },
        { text: "Your fighter posted a bland message on Boxogram.", tickets: 0, maxCharisma: 60 },
        { text: "Your fighter sold tickets on BoxoGram for the upcoming fight.", tickets: [5000, 10000] }
    ]
};


export const FINANCIAL_DATA = {
    WEEKLY_FIGHTER_COST: {
        1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 100, 8: 300, 9: 500, 10: 1000
    },
    NEGOTIATION_COST: {
        1: 1, 2: 2, 3: 5, 4: 10, 5: 50, 6: 100, 7: 500, 8: 1000, 9: 10000, 10: 100000
    },
    OFFICE_WEEKLY_COST: {
        1: 10, 2: 20, 3: 30, 4: 40, 5: 50, 6: 60, 7: 100, 8: 300, 9: 500, 10: 1000
    },
    TRAVEL_COST_SAME_COUNTRY: {
        1: 20, 2: 40, 3: 80, 4: 150, 5: 350, 6: 700, 7: 1200, 8: 2500, 9: 4000, 10: 10000
    },
    TRAVEL_COST_DIFF_COUNTRY: {
        1: 200, 2: 400, 3: 800, 4: 1500, 5: 3500, 6: 7000, 7: 12000, 8: 25000, 9: 40000, 10: 100000
    },
    SICK_PAY: {
        1: 20, 2: 40, 3: 80, 4: 150, 5: 350, 6: 700, 7: 1200, 8: 2500, 9: 4000, 10: 10000
    },
    KO_BONUS: {
        1: 20, 2: 40, 3: 80, 4: 150, 5: 350, 6: 700, 7: 1200, 8: 2500, 9: 4000, 10: 10000
    },
    GATE_LIMITS: {
        1: { tickets: 150, price: 50, vip: 100 },
        2: { tickets: 250, price: 50, vip: 100 },
        3: { tickets: 350, price: 50, vip: 100 },
        4: { tickets: 450, price: 50, vip: 100 },
        5: { tickets: 600, price: 50, vip: 100 },
        6: { tickets: 1000, price: 60, vip: 120 },
        7: { tickets: 5000, price: 60, vip: 120 },
        8: { tickets: 10000, price: 80, vip: 200 },
        9: { tickets: 20000, price: 90, vip: 250 },
        10: { tickets: 100000, price: 100, vip: 1000 }
    },
    FIGHTER_TICKET_SALES: {
        1: [30, 50],
        2: [60, 100],
        3: [90, 130],
        4: [150, 200],
        5: [300, 400],
        6: [60, 700], // Note: user said 600-700, probably 600-700
        7: [1000, 3000],
        8: [2000, 8000],
        9: [10000, 150000],
        10: [50000, 80000]
    },
    MERCHANDISE: {
        1: { name: 'Fight Programme', price: 10, cost: 2 },
        2: { name: 'T-Shirt', price: 20, cost: 4 },
        3: { name: 'Keyring', price: 5, cost: 1, extraChance: 0.3 },
        4: { name: 'Mini Gloves', price: 10, cost: 2 },
        5: { name: 'Animal Chocolate', price: 2, cost: 0, extraChance: 0.8 },
        6: { name: 'Jacket', price: 60, cost: 10 },
        7: { name: 'Signed Photo', price: 50, cost: 1 },
        8: { name: 'Hoodie', price: 80, cost: 20 },
        9: { name: 'Subscription', price: 100, cost: 1 },
        10: { name: 'Custom Gloves', price: 250, cost: 50 }
    },
    TV_DEALS: {
        6: { min: 20000, max: 40000, chance: 0.75 },
        7: { min: 30000, max: 70000, chance: 0.90 },
        8: { min: 100000, max: 150000, chance: 1.0 },
        9: { min: 200000, max: 500000, chance: 1.0 },
        10: { min: 1200000, max: 10000000, chance: 1.0 }
    }
};

export const ASSETS = {
    BACKGROUND: 'https://rosebud.ai/assets/setup-background.webp?TrWV',
    LOGO_LION: 'https://rosebud.ai/assets/logo-lion.webp?Lrla',
    LOGO_GLOVE: 'https://rosebud.ai/assets/logo-glove.webp?gveu',
    LOGO_CROWN: 'https://rosebud.ai/assets/logo-crown.webp?EZkQ',
    LOGO_FIST: 'https://rosebud.ai/assets/logo-fist.webp?C2LB',
    TITLE_WORLD: 'https://rosebud.ai/assets/title-world-belt.webp?nPp8',
    TITLE_INTERCONTINENTAL: 'https://rosebud.ai/assets/title-intercontinental-belt.webp?oQ1x',
    TITLE_CONTINENTAL: 'https://rosebud.ai/assets/title-intercontinental-belt.webp?oQ1x', // Reusing elite visual
    TITLE_NATIONAL: 'https://rosebud.ai/assets/title-national-belt-new.webp?DQdJ',
    TITLE_REGIONAL: 'https://rosebud.ai/assets/title-regional-belt-new.webp?hxoF',
    TITLE_LOCAL: 'https://rosebud.ai/assets/title-local-belt-v2.webp?iMyL'
};

export const LOGO_OPTIONS = [
    { name: 'Lion', url: 'https://rosebud.ai/assets/logo-lion.webp?Lrla' },
    { name: 'Glove', url: 'https://rosebud.ai/assets/logo-glove.webp?gveu' },
    { name: 'Crown', url: 'https://rosebud.ai/assets/logo-crown.webp?EZkQ' },
    { name: 'Fist', url: 'https://rosebud.ai/assets/logo-fist.webp?C2LB' },
    { name: 'Eagle', url: 'https://rosebud.ai/assets/logo-eagle.webp?q2fq' },
    { name: 'Bull', url: 'https://rosebud.ai/assets/logo-bull.webp?i2Kh' },
    { name: 'Shield', url: 'https://rosebud.ai/assets/logo-shield.webp?fDCN' },
    { name: 'Star', url: 'https://rosebud.ai/assets/logo-star.webp?INvg' },
    { name: 'Bolt', url: 'https://rosebud.ai/assets/logo-bolt.webp?Ads1' },
    { name: 'Wolf', url: 'https://rosebud.ai/assets/logo-wolf.webp?mZ6C' },
    { name: 'Bear', url: 'https://rosebud.ai/assets/logo-bear.webp?aiuD' },
    { name: 'Dragon', url: 'https://rosebud.ai/assets/logo-dragon.webp?qX6P' },
    { name: 'Tiger', url: 'https://rosebud.ai/assets/logo-tiger.webp?tscL' },
    { name: 'Panther', url: 'https://rosebud.ai/assets/logo-panther.webp?rc55' },
    { name: 'Phoenix', url: 'https://rosebud.ai/assets/logo-phoenix.webp?PCGw' },
    { name: 'Cobra', url: 'https://rosebud.ai/assets/logo-cobra.webp?kTzZ' },
    { name: 'Shark', url: 'https://rosebud.ai/assets/logo-shark.webp?9eWv' },
    { name: 'Rhino', url: 'https://rosebud.ai/assets/logo-rhino.webp?aq91' },
    { name: 'Hammer', url: 'https://rosebud.ai/assets/logo-hammer.webp?fFrK' },
    { name: 'Anvil', url: 'https://rosebud.ai/assets/logo-anvil.webp?QNld' },
    { name: 'Sword', url: 'https://rosebud.ai/assets/logo-sword.webp?ZZrf' },
    { name: 'Axe', url: 'https://rosebud.ai/assets/logo-axe.webp?Ya7f' },
    { name: 'Crown v2', url: 'https://rosebud.ai/assets/logo-crown-v2.webp?OH6p' },
    { name: 'Helmet', url: 'https://rosebud.ai/assets/logo-helmet.webp?3JIN' },
    { name: 'Gauntlet', url: 'https://rosebud.ai/assets/logo-gauntlet.webp?QjPR' },
    { name: 'Ring Icon', url: 'https://rosebud.ai/assets/logo-ring-icon.webp?ftvV' },
    { name: 'Trophy', url: 'https://rosebud.ai/assets/logo-trophy.webp?sw98' },
    { name: 'Medal', url: 'https://rosebud.ai/assets/logo-medal.webp?KdG6' },
    { name: 'Diamond', url: 'https://rosebud.ai/assets/logo-diamond.webp?Mu89' },
    { name: 'Ruby', url: 'https://rosebud.ai/assets/logo-ruby.webp?oaGH' },
    { name: 'Sapphire', url: 'https://rosebud.ai/assets/logo-sapphire.webp?REb6' },
    { name: 'Onyx', url: 'https://rosebud.ai/assets/logo-onyx.webp?jaS0' },
    { name: 'Platinum', url: 'https://rosebud.ai/assets/logo-platinum.webp?hQ0s' },
    { name: 'Gold Bar', url: 'https://rosebud.ai/assets/logo-gold-bar.webp?ZjXV' },
    { name: 'Silver Coin', url: 'https://rosebud.ai/assets/logo-silver-coin.webp?1uWv' },
    { name: 'Bronze Coin', url: 'https://rosebud.ai/assets/logo-bronze-coin.webp?13PK' },
    { name: 'Globe', url: 'https://rosebud.ai/assets/logo-globe.webp?Wsbz' },
    { name: 'Compass', url: 'https://rosebud.ai/assets/logo-compass.webp?gAa9' },
    { name: 'Anchor', url: 'https://rosebud.ai/assets/logo-anchor.webp?YM2c' },
    { name: 'Wheel', url: 'https://rosebud.ai/assets/logo-wheel.webp?XPQo' },
    { name: 'Gear', url: 'https://rosebud.ai/assets/logo-gear.webp?KEq0' },
    { name: 'Flame', url: 'https://rosebud.ai/assets/logo-flame-icon.webp?bt6O' },
    { name: 'Ice', url: 'https://rosebud.ai/assets/logo-ice-icon.webp?lppq' },
    { name: 'Storm', url: 'https://rosebud.ai/assets/logo-storm-icon.webp?iCEx' },
    { name: 'Sun', url: 'https://rosebud.ai/assets/logo-sun-icon.webp?DfXH' },
    { name: 'Moon', url: 'https://rosebud.ai/assets/logo-moon-icon.webp?eSm3' },
    { name: 'Comet', url: 'https://rosebud.ai/assets/logo-comet-icon.webp?qNTL' },
    { name: 'Nebula', url: 'https://rosebud.ai/assets/logo-nebula-icon.webp?MZcO' },
    { name: 'Galaxy', url: 'https://rosebud.ai/assets/logo-galaxy-icon.webp?Mmy3' },
    { name: 'Atom', url: 'https://rosebud.ai/assets/logo-atom-icon.webp?QCT6' },
    { name: 'Skull', url: 'https://rosebud.ai/assets/logo-skull-icon.webp?b4Tn' },
    { name: 'Bones', url: 'https://rosebud.ai/assets/logo-bones-icon.webp?QYse' },
    { name: 'Rocket', url: 'https://rosebud.ai/assets/logo-rocket-icon.webp?3PJO' },
    { name: 'Satellite', url: 'https://rosebud.ai/assets/logo-satellite-icon.webp?lRNN' },
    { name: 'Laser', url: 'https://rosebud.ai/assets/logo-laser-icon.webp?XD7z' },
    { name: 'Magnet', url: 'https://rosebud.ai/assets/logo-magnet-icon.webp?OfVh' },
    { name: 'Prism', url: 'https://rosebud.ai/assets/logo-prism-icon.webp?5d0S' },
    { name: 'Lens', url: 'https://rosebud.ai/assets/logo-lens-icon.webp?7hbX' }
];

export const PRESS_CONFERENCE_CHOICES = [
    {
        id: 'RESPECTFUL',
        label: 'RESPECTFUL',
        description: 'Focus on mutual respect and the sport of boxing.',
        charismaMod: 2,
        repGain: 5,
        matchValueMod: 1.0,
        text: '\"My opponent is a great champion. I have prepared my best and we will give the fans a classic.\"'
    },
    {
        id: 'BRASH',
        label: 'BRASH',
        description: 'Mock the opponent and guarantee a knockout.',
        charismaMod: 5,
        repGain: 10,
        matchValueMod: 1.25,
        text: '\"He looks soft. I am going to end this in three rounds. Don\'t blink.\"'
    },
    {
        id: 'MYSTERIOUS',
        label: 'MYSTERIOUS',
        description: 'Give short, cryptic answers to the media.',
        charismaMod: -2,
        repGain: 2,
        matchValueMod: 0.9,
        text: '\"I am ready. Everything else is just noise. See you in the ring.\"'
    },
    {
        id: 'CONTROVERSIAL',
        label: 'CONTROVERSIAL',
        description: 'Start a heated argument or create a "scene".',
        charismaMod: 10,
        repGain: 20,
        matchValueMod: 1.5,
        text: '*Tips over the table and stares down opponent intensely*'
    }
];

export const CHAMPIONSHIPS = {
    'GLOBAL': { name: 'GLOBAL WORLD TITLE', icon: 'https://rosebud.ai/assets/global-world-title.webp?OBHp', level: 10, rounds: 12, org: 'GLOBAL', color: '#FFD700', minRank: 1, maxRank: 10 },
    'SUPREME': { name: 'SUPREME WORLD TITLE', icon: 'https://rosebud.ai/assets/supreme-world-title.webp?Uqlm', level: 10, rounds: 12, org: 'SUPREME', color: '#FF4C4C', minRank: 1, maxRank: 10 },
    'SUPER': { name: 'SUPER WORLD TITLE', icon: 'https://rosebud.ai/assets/super-world-title.webp?u9Yb', level: 10, rounds: 12, org: 'SUPER', color: '#B026FF', minRank: 1, maxRank: 10 },
    'MEGA': { name: 'MEGA WORLD TITLE', icon: 'https://rosebud.ai/assets/mega-world-title.webp?otPL', level: 10, rounds: 12, org: 'MEGA', color: '#00FFCC', minRank: 1, maxRank: 10 },
    'INTERCONTINENTAL': { name: 'INTERCONTINENTAL TITLE', icon: 'https://rosebud.ai/assets/title-intercontinental-belt.webp?oQ1x', level: 9, rounds: 12, minRank: 11, maxRank: 50, color: '#C0C0C0', contenderRange: [11, 15] },
    'CONTINENTAL': { name: 'CONTINENTAL TITLE', icon: 'https://rosebud.ai/assets/title-intercontinental-belt.webp?oQ1x', level: 8, rounds: 12, minRank: 51, maxRank: 100, color: '#CD7F32', contenderRange: [51, 60] },
    'BRITISH': { name: 'BRITISH TITLE', icon: 'https://rosebud.ai/assets/title-national-belt-new.webp?DQdJ', level: 7, rounds: 12, minRank: 101, maxRank: 200, nationality: ['UK'], color: '#00247D', contenderRange: [101, 110] },
    'USA': { name: 'USA TITLE', icon: 'https://rosebud.ai/assets/title-national-belt-new.webp?DQdJ', level: 7, rounds: 12, minRank: 101, maxRank: 200, nationality: ['USA'], color: '#B22234', contenderRange: [101, 110] },
    'ROW': { name: 'REST OF WORLD TITLE', icon: 'https://rosebud.ai/assets/title-intercontinental-belt.webp?oQ1x', level: 6, rounds: 10, minRank: 101, maxRank: 500, excludeNationality: ['UK'], color: '#FFFFFF', contenderRange: [101, 110] },
    'REGIONAL_UK': { name: 'REGIONAL UK TITLE', icon: 'https://rosebud.ai/assets/title-regional-belt-new.webp?hxoF', level: 5, rounds: 10, minRank: 201, maxRank: 500, nationality: ['UK'], color: '#FFD700', contenderRange: [200, 220] }
};

export const WORLD_ORGS = ['GLOBAL', 'SUPREME', 'SUPER', 'MEGA'];

export const MANDATORY_CHANCE = {
    2: 0.23,
    3: 0.20,
    4: 0.15,
    5: 0.12,
    6: 0.10,
    7: 0.08,
    8: 0.06,
    9: 0.04,
    10: 0.02
};

export const UNIFICATION_CHANCE = {
    1: 0.05,
    2: 0.10,
    3: 0.15,
    4: 0.20,
    5: 0.25,
    6: 0.50,
    7: 0.75,
    8: 0.90,
    9: 0.90,
    10: 1.00
};

export const COLOR_SCHEMES = {
    GOLD: { primary: 0xFFD700, strPrimary: '#FFD700', secondary: 0x00D1FF, strSecondary: '#00D1FF' },
    NEON_PINK: { primary: 0xFF00FF, strPrimary: '#FF00FF', secondary: 0x00FF00, strSecondary: '#00FF00' },
    CYBER_GREEN: { primary: 0x39FF14, strPrimary: '#39FF14', secondary: 0xFFD700, strSecondary: '#FFD700' },
    ICE_BLUE: { primary: 0x00D1FF, strPrimary: '#00D1FF', secondary: 0xFF4C4C, strSecondary: '#FF4C4C' }
};

export const COLORS = {
    GOLD: 0xFFD700,
    RED: 0xFF4C4C,
    BLACK: 0x121212,
    WHITE: 0xF5F5F5,
    GRAY: 0x2A2A2A,
    ACCENT: 0x00D1FF,
    STR_GOLD: '#FFD700',
    STR_RED: '#FF4C4C',
    STR_WHITE: '#F5F5F5',
    STR_ACCENT: '#00D1FF'
};

export const FONTS = {
    TITLE: 'Bebas Neue',
    BODY: 'Inter'
};

export const WEIGHT_DIVISIONS = [
    { name: 'Minimumweight', limit: 105 },
    { name: 'Flyweight', limit: 112 },
    { name: 'Bantamweight', limit: 118 },
    { name: 'Featherweight', limit: 126 },
    { name: 'Lightweight', limit: 135 },
    { name: 'Welterweight', limit: 147 },
    { name: 'Middleweight', limit: 160 },
    { name: 'Light Heavyweight', limit: 175 },
    { name: 'Cruiserweight', limit: 200 },
    { name: 'Heavyweight', limit: 999 }
];

export const NATIONALITIES = [
    { code: 'UK', name: 'United Kingdom', regions: ['London', 'Manchester', 'Glasgow', 'Belfast', 'Cardiff'] },
    { code: 'USA', name: 'United States', regions: ['New York', 'Las Vegas', 'Los Angeles', 'Chicago', 'Miami'] },
    { code: 'MEX', name: 'Mexico', regions: ['Mexico City', 'Tijuana', 'Guadalajara'] },
    { code: 'JPN', name: 'Japan', regions: ['Tokyo', 'Osaka', 'Nagoya'] },
    { code: 'GER', name: 'Germany', regions: ['Berlin', 'Hamburg', 'Munich'] }
];

export const BOXING_STYLES = [
    'Outboxer',
    'Point Scorer',
    'Slugger',
    'Counter Puncher',
    'Inside Fighter',
    'Survivor',
    'Warrior',
    'Technician',
    'Dirty',
    'Body Puncher'
];

export const BOXING_STYLE_DATA = {
    'Outboxer': {
        target: { head: 75, body: 25 },
        defense: { counter: 5, block: 20, dodge: 70, clinch: 5 },
        punches: { jab: 50, hook: 10, uppercut: 10, straight: 30, overhand: 0 }
    },
    'Point Scorer': {
        target: { head: 25, body: 75 },
        defense: { counter: 40, block: 30, dodge: 25, clinch: 5 },
        punches: { jab: 80, hook: 5, uppercut: 5, straight: 10, overhand: 0 }
    },
    'Slugger': {
        target: { head: 80, body: 20 },
        defense: { counter: 10, block: 60, dodge: 20, clinch: 10 },
        punches: { jab: 40, hook: 30, uppercut: 10, straight: 15, overhand: 5 }
    },
    'Counter Puncher': {
        target: { head: 70, body: 30 },
        defense: { counter: 60, block: 15, dodge: 15, clinch: 10 },
        punches: { jab: 60, hook: 15, uppercut: 15, straight: 10, overhand: 0 }
    },
    'Inside Fighter': {
        target: { head: 65, body: 35 },
        defense: { counter: 50, block: 30, dodge: 5, clinch: 15 },
        punches: { jab: 40, hook: 20, uppercut: 20, straight: 15, overhand: 5 }
    },
    'Survivor': {
        target: { head: 60, body: 40 },
        defense: { counter: 10, block: 70, dodge: 5, clinch: 25 },
        punches: { jab: 80, hook: 7, uppercut: 7, straight: 6, overhand: 0 }
    },
    'Warrior': {
        target: { head: 80, body: 20 },
        defense: { counter: 10, block: 60, dodge: 15, clinch: 15 },
        punches: { jab: 50, hook: 15, uppercut: 20, straight: 10, overhand: 5 }
    },
    'Technician': {
        target: { head: 60, body: 40 },
        defense: { counter: 35, block: 40, dodge: 20, clinch: 5 },
        punches: { jab: 60, hook: 10, uppercut: 10, straight: 18, overhand: 2 }
    },
    'Dirty': {
        target: { head: 50, body: 50 },
        defense: { counter: 10, block: 50, dodge: 30, clinch: 30 },
        punches: { jab: 55, hook: 20, uppercut: 10, straight: 15, overhand: 0 }
    },
    'Body Puncher': {
        target: { head: 20, body: 80 },
        defense: { counter: 25, block: 15, dodge: 50, clinch: 10 },
        punches: { jab: 50, hook: 25, uppercut: 5, straight: 20, overhand: 0 }
    }
};

export const BE_YOURSELF_SHOUT = {
    id: 'be_yourself',
    name: "Be Yourself",
    desc: "Stick to the plan and fight your own way.",
    mods: {}
};

export const GENERIC_SHOUTS = [
    {
        id: 'look_for_ko',
        name: "Look for the K.O",
        desc: "Increases KO chances but reduces defence.",
        mods: { knockdownChanceMult: 2.0, defensiveAll: 0.5 }
    },
    {
        id: 'increase_pressure',
        name: "Increase the pressure",
        desc: "Throw more punches but burn more stamina.",
        mods: { punchOutput: 1.25, staminaCostMult: 1.25 }
    },
    {
        id: 'stay_out_of_trouble',
        name: "Stay out of trouble",
        desc: "Throw less punches but try to avoid more damage.",
        mods: { punchOutput: 0.75, dodge: 1.25 }
    },
    {
        id: 'let_him_tire_out',
        name: "Let him tire out",
        desc: "Increase your opponent's stamina drain but throw less punches.",
        mods: { opponentStaminaDrainMult: 1.2, punchOutput: 0.5 }
    },
    {
        id: 'just_win_round',
        name: "Just win the round",
        desc: "Try to win the round with more activity.",
        mods: { punchOutput: 1.25, jabStaminaDrainMult: 1.5 }
    },
    {
        id: 'stop_using_jab',
        name: "Stop using the jab",
        desc: "Reduce jab output at the expense of stamina burn.",
        mods: { jabOutput: 0.5, staminaCostMult: 1.5 }
    },
    {
        id: 'focus_timing',
        name: "Focus on your timing",
        desc: "Increases timing but reduces power.",
        mods: { timing: 1.25, power: 0.75 }
    },
    {
        id: 'throw_kitchen_sink',
        name: "Throw the kitchen sink",
        desc: "Increases offensive skills with a heavy deduction to defensive skills.",
        mods: { offensiveAll: 1.25, defensiveAll: 0.5 }
    },
    {
        id: 'adopt_new_style',
        name: "Adopt a new style",
        desc: "Changes the fighter's style for the next round.",
        isStyleChange: true,
        mods: {}
    }
];

export const REPUTATION_STATUS_LABELS = {
    1: 'A NOBODY',
    2: 'PART-TIMER',
    3: 'LOCAL',
    4: 'REGIONAL',
    5: 'FULL-TIMER',
    6: 'NATIONAL',
    7: 'TOP NATIONAL',
    8: 'CONTINENTAL',
    9: 'INTERCONTINENTAL',
    10: 'WORLD'
};

export const REPUTATION_THRESHOLDS = [
    { level: 1, minXP: 0, maxXP: 50, multiplier: 5 },
    { level: 2, minXP: 51, maxXP: 75, multiplier: 5 },
    { level: 3, minXP: 76, maxXP: 100, multiplier: 8 },
    { level: 4, minXP: 101, maxXP: 150, multiplier: 10 },
    { level: 5, minXP: 151, maxXP: 250, multiplier: 10 },
    { level: 6, minXP: 251, maxXP: 400, multiplier: 15 },
    { level: 7, minXP: 401, maxXP: 550, multiplier: 20 },
    { level: 8, minXP: 551, maxXP: 700, multiplier: 30 },
    { level: 9, minXP: 701, maxXP: 875, multiplier: 40 },
    { level: 10, minXP: 876, maxXP: 1000, multiplier: 50 }
];

export const REPUTATION_RULES = {
    1: { rounds: 4, campWeeks: 4 },
    2: { rounds: 4, campWeeks: 4 },
    3: { rounds: 4, campWeeks: 4 },
    4: { rounds: 6, campWeeks: 6 },
    5: { rounds: 6, campWeeks: 6 },
    6: { rounds: 8, campWeeks: 8 },
    7: { rounds: 8, campWeeks: 8 },
    8: { rounds: 10, campWeeks: 10 },
    9: { rounds: 10, campWeeks: 10 },
    10: { rounds: 10, campWeeks: 10 }
};

export const TITLE_FIGHT_RULES = {
    rounds: 12,
    campWeeks: 10
};

export const ROUND_DURATION_SEC = 180; // 3 minutes

// --- FIGHT REBALANCE CONSTANTS ---
export const BASE_STAM = 5;
export const QUALITY_DENOM = 80;
export const POWER_ADV_THRESHOLD = 8;
export const POWER_FLOOR_MULT = 0.45;
export const MISS_STAM_FACTOR = 0.7;
export const STUNNED_STAM_FACTOR = 0.8;
export const CLINCH_COST_FACTOR = 0.5;

export const RATING_DIFF_KO_BASE = 0.03;
export const RATING_DIFF_KO_SLOPE = 0.02;
export const RATING_DIFF_KO_CAP = 0.25;
export const HEALTH_KO_MULT = 0.15;

export const PUNCH_BLOCK_FACTORS = {
    'Jab': 0.6,
    'Straight': 0.75,
    'Hook': 0.85,
    'Uppercut': 0.9,
    'Overhand': 0.95
};

export const STUN_TIERS = {
    TIER_1: { finisher: 0.12, lowHealth: 0.10, techGap: 0.08 },
    TIER_2: { accGap: 0.06, lowStam: 0.05 }
};
// ---------------------------------

export const CREATED_FIGHTER_LIMIT = 10;

export const PURSE_BANDS = {
    4: {
        LOW: [500, 600],
        MID: [600, 700],
        HIGH: [700, 800]
    },
    6: {
        LOW: [800, 1500],
        MID: [1000, 3000],
        HIGH: [1000, 3000] // Fallback
    },
    8: {
        LOW: [2000, 10000],
        MID: [2500, 15000], // Interpolated
        HIGH: [3000, 20000]
    },
    10: {
        LOW: [5000, 30000],
        MID: [10000, 250000],
        HIGH: [250000, 5000000]
    },
    12: { // Title fights
        LOW: [10000, 50000],
        MID: [50000, 500000],
        HIGH: [500000, 10000000]
    }
};

export const CONTRACT_CLM = {
    SECURITY: { // Below National (Level 6)
        1: 1.00, 2: 0.95, 3: 0.90, 4: 0.85, 5: 0.80
    },
    FLEXIBILITY: { // National or above
        1: 1.00, 2: 1.10, 3: 1.20, 4: 1.30, 5: 1.50
    }
};

export const PROMOTION_ASSETS = [
    { id: 'BOXO_PAGE', name: 'BoxoGram page', level: 1, cost: 500, description: 'Increases all fighter\'s charisma by 1 each year.', type: 'YEARLY_ALL_FIGHTERS_CHARISMA', amount: 1 },
    { id: 'COMPANY_WEBSITE', name: 'Company website', level: 1, cost: 1000, description: 'Generates 1 promoter reputation each year.', type: 'YEARLY_PROMOTER_REP', amount: 1 },
    { id: 'PORTRAIT', name: 'Portrait', level: 1, cost: 1000, description: 'Increases promoter\'s reputation by 1 each year.', type: 'YEARLY_PROMOTER_REP', amount: 1 },
    { id: 'CAMERA', name: 'Camera', level: 1, cost: 5000, description: 'Increases all fighter\'s charisma by 1 each year.', type: 'YEARLY_ALL_FIGHTERS_CHARISMA', amount: 1 },
    { id: 'LOCAL_SPONSOR', name: 'Local Sponsorship', level: 2, cost: 5000, description: 'Generates £10 a week permanently.', type: 'WEEKLY_CASH', amount: 10 },
    { id: 'TICKET_LIAISON', name: 'Ticket Liaison', level: 2, cost: 10000, description: 'Increases all ticket sales by 50 each fight.', type: 'FIGHT_TICKETS_FLAT', amount: 50 },
    { id: 'NUTRITIONIST', name: 'Nutritionist', level: 3, cost: 10000, description: 'One fighter randomly gains 10HP each month.', type: 'MONTHLY_RANDOM_FIGHTER_HP', amount: 10 },
    { id: 'RUNNING_GEAR', name: 'Running Gear', level: 3, cost: 10000, description: 'Randomly increases one fighter\'s stamina by 100 each year.', type: 'YEARLY_RANDOM_FIGHTER_STAMINA', amount: 100 },
    { id: 'MERCH_BOOTH', name: 'Merch Booth', level: 3, cost: 15000, description: 'Increases merchandise sales by 10% permanently.', type: 'PERMANENT_MERCH_MOD', amount: 1.1 },
    { id: 'BRAND_DEAL', name: 'Brand Deal', level: 3, cost: 25000, description: 'Generates £10,000 at the start of each year.', type: 'YEARLY_CASH', amount: 10000 },
    { id: 'SCOUT', name: 'Scout', level: 4, cost: 25000, description: 'Allows for 1 additional free agency fighter to appear from 1 reputation higher than promotion level.', type: 'SCOUT_BOOST', amount: 1 },
    { id: 'BOXO_MEDIA_MGR', name: 'BoxoGram Media Manager', level: 4, cost: 25000, description: 'Each fighter gains +2 reputation after every fight they win.', type: 'WIN_REP_BOOST', amount: 2 },
    { id: 'LOADED_GLOVES', name: 'Loaded Gloves', level: 4, cost: 50000, description: 'The player\'s dirty style fighters receive a 10% stat boost during fights.', type: 'DIRTY_STYLE_FIGHT_BOOST', amount: 1.1 },
    { id: 'ACCOUNTANT', name: 'Accountant', level: 5, cost: 50000, description: 'Reduces all expenses by 5%.', type: 'EXPENSE_REDUCTION', amount: 0.95 },
    { id: 'PHYSIO', name: 'Physio', level: 5, cost: 50000, description: 'Reduces recovery time by 25%.', type: 'RECOVERY_TIME_REDUCTION', amount: 0.75 },
    { id: 'GYM', name: 'Gym', level: 5, cost: 100000, description: 'Fighters can complete three training drills a week instead of 2.', type: 'TRAINING_DRILLS_COUNT', amount: 3 },
    { id: 'NATIONAL_SPONSOR', name: 'National Sponsorship', level: 5, cost: 150000, description: 'Generate £50,000 at the start of each year.', type: 'YEARLY_CASH', amount: 50000 },
    { id: 'VETERAN_MENTOR', name: 'Veteran Mentor', level: 5, cost: 30000, description: 'Once per year, one fighter gains +5 to his OffenceIQ.', type: 'YEARLY_RANDOM_FIGHTER_IQ', amount: 5 },
    { id: 'PRESS_OFFICE', name: 'Press Office', level: 6, cost: 100000, description: 'Increases ticket sales by 25%.', type: 'PERMANENT_TICKET_MOD', amount: 1.25 },
    { id: 'BRAND_CONSULTANT', name: 'Brand Consultant', level: 6, cost: 200000, description: 'Increases promoter reputation gain by +10 each year.', type: 'YEARLY_PROMOTER_REP', amount: 10 },
    { id: 'EXCL_MERCH', name: 'Exclusive Merchandise', level: 6, cost: 250000, description: 'Doubles the merchandise sales each fight.', type: 'PERMANENT_MERCH_MOD', amount: 2.0 },
    { id: 'UPGRADED_GYM', name: 'Upgraded Gym', level: 6, cost: 200000, description: 'Each training session now awards additional 1 HP or stamina to the fighter.', type: 'TRAINING_BONUS_STATS', amount: 1 },
    { id: 'TAPE_LIBRARY', name: 'Tape Library', level: 7, cost: 2000000, description: 'Generates the company £10,000 each month.', type: 'MONTHLY_CASH', amount: 10000 },
    { id: 'IN_HOUSE_MEDIA', name: 'In-House Media', level: 7, cost: 1000000, description: 'Increases all fighter\'s reputation\'s by 1 each month.', type: 'MONTHLY_ALL_FIGHTERS_REP', amount: 1 },
    { id: 'YOGA_WORKSHOP', name: 'Yoga Workshop', level: 7, cost: 250000, description: 'Increases one fighter\'s health randomly by 20HP each month.', type: 'MONTHLY_RANDOM_FIGHTER_HP', amount: 20 },
    { id: 'LEGENDARY_TRAINER', name: 'Legendary Trainer', level: 7, cost: 500000, description: 'Fighters can complete four training drills a week.', type: 'TRAINING_DRILLS_COUNT', amount: 4 },
    { id: 'STREAMING_SERVICE', name: 'Streaming Service', level: 8, cost: 2500000, description: 'Generates the company £25,000 each month.', type: 'MONTHLY_CASH', amount: 25000 },
    { id: 'PPV_PRICING', name: 'PPV Pricing', level: 8, cost: 2500000, description: 'Doubles the maximum you can receive from TV deals.', type: 'TV_MAX_MOD', amount: 2.0 },
    { id: 'RECOVERY_CHAMBER', name: 'Recovery Chamber', level: 8, cost: 1000000, description: 'Fighters recover 10% stamina between rounds in fights.', type: 'IN_FIGHT_STAMINA_REGEN', amount: 0.10 },
    { id: 'MIRACLE_EGGS', name: 'Miracle Eggs', level: 9, cost: 2500000, description: 'All player\'s fighters can move weight division\'s in 1 month.', type: 'WEIGHT_CHANGE_WEEKS_OVERRIDE', amount: 4 },
    { id: 'GOLDEN_CONTRACT', name: 'Golden Contract', level: 9, cost: 5000000, description: 'All newly signed fighters receive 10 additional skill points to assign.', type: 'NEW_FIGHTER_SKILL_POINTS', amount: 10 },
    { id: 'WORLD_NEGOTIATOR', name: 'World Class Negotiator', level: 10, cost: 5000000, description: 'Reduces fight contract negotiation costs by 10%.', type: 'NEGOTIATION_COST_REDUCTION', amount: 0.90 },
    { id: 'TAX_HAVEN', name: 'Tax Haven Accountant', level: 10, cost: 5000000, description: 'Reduces all stipend and travel costs by 90%.', type: 'STIPEND_TRAVEL_REDUCTION', amount: 0.10 }
];

export const COMMENTARY_PHRASES = {
    GENERAL: [
        "Always exciting to watch action in the {weightDivision}",
        "We're hoping for a brawl here tonight",
        "From the small hall action to world title fights we cover it all",
        "Live action from {promotionName} in the ring tonight",
        "Nothing beats a tear up in the ring",
        "I wonder if tonight's bout will be one to remember",
        "Nothing too crazy happening right now",
        "We're all waiting for a telling punch",
        "Both fighters are jostling for position",
        "Both fighters are keen to make an impression tonight",
        "You can't beat the view from ringside",
        "The fans are getting a little quieter",
        "Each fighter's trainers look relaxed outside the ring",
        "I wonder if we'll see more combinations and power punching",
        "Who wants it more here tonight?",
        "Will {promotionName} be happy with the action so far?",
        "Not sure {promotionSlogan} applies right now"
    ],
    ROUND_START_AFTER_1: [
        "Let's see if the corner work pays off",
        "I heard a lot of shouting from the fighter's corners",
        "Let's see what we get after the break",
        "Recharged and ready to go"
    ],
    MIDPOINT: [
        "Halfway through the round",
        "One minute thirty left to go"
    ],
    DRAW: [
        "The crowd is booing the outcome"
    ]
};

export const INITIAL_CASH = 10000;

export const LOCATIONS = [
    { city: 'London', country: 'UK' },
    { city: 'Las Vegas', country: 'USA' },
    { city: 'Tokyo', country: 'Japan' },
    { city: 'Mexico City', country: 'Mexico' },
    { city: 'Riyadh', country: 'Saudi Arabia' }
];