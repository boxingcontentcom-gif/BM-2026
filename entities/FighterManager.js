import { 
    REPUTATION_STATUS_LABELS, REPUTATION_THRESHOLDS, WEIGHT_DIVISIONS, BOXING_STYLES, 
    PURSE_BANDS, CONTRACT_CLM, NATIONALITIES, CHAMPIONSHIPS, INJURIES, FINANCIAL_DATA, 
    PROMOTION_ACTIVITIES, INJURY_SEVERITY, INJURY_DATA, FIGHTER_PERSONALITIES, PRESS_CONFERENCE_QUESTIONS,
    CREATED_FIGHTER_LIMIT, WORLD_ORGS
} from '../constants.js';
import { promotionManager } from './PromotionManager.js';
import { messageManager } from './MessageManager.js';
import { calendarManager } from './CalendarManager.js';
import { assetManager } from './GymManager.js';

const REP_SKILL_POINTS = {
    1: 120, 2: 240, 3: 300, 4: 350, 5: 400, 6: 450, 7: 500, 8: 550, 9: 600, 10: 700
};

class FighterManager {
    constructor() {
        this.fighters = [];
        this.worldPopulation = [];
        this.marketFighters = [];
        this.isInitialized = false;
        this.databaseSeed = 1;
    }

    initialize() {
        if (this.isInitialized) return;
        assetManager.initialize();
        this.load();
        
        if (localStorage.getItem('manual_brand_deal_credit') !== 'true') {
            promotionManager.addTransaction('PROMOTION', 'BACK-DATED: WORLDWIDE BRAND DEAL', 100000, 'INCOME');
            localStorage.setItem('manual_brand_deal_credit', 'true');
        }

        // Reduced spec: 150 per division for stability. 
        // If we have significantly more or less, regenerate to stabilize.
        const targetTotal = WEIGHT_DIVISIONS.length * 150;
        if (this.worldPopulation.length < targetTotal || this.worldPopulation.length > targetTotal + 500) {
             console.log('Stabilizing world population...');
             this.generateInitialWorld();
        }
        if (this.marketFighters.length === 0) this.refreshMarketList();

        const initStats = (f) => {
            if (!f) return;
            this.updateFighterMetadata(f);
            
            if (!f.worldOrgs) {
                f.worldOrgs = [...WORLD_ORGS].sort(() => 0.5 - Math.random()).slice(0, 2);
            }
            if (!f.rankingHistory) f.rankingHistory = [];
            if (f.titleDefenses === undefined) f.titleDefenses = 0;
            if (f.reignStarted === undefined) f.reignStarted = null;
            if (!f.titlesHeld) f.titlesHeld = [];
            
            if (f.lastInactivityWarning === undefined) f.lastInactivityWarning = 0;
            if (!f.injuries) f.injuries = [];
            
            if (!f.promotionStats) {
                f.promotionStats = { 
                    weeklyPromotionDone: false, pressConferenceDone: false, 
                    campPromotionHistory: [], totalFighterHistory: [], 
                    bonusTickets: 0, bonusVipTickets: 0, matchValueMod: 1.0, currentQuestions: null 
                };
            }
            if (f.monthStartXP === undefined) f.monthStartXP = f.xp || 0;
            if (f.monthStartReputation === undefined) f.monthStartReputation = f.reputation || 1;
            
            if (!f.personality) f.personality = this.assignPersonality(f);
            if (f.trainingStats === undefined) f.trainingStats = { weeklyTrainingDone: false, weeklyTrainingCount: 0, trainingHistory: [] };
            if (f.skillPoints === undefined) f.skillPoints = 0;
            
            if (!f.partialSkills) {
                f.partialSkills = {
                    attack: { power: 0, speed: 0, timing: 0, technique: 0, combinations: 0, offenceIQ: 0 },
                    defence: { guard: 0, dodge: 0, counter: 0, clinch: 0, vision: 0, defenceIQ: 0 },
                    physical: { health: 0, stamina: 0 }
                };
            }
            if (f.lastFightDate === undefined) f.lastFightDate = calendarManager.currentDate.toISOString();
            if (f.lastDecayStage === undefined) f.lastDecayStage = 0;
            if (f.rankingScore === undefined) f.rankingScore = f.xp || 0;
            if (f.formScore === undefined) f.formScore = 0;
            if (f.recentResults === undefined) f.recentResults = [];
        };

        this.fighters.forEach(initStats);
        this.worldPopulation.forEach(initStats);
        this.sortRankings();
        this.save();
        this.isInitialized = true;
    }

