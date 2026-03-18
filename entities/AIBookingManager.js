import { calendarManager } from './CalendarManager.js';
import { fighterManager } from './FighterManager.js';

class AIBookingManager {
    constructor() {}

    /**
     * Processes all AI fighters to see if they need to book a fight.
     * This should be called weekly.
     */
    process() {
        const allWorldFighters = fighterManager.worldPopulation;
        
        // Only process fighters who are not already booked
        const unbookedFighters = allWorldFighters.filter(f => !this.isBooked(f));

        unbookedFighters.forEach(fighter => {
            if (this.shouldAttemptBooking(fighter)) {
                this.attemptBooking(fighter);
            }
        });
    }

    isBooked(fighter) {
        return calendarManager.scheduledEvents.some(e => e.fighterId === fighter.id && e.type === 'FIGHT');
    }

    shouldAttemptBooking(fighter) {
        if (fighter.injuries && fighter.injuries.length > 0) return false;
        
        const monthsInactive = fighterManager.calculateMonthsInactive(fighter);
        const weeksSinceLastFight = monthsInactive * 4.33; // Approximation

        // Inactivity override (12-month rule)
        if (monthsInactive >= 12) return true;

        // Frequency checks based on tier
        const tier = fighter.reputation;
        let requiredWeeks = 20; // Default T9-10
        if (tier <= 3) requiredWeeks = 8;
        else if (tier <= 6) requiredWeeks = 12;
        else if (tier <= 8) requiredWeeks = 16;

        return weeksSinceLastFight >= requiredWeeks;
    }

    attemptBooking(fighter) {
        // Step 1: Build candidate pool
        const pool = this.getCandidatePool(fighter);
        if (pool.length === 0) return;

        // Step 3: Score remaining opponents
        const candidates = pool.map(opponent => ({
            fighter: opponent,
            matchValue: this.calculateMatchValue(fighter, opponent)
        }));

        // Step 4: Select opponent
        candidates.sort((a, b) => b.matchValue - a.matchValue);
        const bestCandidate = candidates[0];

        // Step 5: Book the fight
        this.bookFight(fighter, bestCandidate.fighter);
    }

    getCandidatePool(fighter) {
        const monthsInactive = fighterManager.calculateMonthsInactive(fighter);
        let tierExpansion = 1;
        if (monthsInactive >= 15) tierExpansion = 2;
        else if (monthsInactive >= 12) tierExpansion = 1; // Explicitly ±1 at 12-15

        const pool = fighterManager.worldPopulation.filter(opp => {
            // Basic suitability
            if (opp.id === fighter.id) return false;
            if (opp.weightDivision !== fighter.weightDivision) return false;
            if (opp.injuries && opp.injuries.length > 0) return false;
            if (this.isBooked(opp)) return false;

            // Tier expansion (max ±2)
            const tierDiff = Math.abs(opp.reputation - fighter.reputation);
            if (tierDiff > tierExpansion) return false;
            if (tierDiff > 2) return false; // Hard cap

            // Step 2: Remove unsuitable opponents
            // RankingScore gap > 150 (unless inactive 15+ months)
            const scoreGap = Math.abs((opp.rankingScore || 0) - (fighter.rankingScore || 0));
            if (scoreGap > 150 && monthsInactive < 15) return false;

            // KO loss within 8 weeks
            if (opp.recentResults && opp.recentResults[0] === 'KO_LOSS') {
                const lastFightDate = new Date(opp.lastFightDate);
                const weeksAgo = (calendarManager.currentDate - lastFightDate) / (1000 * 60 * 60 * 24 * 7);
                if (weeksAgo < 8) return false;
            }

            // Already 3 fights this year
            const year = calendarManager.currentDate.getFullYear();
            const fightsThisYear = (opp.fightHistory || []).filter(h => new Date(h.date).getFullYear() === year).length;
            if (fightsThisYear >= 3) return false;

            // Rematch avoidance rule (99%)
            const foughtBefore = (fighter.fightHistory || []).some(h => h.opponentName === opp.name);
            if (foughtBefore && Math.random() < 0.99) return false;

            return true;
        });

        return pool;
    }

    calculateMatchValue(fighter, opponent) {
        // MatchValue = RewardScore − RiskScore + FormBonus + InactivityPressure

        // RewardScore: Opponent tier multiplier, Potential ReputationStatus gain, Potential ranking jump
        const rewardScore = (opponent.reputation * 10) + (opponent.rankings.world < fighter.rankings.world ? 20 : 0);

        // RiskScore: Estimated chance of losing × opponent multiplier, KO loss penalty, Tier difference penalty
        const winProb = this.calculateWinProbability(fighter, opponent);
        const lossProb = 1 - winProb;
        const riskScore = (lossProb * opponent.reputation * 5) + (Math.abs(opponent.reputation - fighter.reputation) * 5);

        // FormBonus: +5 if on win streak, –5 if on losing streak, –10 if coming off KO loss
        let formBonus = 0;
        const lastResults = fighter.recentResults || [];
        if (lastResults[0] === 'WIN' && lastResults[1] === 'WIN') formBonus += 5;
        if (lastResults[0] === 'LOSS' || lastResults[0] === 'KO_LOSS') {
            if (lastResults[1] === 'LOSS' || lastResults[1] === 'KO_LOSS') formBonus -= 5;
        }
        if (lastResults[0] === 'KO_LOSS') formBonus -= 10;

        // InactivityPressure: 0 before 12 months, +5 at 12–15 months, +10 at 15–18 months, +20 at 18+ months
        let inactivityPressure = 0;
        const months = fighterManager.calculateMonthsInactive(fighter);
        if (months >= 12 && months < 15) inactivityPressure = 5;
        else if (months >= 15 && months < 18) inactivityPressure = 10;
        else if (months >= 18) inactivityPressure = 20;

        return rewardScore - riskScore + formBonus + inactivityPressure;
    }

    calculateWinProbability(f1, f2) {
        const getPower = (f) => {
            const attack = (f.skills.attack.power + f.skills.attack.speed + f.skills.attack.technique) / 3;
            const defence = (f.skills.defence.guard + f.skills.defence.dodge + f.skills.defence.vision) / 3;
            return (attack + defence) / 2 + (f.reputation * 10);
        };
        const p1 = getPower(f1);
        const p2 = getPower(f2);
        return p1 / (p1 + p2);
    }

    bookFight(f1, f2) {
        // Date based on tier (T1-3: +4 weeks, T4-6: +8 weeks, T7-10: +12 weeks)
        let weeksAhead = 4;
        const tier = Math.max(f1.reputation, f2.reputation);
        if (tier >= 7) weeksAhead = 12;
        else if (tier >= 4) weeksAhead = 8;

        const fightDate = new Date(calendarManager.currentDate);
        fightDate.setDate(fightDate.getDate() + (weeksAhead * 7));

        // Check for title fight (simple logic: if one is a champ, it's a title fight)
        let titleKey = null;
        if (f1.titlesHeld && f1.titlesHeld.length > 0) titleKey = f1.titlesHeld[0];
        else if (f2.titlesHeld && f2.titlesHeld.length > 0) titleKey = f2.titlesHeld[0];

        const isTitleFight = !!titleKey;

        // Use a silent schedule if possible, or just call scheduleFight
        // For AI, we don't want the player messages, but we want the schedule updated.
        calendarManager.scheduleAISilentFight(fightDate, f1, isTitleFight, f2, titleKey);
    }
}

export const aiBookingManager = new AIBookingManager();