    calculateMonthsInactive(fighter) {
        const lastActivity = Math.max(new Date(fighter.lastFightDate || 0), new Date(fighter.contractStartDate || 0));
        const current = new Date(calendarManager.currentDate);
        const diffMs = current - lastActivity;
        return Math.floor(Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))) / 30);
    }

    processInactivityDecay(fighter) {
        const months = this.calculateMonthsInactive(fighter);
        let decayed = false;
        const thresholds = [ {m: 15, s: 4, p: 0.10}, {m: 12, s: 3, p: 0.075}, {m: 9, s: 2, p: 0.05}, {m: 6, s: 1, p: 0.02} ];
        for (const t of thresholds) {
            if (months >= t.m && fighter.lastDecayStage < t.s) {
                fighter.xp -= fighter.xp * t.p;
                fighter.lastDecayStage = t.s;
                decayed = true;
                break;
            }
        }
        if (decayed) {
            fighter.xp = Math.max(0, fighter.xp);
            this.updateFighterMetadata(fighter);
        }
        if (months < 6) fighter.activityScore = 0;
        else if (months < 9) fighter.activityScore = -5;
        else if (months < 12) fighter.activityScore = -10;
        else if (months < 15) fighter.activityScore = -20;
        else fighter.activityScore = -40;
    }

    updateRankingScore(fighter) {
        let fScore = 0;
        (fighter.recentResults || []).slice(0, 5).forEach(res => {
            if (res === 'WIN') fScore += 5;
            else if (res === 'DRAW') fScore += 1;
            else if (res === 'LOSS') fScore -= 3;
            else if (res === 'KO_LOSS') fScore -= 6;
        });
        fighter.formScore = fScore;
        fighter.rankingScore = (fighter.xp || 0) + (fighter.formScore || 0) + (fighter.qualityScore || 0) + (fighter.activityScore || 0);
    }

    processInjuries() {
        const all = this.fighters.concat(this.worldPopulation);
        const recoveryMod = assetManager.getEffectValue('RECOVERY_TIME_REDUCTION', 1.0);
        all.forEach(f => {
            if (!f.injuries) f.injuries = [];
            f.injuries.forEach((inj, index) => {
                const isPlayer = this.fighters.some(sf => sf.id === f.id);
                const decrement = isPlayer ? (1 / recoveryMod) : 1;
                inj.weeksRemaining -= decrement;
                if (inj.weeksRemaining <= 0) {
                    const name = inj.name;
                    const isSevere = inj.severity === INJURY_SEVERITY.SEVERELY_INJURED;
                    f.injuries.splice(index, 1);
                    let note = "";
                    if (isSevere && Math.random() < 0.5) {
                        const stats = ['power', 'speed', 'timing', 'technique', 'guard', 'dodge'];
                        const pick = stats[Math.floor(Math.random() * stats.length)];
                        const dec = 1 + Math.floor(Math.random() * 3);
                        if (f.skills.attack[pick] !== undefined) f.skills.attack[pick] = Math.max(1, f.skills.attack[pick] - dec);
                        else if (f.skills.defence[pick] !== undefined) f.skills.defence[pick] = Math.max(1, f.skills.defence[pick] - dec);
                        note = ` Severity led to permanent -${dec} ${pick.toUpperCase()}.`;
                    }
                    if (isPlayer) messageManager.addMessage('IN_RECOVERY', 'MEDICAL CLEARANCE: ' + f.name.toUpperCase(), `${f.name.toUpperCase()} has recovered from their ${name}.${note}`, { fighterId: f.id }, calendarManager.currentDate.toISOString());
                }
            });
        });
        this.save();
    }

    triggerInjury(fighter, type = 'TRAINING', specificInjuryKey = null) {
        if (!fighter.injuries) fighter.injuries = [];
        if (fighter.injuries.length >= 2) return null;
        let data = (specificInjuryKey && INJURY_DATA[specificInjuryKey]) ? INJURY_DATA[specificInjuryKey] : specificInjuryKey;
        if (!data) {
            const chance = { 'TRAINING': 0.04, 'PROMOTION': 0.02, 'FIGHT': 0.15 }[type] || 0.05;
            if (Math.random() > chance) return null;
            const eligible = Object.keys(INJURY_DATA).filter(k => type === 'TRAINING' ? !!INJURY_DATA[k].triggers.training : (type === 'FIGHT' ? !!INJURY_DATA[k].triggers.inFight : true));
            if (eligible.length === 0) return null;
            specificInjuryKey = eligible[Math.floor(Math.random() * eligible.length)];
            data = INJURY_DATA[specificInjuryKey];
        }
        if (!data) return null;
        const range = data.recoveryRange || [1, 2];
        let weeks = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        if (this.fighters.some(f => f.id === fighter.id)) weeks = Math.max(1, Math.floor(weeks / assetManager.getAllEffects().recoveryBoost));
        const newInj = { name: data.name, key: specificInjuryKey || 'GENERIC', weeksRemaining: weeks, severity: data.severity || INJURY_SEVERITY.INJURED, bodyPart: data.bodyPart || 'Unknown', source: type };
        fighter.injuries.push(newInj);
        if (this.fighters.some(f => f.id === fighter.id)) {
            messageManager.addMessage('INJURY_OCCURRED', 'INJURY ALERT: ' + fighter.name.toUpperCase(), `${fighter.name.toUpperCase()} sustained a ${newInj.name} during ${type.toLowerCase()}. Estimated ${weeks} weeks.`, { fighterId: fighter.id, injury: newInj }, calendarManager.currentDate.toISOString());
            if (newInj.severity !== INJURY_SEVERITY.INJURED) this.checkInjuryCancellations(fighter);
        }
        this.save();
        return newInj;
    }

    assignPersonality(fighter) {
        const c = fighter.charisma || 0;
        const all = this.fighters.concat(this.worldPopulation);
        if (all.filter(f => f.personality === FIGHTER_PERSONALITIES.MENTAL).length < 5 && Math.random() < 0.01) return FIGHTER_PERSONALITIES.MENTAL;
        if (c < 25) return FIGHTER_PERSONALITIES.NORMAL;
        if (c < 50) return Math.random() < 0.7 ? FIGHTER_PERSONALITIES.NORMAL : FIGHTER_PERSONALITIES.PROFESSIONAL;
        return [FIGHTER_PERSONALITIES.NORMAL, FIGHTER_PERSONALITIES.AGGRESSIVE, FIGHTER_PERSONALITIES.SHOWMAN, FIGHTER_PERSONALITIES.PROFESSIONAL][Math.floor(Math.random() * 4)];
    }

    executePromotionActivity(fighter) {
        if (!fighter.promotionStats) fighter.promotionStats = { weeklyPromotionDone: false, campPromotionHistory: [], totalFighterHistory: [], bonusTickets: 0, bonusVipTickets: 0 };
        const eligible = (PROMOTION_ACTIVITIES[fighter.reputation] || []).filter(a => {
            if (a.chance && Math.random() > a.chance) return false;
            if (a.oncePerCamp && fighter.promotionStats.campPromotionHistory.includes(a.text)) return false;
            if (a.oncePerFighter && fighter.promotionStats.totalFighterHistory.includes(a.text)) return false;
            if (a.maxCharisma !== undefined && fighter.charisma > a.maxCharisma) return false;
            if (a.minCharisma !== undefined && fighter.charisma < a.minCharisma) return false;
            return true;
        });
        const act = eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)] : { text: "Your fighter did nothing to promote the fight.", tickets: 0 };
        let resText = act.text.replace('Your fighter', `Your fighter ${fighter.name}`).replace('Your boxer', `Your boxer ${fighter.name}`);
        if (act.places) resText = resText.replace('{place}', act.places[Math.floor(Math.random() * act.places.length)]);
        const fx = [];
        if (act.tickets) {
            const sold = Array.isArray(act.tickets) ? Math.floor(act.tickets[0] + Math.random() * (act.tickets[1] - act.tickets[0] + 1)) : act.tickets;
            fighter.promotionStats.bonusTickets += sold; fx.push(`${sold} tickets`);
        }
        if (act.vipTickets) { fighter.promotionStats.bonusVipTickets += act.vipTickets; fx.push(`${act.vipTickets} VIP`); }
        if (act.xp) {
            let gain = Array.isArray(act.xp) ? Math.floor(act.xp[0] + Math.random() * (act.xp[1] - act.xp[0] + 1)) : act.xp;
            gain = Math.floor(gain * assetManager.getAllEffects().xpBoost);
            fighter.xp = Math.max(0, Math.min(1000, (fighter.xp || 0) + gain));
            this.updateFighterMetadata(fighter); fx.push(`${gain}XP`);
        }
        if (act.revenue) { promotionManager.addTransaction('PROMOTION', `SPONSOR: ${fighter.name.toUpperCase()}`, act.revenue, 'INCOME'); fx.push(`£${act.revenue.toLocaleString()}`); }
        if (act.charisma) { fighter.charisma = Math.min(100, fighter.charisma + act.charisma); fx.push(`+${act.charisma} Charisma`); }
        if (act.injury) { this.triggerInjury(fighter, 'PROMOTION', act.injury.key || null); fx.push(`Injury: ${act.injury.name}`); }
        fighter.promotionStats.campPromotionHistory.push(act.text);
        fighter.promotionStats.totalFighterHistory.push(act.text);
        fighter.promotionStats.weeklyPromotionDone = true;
        const msg = resText + (fx.length > 0 ? ` (${fx.join(', ')})` : "");
        messageManager.addMessage('PROMOTION_RESULT', 'PROMOTION: ' + fighter.name.split(' ').pop().toUpperCase(), msg, { fighterId: fighter.id }, calendarManager.currentDate.toISOString());
        this.save();
        return msg;
    }

    sortRankings() {
        const all = this.worldPopulation.concat(this.fighters);
        all.forEach(f => { 
            this.processInactivityDecay(f); 
            this.updateRankingScore(f); 
            if (!f.rankingHistory) f.rankingHistory = [];
        });

        const divisions = [...new Set(all.map(f => f.weightDivision))];
        divisions.forEach(div => {
            const divFighters = all.filter(f => f.weightDivision === div);
            
            // Global Unified Ranking (1-500)
            divFighters.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
            divFighters.forEach((f, idx) => {
                if (!f.rankings) f.rankings = {};
                const oldRank = f.rankings.unified;
                f.rankings.unified = idx + 1;
                
                // Track ranking change for reports
                if (oldRank !== undefined && oldRank !== f.rankings.unified) {
                    f.rankingHistory.push({ date: calendarManager.currentDate.toISOString(), rank: f.rankings.unified });
                }
            });

            // Organizational Rankings (Global, Supreme, Super, Mega)
            WORLD_ORGS.forEach(org => {
                const orgFighters = divFighters.filter(f => f.worldOrgs && f.worldOrgs.includes(org));
                orgFighters.sort((a, b) => {
                    const aIsChamp = (a.titlesHeld || []).includes(org);
                    const bIsChamp = (b.titlesHeld || []).includes(org);
                    if (aIsChamp && !bIsChamp) return -1;
                    if (bIsChamp && !aIsChamp) return 1;
                    return (b.rankingScore || 0) - (a.rankingScore || 0);
                });
                orgFighters.forEach((f, idx) => {
                    f.rankings[org] = idx + 1;
                });
                // Remove org rank for those not in it
                divFighters.forEach(f => {
                    if (!f.worldOrgs || !f.worldOrgs.includes(org)) delete f.rankings[org];
                });
            });

            // Title Stripping / Vacancy Logic
            Object.keys(CHAMPIONSHIPS).forEach(titleKey => {
                const rule = CHAMPIONSHIPS[titleKey];
                const champ = divFighters.find(f => (f.titlesHeld || []).includes(titleKey));
                
                if (champ) {
                    let shouldStrip = false;
                    const unifiedRank = champ.rankings.unified;
                    const orgRank = rule.org ? champ.rankings[rule.org] : null;

                    // Rank Bracket check
                    if (rule.minRank && rule.maxRank) {
                        if (unifiedRank < rule.minRank || unifiedRank > rule.maxRank) shouldStrip = true;
                    }

                    // Injury check (Badly/Severely Injured must vacate)
                    if (champ.injuries && champ.injuries.some(inj => inj.severity !== INJURY_SEVERITY.INJURED)) {
                        shouldStrip = true;
                    }

                    if (shouldStrip) {
                        champ.titlesHeld = champ.titlesHeld.filter(t => t !== titleKey);
                        champ.titleDefenses = 0;
                        champ.reignStarted = null;
                        
                        if (this.fighters.some(sf => sf.id === champ.id)) {
                            messageManager.addMessage('TITLE_VACATED', `TITLE STRIPPED: ${rule.name}`, 
                                `${champ.name.toUpperCase()} has been stripped of the ${rule.name} due to ${champ.injuries.length > 0 ? 'injury' : 'ranking movement'}.`, 
                                { fighterId: champ.id, titleKey }, calendarManager.currentDate.toISOString());
                        }
                    }
                }

                // Auto-fill Vacancies for non-player fighters (simple logic: top ranked gets it)
                if (!divFighters.some(f => (f.titlesHeld || []).includes(titleKey))) {
                    const candidates = divFighters.filter(f => {
                        const rank = rule.org ? f.rankings[rule.org] : f.rankings.unified;
                        if (!rank) return false;
                        if (rule.minRank && (rank < rule.minRank || rank > rule.maxRank)) return false;
                        if (rule.nationality && !rule.nationality.includes(f.nationality)) return false;
                        if (rule.excludeNationality && rule.excludeNationality.includes(f.nationality)) return false;
                        if (f.injuries && f.injuries.length > 0) return false;
                        return true;
                    });

                    if (candidates.length >= 2) {
                        // For AI world titles, just assign to top 1. For player, we might want an event.
                        // Here we just auto-assign to keep world moving.
                        const newChamp = candidates[0];
                        if (!this.fighters.some(sf => sf.id === newChamp.id)) {
                             newChamp.titlesHeld.push(titleKey);
                             newChamp.titleDefenses = 0;
                             newChamp.reignStarted = calendarManager.currentDate.toISOString();
                        }
                    }
                }
            });
        });
    }

    getTotalCareerRecord(fighter) {
        let wins = fighter.record.wins || 0;
        let losses = fighter.record.losses || 0;
        let draws = fighter.record.draws || 0;
        
        // Also include history if present
        if (fighter.record.history) {
            // History might already be reflected in the main record object in this engine
        }
        return `${wins}-${losses}-${draws}`;
    }

    generateMonthlyReports() {
        this.fighters.forEach(f => {
            const oldRep = f.monthStartReputation || f.reputation;
            const oldXP = f.monthStartXP || f.xp;
            
            // Check for ranking change
            const currentRank = f.rankings.unified;
            const history = f.rankingHistory || [];
            const lastMonth = history.filter(h => {
                const d = new Date(h.date);
                const now = new Date(calendarManager.currentDate);
                return d.getMonth() === (now.getMonth() - 1 + 12) % 12;
            });
            const oldRank = lastMonth.length > 0 ? lastMonth[0].rank : currentRank;

            if (oldRank !== currentRank) {
                let msg = `${f.name.toUpperCase()} ranking update:\nUnified: ${oldRank} -> ${currentRank}\n`;
                WORLD_ORGS.forEach(org => {
                    if (f.rankings[org]) {
                        msg += `${org}: ${f.rankings[org]}\n`;
                    }
                });
                messageManager.addMessage('RANKING_UPDATE', 'MONTHLY RANKING REPORT', msg, { fighterId: f.id }, calendarManager.currentDate.toISOString());
            }

            f.monthStartReputation = f.reputation;
            f.monthStartXP = f.xp;
        });
    }

    generateOpponentList(fighter, promoterRep, titleKey = null) {
        const stableIds = this.fighters.map(f => f.id);
        const orgRule = titleKey ? CHAMPIONSHIPS[titleKey] : null;
        let candidates = this.worldPopulation.filter(f => f.weightDivision === fighter.weightDivision && f.id !== fighter.id && !stableIds.includes(f.id));
        if (orgRule && orgRule.org) {
            candidates = candidates.filter(f => f.worldOrgs.includes(orgRule.org) && f.rankings[orgRule.org] <= 10);
        } else if (orgRule) {
            candidates = candidates.filter(f => f.rankings.unified >= orgRule.minRank && f.rankings.unified <= orgRule.maxRank);
        } else {
            candidates = candidates.filter(f => Math.abs(f.reputation - fighter.reputation) <= 2);
        }
        return candidates.sort((a, b) => this.getFighterSkillSum(a) - this.getFighterSkillSum(b)).slice(0, 15);
    }

    updateFighterMetadata(fighter) {
        let level = 1;
        for (const t of REPUTATION_THRESHOLDS) { if (fighter.xp >= t.minXP) level = t.level; else break; }
        fighter.reputation = level; fighter.reputationStatus = REPUTATION_STATUS_LABELS[level];
    }

    getFighter(id) { return this.fighters.find(f => f.id === id) || this.worldPopulation.find(f => f.id === id); }
    calculateAge(dob) { return Math.abs(new Date(calendarManager.currentDate.getTime() - new Date(dob).getTime()).getUTCFullYear() - 1970); }
    getRecordString(record) { return `${record.wins}-${record.losses}-${record.draws}`; }

    save() {
        localStorage.setItem('boxing_fighters_data', JSON.stringify(this.fighters));
        localStorage.setItem('boxing_world_population', JSON.stringify(this.worldPopulation));
        localStorage.setItem('boxing_market_fighters', JSON.stringify(this.marketFighters));
        localStorage.setItem('boxing_database_seed', this.databaseSeed);
    }

    load() {
        const stable = localStorage.getItem('boxing_fighters_data'); if (stable) this.fighters = JSON.parse(stable);
        const world = localStorage.getItem('boxing_world_population'); if (world) this.worldPopulation = JSON.parse(world);
        const market = localStorage.getItem('boxing_market_fighters'); if (market) this.marketFighters = JSON.parse(market);
        const seed = localStorage.getItem('boxing_database_seed'); if (seed) this.databaseSeed = parseInt(seed);
    }

    generateInitialWorld() {
        this.worldPopulation = []; // Clear existing population
        const fightersPerDivision = 150; // Reduced for performance and localStorage limits
        
        WEIGHT_DIVISIONS.forEach(div => {
            for (let i = 0; i < fightersPerDivision; i++) {
                // High rank (top 10), Medium (11-50), low (rest)
                let initialRep = 1;
                if (i < 10) initialRep = 9 + Math.floor(Math.random() * 2);
                else if (i < 30) initialRep = 7 + Math.floor(Math.random() * 3);
                else if (i < 70) initialRep = 4 + Math.floor(Math.random() * 4);
                else initialRep = 1 + Math.floor(Math.random() * 4);
                
                const opponent = this.generateOpponent(initialRep, div.name);
                this.worldPopulation.push(opponent);
            }
        });
        
        // Add local prospects
        for (let i = 0; i < 30; i++) {
            const randomDiv = WEIGHT_DIVISIONS[Math.floor(Math.random() * WEIGHT_DIVISIONS.length)].name;
            this.worldPopulation.push(this.generateOpponent(1, randomDiv, true));
        }
        
        this.sortRankings();
        this.save();
    }

    calculateInitialReputation(i) {
        if (i < 20) return 9 + Math.floor(Math.random() * 2);
        if (i < 50) return 7 + Math.floor(Math.random() * 3);
        if (i < 100) return 4 + Math.floor(Math.random() * 4);
        return 1 + Math.floor(Math.random() * 4);
    }

    generateOpponent(rep, div, youth = false) {
        const id = 'f_' + Math.random().toString(36).substr(2, 9);
        const nat = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
        const style = BOXING_STYLES[Math.floor(Math.random() * BOXING_STYLES.length)];
        const fn = { 'UK': ['Jack', 'Liam', 'Harry'], 'USA': ['Michael', 'Brandon', 'Marcus'], 'MEX': ['Ricardo', 'Manuel', 'Alejandro'], 'JPN': ['Kenji', 'Hiroshi', 'Takashi'], 'GER': ['Hans', 'Klaus', 'Dieter'] };
        const ln = { 'UK': ['Robinson', 'Wright', 'Thompson'], 'USA': ['Washington', 'Jefferson', 'Miller'], 'MEX': ['Rodriguez', 'Hernandez', 'Lopez'], 'JPN': ['Sato', 'Suzuki', 'Takahashi'], 'GER': ['Schmidt', 'Weber', 'Meyer'] };
        const first = fn[nat.code][Math.floor(Math.random() * fn[nat.code].length)];
        const last = ln[nat.code][Math.floor(Math.random() * ln[nat.code].length)];
        const age = youth ? 17 : 18 + Math.floor(Math.random() * 6) + (rep > 5 ? Math.floor(rep / 2) : 0);
        const wins = Math.max(0, (rep * 3) + Math.floor(Math.random() * 5));
        const losses = Math.floor(Math.random() * (rep < 5 ? 10 : 3));
        const fighter = {
            id, name: `${first} ${last}`, nationality: nat.code, dob: `${new Date(calendarManager.currentDate).getFullYear() - age}-01-01`,
            weightDivision: div, style, skills: { attack: {}, defence: {}, physical: {} }, xp: (rep - 1) * 100 + 50,
            reputation: rep, reputationStatus: REPUTATION_STATUS_LABELS[rep], record: { wins, losses, draws: 0, koWins: Math.floor(wins * 0.7), koLosses: Math.floor(losses * 0.3) },
            availability: 'FREE', rankings: { unified: 0 }, worldOrgs: [...WORLD_ORGS].sort(() => 0.5 - Math.random()).slice(0, 2),
            titlesHeld: [], titleVictories: { GLOBAL: 0, SUPREME: 0, SUPER: 0, MEGA: 0, INTERCONTINENTAL: 0, CONTINENTAL: 0, BRITISH: 0, USA: 0, ROW: 0, REGIONAL_UK: 0 }
        };
        this.assignStatsToFighter(fighter); fighter.personality = this.assignPersonality(fighter); return fighter;
    }

    assignStatsToFighter(f) {
        const rep = f.reputation || 1;
        const total = Math.floor((REP_SKILL_POINTS[rep] || (120 + (rep - 1) * 60)) * (0.75 + Math.random() * 0.5)) + 10 + Math.floor(Math.random() * 21);
        const keys = [ {g:'attack', k:'power'}, {g:'attack', k:'speed'}, {g:'attack', k:'timing'}, {g:'attack', k:'technique'}, {g:'attack', k:'combinations'}, {g:'attack', k:'offenceIQ'}, {g:'defence', k:'guard'}, {g:'defence', k:'dodge'}, {g:'defence', k:'counter'}, {g:'defence', k:'clinch'}, {g:'defence', k:'vision'}, {g:'defence', k:'defenceIQ'} ];
        keys.forEach(s => f.skills[s.g][s.k] = 0);
        for (let i = 0; i < total; i++) { const p = keys[Math.floor(Math.random() * keys.length)]; f.skills[p.g][p.k]++; }
        keys.forEach(s => f.skills[s.g][s.k] = Math.min(99, Math.max(1, f.skills[s.g][s.k])));
        const phys = 200 + (rep * 70) + Math.floor(Math.random() * 201) - 100;
        f.skills.physical.health = Math.min(999, Math.max(100, phys));
        f.skills.physical.stamina = Math.min(999, Math.max(100, phys));
        f.charisma = Math.min(100, Math.max(1, Math.floor((rep * 10) * (0.8 + Math.random() * 0.4))));
    }

    handleFightOutcome(fId, opp, outcome, round, time, isTitle, titleKey, data) {
        const f = this.getFighter(fId); if (!f) return;
        const isPlayer = this.fighters.some(sf => sf.id === f.id);
        let xpChange = (outcome === 'WIN') ? 10 : (outcome === 'DRAW' ? 3 : -5);
        if (outcome === 'WIN') {
            f.record.wins++; f.titleDefenses = (f.titlesHeld.includes(titleKey)) ? f.titleDefenses + 1 : 0;
            if (isPlayer) f.skillPoints += 5;
            if (isTitle && titleKey) {
                if (!f.titlesHeld.includes(titleKey)) { f.titlesHeld.push(titleKey); f.reignStarted = calendarManager.currentDate.toISOString(); }
            }
        } else { f.record.losses++; f.titlesHeld = f.titlesHeld.filter(t => t !== titleKey); }
        f.xp = Math.max(0, Math.min(1000, (f.xp || 0) + xpChange));
        this.updateFighterMetadata(f); this.sortRankings(); this.save();
        return `Fight completed. Outcome: ${outcome}`;
    }

    getFighterSkillSum(f) { return Object.values(f.skills.attack).reduce((a,b)=>a+b,0) + Object.values(f.skills.defence).reduce((a,b)=>a+b,0); }
    refreshMarketList() { this.marketFighters = this.worldPopulation.filter(f => f.availability === 'FREE').sort(() => 0.5 - Math.random()).slice(0, 20).map(f => f.id); this.save(); }
    executeTrainingSession(fighter, regime) {
        if (!fighter.trainingStats) {
            fighter.trainingStats = { weeklyTrainingDone: false, weeklyTrainingCount: 0, trainingHistory: [] };
        }
        
        const maxDrills = assetManager.getEffectValue('TRAINING_DRILLS_COUNT', 2);
        if (fighter.trainingStats.weeklyTrainingCount >= maxDrills) {
            return "Training limit reached for this week.";
        }

        // Apply skill gain
        const gain = 0.5 + (Math.random() * 0.5);
        if (!fighter.partialSkills) {
            fighter.partialSkills = {
                attack: { power: 0, speed: 0, timing: 0, technique: 0, combinations: 0, offenceIQ: 0 },
                defence: { guard: 0, dodge: 0, counter: 0, clinch: 0, vision: 0, defenceIQ: 0 },
                physical: { health: 0, stamina: 0 }
            };
        }

        const group = regime.group;
        const skill = regime.skill;

        fighter.partialSkills[group][skill] += gain;
        
        if (fighter.partialSkills[group][skill] >= 1) {
            const levels = Math.floor(fighter.partialSkills[group][skill]);
            fighter.skills[group][skill] = Math.min(99, (fighter.skills[group][skill] || 10) + levels);
            fighter.partialSkills[group][skill] -= levels;
        }

        fighter.trainingStats.weeklyTrainingCount++;
        if (fighter.trainingStats.weeklyTrainingCount >= maxDrills) {
            fighter.trainingStats.weeklyTrainingDone = true;
        }

        this.save();
        return `Trained ${regime.name}. ${skill.toUpperCase()} improved!`;
    }

    simulateQuickFight(f1, f2) {
        // Simple win/loss logic for AI background fights
        const s1 = this.getFighterSkillSum(f1);
        const s2 = this.getFighterSkillSum(f2);
        const total = s1 + s2;
        const winProb = s1 / total;
        
        const f1Wins = Math.random() < winProb;
        const winner = f1Wins ? f1 : f2;
        const loser = f1Wins ? f2 : f1;

        winner.record.wins++;
        loser.record.losses++;
        
        winner.xp += 10;
        loser.xp += 2;
        
        this.updateFighterMetadata(winner);
        this.updateFighterMetadata(loser);
        
        winner.lastFightDate = calendarManager.currentDate.toISOString();
        loser.lastFightDate = calendarManager.currentDate.toISOString();
    }

    processWeeklyDevelopment() {
        const all = this.fighters.concat(this.worldPopulation);
        all.forEach(f => {
            // Reset weekly caps
            if (f.trainingStats) {
                f.trainingStats.weeklyTrainingDone = false;
                f.trainingStats.weeklyTrainingCount = 0;
            }
            if (f.promotionStats) {
                f.promotionStats.weeklyPromotionDone = false;
                f.promotionStats.pressConferenceDone = false;
            }

            // Natural progression/regression for AI
            if (!this.fighters.some(pf => pf.id === f.id)) {
                if (Math.random() < 0.1) {
                    const group = Math.random() < 0.5 ? 'attack' : 'defence';
                    const keys = Object.keys(f.skills[group]);
                    const key = keys[Math.floor(Math.random() * keys.length)];
                    f.skills[group][key] = Math.min(99, f.skills[group][key] + (Math.random() * 0.2));
                }
            }
        });
        
        this.processInjuries();
        this.sortRankings();
        this.save();
    }

    processInactivityWarnings() {
        const all = this.fighters.concat(this.worldPopulation);
        all.forEach(f => {
            const months = this.calculateMonthsInactive(f);
            if (months >= 6 && f.lastInactivityWarning < 6) {
                f.lastInactivityWarning = 6;
                // Add message for player fighters
            }
        });
    }

    scrubRealWorldNames() { /* Implementation not needed for gameplay stability */ }
    checkInjuryCancellations(f) { /* Basic implementation done in sortRankings title stripping */ }
    releaseFighter(id) { this.fighters = this.fighters.filter(f => f.id !== id); this.save(); }
}

export const fighterManager = new FighterManager();
