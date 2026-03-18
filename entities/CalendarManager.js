import { REPUTATION_RULES, TITLE_FIGHT_RULES, CHAMPIONSHIPS, INJURY_SEVERITY, PRESS_CONFERENCE_QUESTIONS } from '../constants.js';
import { messageManager } from './MessageManager.js';
import { fighterManager } from './FighterManager.js';
import { aiBookingManager } from './AIBookingManager.js';
import { promotionManager } from './PromotionManager.js';
import { assetManager } from './GymManager.js';

class CalendarManager {
    constructor() {
        this.currentDate = new Date('2026-01-01');
        this.scheduledEvents = []; // { type: 'FIGHT' | 'CAMP', start: Date, end: Date, fighterId: string, titleFight: boolean, titleKey: string }
    }

    save() {
        localStorage.setItem('boxing_calendar_data', JSON.stringify({
            currentDate: this.currentDate.toISOString(),
            scheduledEvents: this.scheduledEvents
        }));
    }

    load() {
        const saved = localStorage.getItem('boxing_calendar_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentDate = new Date(data.currentDate);
            this.scheduledEvents = data.scheduledEvents.map(event => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end)
            }));
        }
    }

    getCampLength(fighterReputation, isTitleFight) {
        if (isTitleFight) return TITLE_FIGHT_RULES.campWeeks;
        return REPUTATION_RULES[fighterReputation]?.campWeeks || 2;
    }

    getRoundCount(fighterReputation, isTitleFight, titleKey = null) {
        if (isTitleFight && titleKey) return CHAMPIONSHIPS[titleKey]?.rounds || 12;
        if (isTitleFight) return TITLE_FIGHT_RULES.rounds;
        return REPUTATION_RULES[fighterReputation]?.rounds || 4;
    }

    isDateBlocked(date, fighterId) {
        if (!fighterId) return false;
        return this.scheduledEvents.some(event => {
            return event.fighterId === fighterId && (date >= event.start && date <= event.end);
        });
    }

    canScheduleFight(fightDate, fighter, isTitleFight, opponent = null, titleKey = null) {
        if (!fighter) return { canSchedule: true };
        
        const fighterId = fighter.id;
        const fighterReputation = fighter.reputation;

        // 0. Check Injury (Badly/Severely Injured cannot start new fights)
        if (fighter.injuries && fighter.injuries.some(inj => inj.severity !== INJURY_SEVERITY.INJURED)) {
            const badInj = fighter.injuries.find(inj => inj.severity !== INJURY_SEVERITY.INJURED);
            return { 
                canSchedule: false, 
                reason: 'INJURED', 
                message: `${fighter.name.toUpperCase()} is currently ${badInj.severity.replace('_', ' ')} and cannot compete.`
            };
        }

        // 1. Check Recovery Period
        if (fighter.recoveryUntil) {
            const recoveryDate = new Date(fighter.recoveryUntil);
            if (recoveryDate > this.currentDate) {
                const diffTime = recoveryDate - this.currentDate;
                const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
                return { 
                    canSchedule: false, 
                    reason: 'RECOVERY', 
                    availableDate: recoveryDate, 
                    weeksRemaining: diffWeeks,
                    message: `${fighter.name.toUpperCase()} is currently in a recovery period and will be available in ${diffWeeks} week${diffWeeks > 1 ? 's' : ''}.`
                };
            }
        }

        // 2. Check for existing schedule conflicts
        const campWeeks = this.getCampLength(fighterReputation, isTitleFight);
        const campStart = new Date(fightDate);
        campStart.setDate(campStart.getDate() - (campWeeks * 7));

        for (let d = new Date(campStart); d <= fightDate; d.setDate(d.getDate() + 1)) {
            const blockingEvent = this.scheduledEvents.find(event => {
                // Ignore events that are completely in the past relative to the current game date
                if (event.end < this.currentDate) return false;
                
                return event.fighterId === fighterId && (new Date(d) >= event.start && new Date(d) <= event.end);
            });

            if (blockingEvent) {
                const bookedDate = blockingEvent.type === 'FIGHT' ? blockingEvent.start : blockingEvent.end;
                return { 
                    canSchedule: false, 
                    reason: 'BOOKED', 
                    bookedDate: bookedDate,
                    message: `CONFIRMED: ${fighter.name.toUpperCase()} is already due to fight on ${bookedDate.toLocaleDateString()}.`
                };
            }
        }

        // 3. Title Restrictions
        if (isTitleFight && titleKey && opponent) {
            const title = CHAMPIONSHIPS[titleKey];
            if (!title) return { canSchedule: false, message: 'Invalid championship selected.' };

            if (CHAMPIONSHIPS[titleKey].org) {
                const org = CHAMPIONSHIPS[titleKey].org;
                const isChampInvolved = (fighter.titlesHeld && fighter.titlesHeld.includes(titleKey)) || (opponent.titlesHeld && opponent.titlesHeld.includes(titleKey));
                if (!isChampInvolved) return { canSchedule: false, message: `${title.name} must involve the reigning champion or be a vacancy fight.` };
                const fRank = fighter.rankings[org] || 0;
                const oRank = opponent.rankings[org] || 0;
                if ((fRank > 15 || fRank === 0) && (oRank > 15 || oRank === 0)) {
                    return { canSchedule: false, message: `${title.org} Title contenders must be ranked in the top 15.` };
                }
            }
            if (title.nationality && (!title.nationality.includes(fighter.nationality) || !title.nationality.includes(opponent.nationality))) {
                return { canSchedule: false, message: `${title.name} is restricted to fighters from ${title.nationality.join('/')}.` };
            }
            if (title.minRank && title.maxRank) {
                const fRank = fighter.rankings.unified;
                const oRank = opponent.rankings.unified;
                if ((fRank < title.minRank || fRank > title.maxRank) && (oRank < title.minRank || oRank > title.maxRank)) {
                    return { canSchedule: false, message: `Fighters must be ranked between ${title.minRank} and ${title.maxRank} for this title.` };
                }
            }
        }

        return { canSchedule: true };
    }

    scheduleFight(fightDate, fighter, isTitleFight, opponent, titleKey = null, agreedPurse = null) {
        const check = this.canScheduleFight(fightDate, fighter, isTitleFight, opponent, titleKey);
        if (!check.canSchedule) {
            return { success: false, message: check.message };
        }

        const campWeeks = this.getCampLength(fighter.reputation, isTitleFight);
        const campStart = new Date(fightDate);
        campStart.setDate(campStart.getDate() - (campWeeks * 7));

        const campEvent = {
            type: 'CAMP',
            start: new Date(campStart),
            end: new Date(fightDate),
            fighterId: fighter.id,
            titleFight: isTitleFight,
            titleKey: titleKey,
            opponent: opponent,
            purse: agreedPurse
        };

        const fightEvent = {
            type: 'FIGHT',
            start: new Date(fightDate),
            end: new Date(fightDate),
            fighterId: fighter.id,
            titleFight: isTitleFight,
            titleKey: titleKey,
            opponent: opponent,
            purse: agreedPurse
        };

        const pressDate = new Date(fightDate);
        pressDate.setDate(pressDate.getDate() - 2);
        const pressEvent = {
            type: 'PRESS',
            start: new Date(pressDate),
            end: new Date(pressDate),
            fighterId: fighter.id,
            opponent: opponent,
            title: 'PRESS CONFERENCE'
        };

        this.scheduledEvents.push(campEvent, fightEvent, pressEvent);
        this.save();

        messageManager.addMessage(
            'FIGHT_AGREED',
            'FIGHT AGREED!',
            `${fighter.name.toUpperCase()} is scheduled to fight ${opponent.name.toUpperCase()} on ${fightDate.toLocaleDateString()}. ${isTitleFight ? titleKey + ' TITLE ON THE LINE.' : ''}`,
            { fighterId: fighter.id, date: fightDate.toISOString() },
            this.currentDate.toISOString()
        );

        return { success: true };
    }

    scheduleAISilentFight(fightDate, f1, isTitleFight, f2, titleKey = null) {
        // AI scheduling: Schedule for both fighters, but no messages
        const fighters = [f1, f2];
        const opponents = [f2, f1];

        fighters.forEach((fighter, idx) => {
            const opponent = opponents[idx];
            const campWeeks = this.getCampLength(fighter.reputation, isTitleFight);
            const campStart = new Date(fightDate);
            campStart.setDate(campStart.getDate() - (campWeeks * 7));

            const campEvent = {
                type: 'CAMP',
                start: new Date(campStart),
                end: new Date(fightDate),
                fighterId: fighter.id,
                titleFight: isTitleFight,
                titleKey: titleKey,
                opponent: { id: opponent.id, name: opponent.name, reputation: opponent.reputation }
            };

            const fightEvent = {
                type: 'FIGHT',
                start: new Date(fightDate),
                end: new Date(fightDate),
                fighterId: fighter.id,
                titleFight: isTitleFight,
                titleKey: titleKey,
                opponent: { id: opponent.id, name: opponent.name, reputation: opponent.reputation }
            };

            const pressDate = new Date(fightDate);
            pressDate.setDate(pressDate.getDate() - 2);
            const pressEvent = {
                type: 'PRESS',
                start: new Date(pressDate),
                end: new Date(pressDate),
                fighterId: fighter.id,
                opponent: { id: opponent.id, name: opponent.name, reputation: opponent.reputation },
                title: 'PRESS CONFERENCE'
            };

            this.scheduledEvents.push(campEvent, fightEvent, pressEvent);
        });

        this.save();
        return { success: true };
    }

    getFightersInCamp() {
        const currentDate = this.currentDate;
        return fighterManager.fighters.filter(f => {
            return this.scheduledEvents.some(e => 
                e.fighterId === f.id && 
                e.type === 'CAMP' && 
                currentDate >= e.start && 
                currentDate < e.end
            );
        });
    }

    isPressWeek(fighterId) {
        const nextWeek = new Date(this.currentDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return this.scheduledEvents.some(e => 
            e.fighterId === fighterId && 
            e.type === 'FIGHT' && 
            e.start >= this.currentDate && 
            e.start <= nextWeek
        );
    }

    getNextFightEvent() {
        const nextWeek = new Date(this.currentDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        // Filter only for player's fighters
        const stableIds = fighterManager.fighters.map(f => f.id);
        return this.scheduledEvents.find(e => 
            e.type === 'FIGHT' && 
            stableIds.includes(e.fighterId) &&
            e.start >= this.currentDate && 
            e.start <= nextWeek
        );
    }

    getPressConferenceQuestionCount(reputation) {
        if (reputation <= 3) return 1;
        if (reputation <= 5) return 2;
        if (reputation <= 7) return 3;
        if (reputation <= 9) return 4;
        return 5;
    }

    getUpcomingFightEvent(fighterId) {
        return this.scheduledEvents.find(e => 
            e.fighterId === fighterId && 
            e.type === 'FIGHT' && 
            e.start >= this.currentDate
        );
    }

    getPressConferenceQuestions(fighter) {
        if (fighter.promotionStats && fighter.promotionStats.currentQuestions) {
            return fighter.promotionStats.currentQuestions;
        }

        const count = this.getPressConferenceQuestionCount(fighter.reputation);
        const event = this.getUpcomingFightEvent(fighter.id);
        const opponent = event ? event.opponent : null;

        const eligible = PRESS_CONFERENCE_QUESTIONS.filter(q => {
            if (q.trigger && !q.trigger(fighter, opponent, event)) return false;
            if (q.minRep && fighter.reputation < q.minRep) return false;
            if (q.maxRep && fighter.reputation > q.maxRep) return false;
            return true;
        });

        const selected = eligible.sort(() => 0.5 - Math.random()).slice(0, count);
        
        if (fighter.promotionStats) {
            fighter.promotionStats.currentQuestions = selected;
        }
        
        return selected;
    }

    canAdvanceTime() {
        const inCamp = this.getFightersInCamp();
        
        // Check Promotions (Regular and Press Conferences)
        const pendingPromo = inCamp.filter(f => {
            const isPressWeek = this.isPressWeek(f.id);
            if (isPressWeek) {
                return !f.promotionStats?.pressConferenceDone;
            }
            return !f.promotionStats?.weeklyPromotionDone;
        });

        if (pendingPromo.length > 0) {
            const isPress = this.isPressWeek(pendingPromo[0].id);
            const typeStr = isPress ? 'PRESS CONFERENCE' : 'PROMOTION';
            return {
                canAdvance: false,
                reason: isPress ? 'PRESS' : 'PROMOTION',
                fighterId: pendingPromo[0].id,
                message: `${typeStr} REQUIRED: ${pendingPromo[0].name.toUpperCase()} has not completed their weekly ${isPress ? 'media obligations' : 'promotional activity'}.`
            };
        }

        // Check Training
        const pendingTrain = inCamp.filter(f => !f.trainingStats?.weeklyTrainingDone);
        if (pendingTrain.length > 0) {
            return {
                canAdvance: false,
                reason: 'TRAINING',
                fighterId: pendingTrain[0].id,
                message: `TRAINING REQUIRED: ${pendingTrain[0].name.toUpperCase()} has not completed their weekly training drill.`
            };
        }

        return { canAdvance: true };
    }

    needsAttention() {
        const check = this.canAdvanceTime();
        return !check.canAdvance;
    }

    advanceTime(days) {
        const check = this.canAdvanceTime();
        if (!check.canAdvance) return [];

        const oldDate = new Date(this.currentDate);
        
        // Process weekly things if we cross a week boundary (e.g., every 7 days or Monday)
        const dayInWeek = this.currentDate.getDay();
        this.currentDate.setDate(this.currentDate.getDate() + days);
        const newDate = new Date(this.currentDate);

        // Check for weekly income (Local Sponsor)
        if (days >= 1) {
            // How many weeks passed?
            let weeksPassed = 0;
            let tempDate = new Date(oldDate);
            for(let i=1; i<=days; i++) {
                tempDate.setDate(tempDate.getDate() + 1);
                if (tempDate.getDay() === 0) { // Sunday reset
                    weeksPassed++;
                }
            }
            const weeklyCash = assetManager.getEffectValue('WEEKLY_CASH', 0);
            if (weeklyCash > 0 && weeksPassed > 0) {
                promotionManager.addTransaction('PROMOTION_ASSET', 'WEEKLY REVENUE: ASSET DIVIDENDS', weeklyCash * weeksPassed, 'INCOME', this.currentDate.toISOString());
            }
        }

        // TRIGGER REPORTS IF BOUNDARIES CROSSED
        if (newDate.getMonth() !== oldDate.getMonth() || newDate.getFullYear() !== oldDate.getFullYear()) {
            assetManager.applyMonthlyEffects();
            this.triggerMonthlyReport(oldDate);
        }
        if (newDate.getFullYear() !== oldDate.getFullYear()) {
            assetManager.applyYearlyEffects();
            this.triggerAnnualReport(oldDate);
        }

        // Reset weekly promotion and training flags
        fighterManager.fighters.forEach(f => {
            if (f.promotionStats) {
                f.promotionStats.weeklyPromotionDone = false;
                f.promotionStats.pressConferenceDone = false;
            }
            if (f.trainingStats) {
                f.trainingStats.weeklyTrainingCount = 0;
                f.trainingStats.weeklyTrainingDone = false;
            }
        });

        // Weekly logic: Injuries heal weekly, AI Booking, etc.
        if (days >= 7 || this.currentDate.getDay() < dayInWeek) {
            fighterManager.processInjuries();
            aiBookingManager.process(); // AI checks for new fights weekly
        }

        // Check for new year retirements
        if (this.currentDate.getFullYear() > oldDate.getFullYear()) {
            const retiredCount = fighterManager.checkRetirements();
            if (retiredCount > 0) {
                messageManager.addMessage(
                    'RETIREMENTS',
                    'ANNUAL RETIREMENT REPORT',
                    `${retiredCount} fighters have officially retired from the professional circuit this year. New prospects have entered the rankings to fill the void.`,
                    { year: oldDate.getFullYear() },
                    this.currentDate.toISOString()
                );
            }
        }

        // Monthly global simulation (AI vs AI)
        if (this.currentDate.getMonth() !== oldDate.getMonth() || this.currentDate.getFullYear() !== oldDate.getFullYear()) {
            fighterManager.generateMonthlyReports();
            fighterManager.processMonthlyWorldUpdate();
        } else {
            // Check for inactivity warnings weekly just in case, though they usually trigger on month boundaries
            fighterManager.processInactivityWarnings();
        }

        const triggeredEvents = this.scheduledEvents.filter(event => {
            // Event starts within the window we just jumped over
            return event.start >= oldDate && event.start <= this.currentDate;
        });

        // CLEANUP: Remove events that have been fully completed (FIGHT, PRESS)
        // and keep recurring ones (CAMP) until they actually end.
        this.scheduledEvents = this.scheduledEvents.filter(event => {
            if (event.type === 'FIGHT' || event.type === 'PRESS') {
                // If it was triggered, it's done
                return !(event.start >= oldDate && event.start <= this.currentDate);
            }
            // For CAMP or other long events, keep them if they haven't finished yet
            return event.end >= this.currentDate;
        });

        this.save();
        return triggeredEvents;
    }

    triggerMonthlyReport(date) {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        const report = promotionManager.getReport(monthStart, monthEnd);
        
        const monthName = date.toLocaleString('default', { month: 'long' }).toUpperCase();
        
        // Extract asset income
        const assetIncome = report.categories['PROMOTION_ASSET'] || 0;

        let body = `FINANCIAL SUMMARY: ${monthName} ${date.getFullYear()}\n\n`;
        body += `TOTAL INCOME: £${report.income.toLocaleString()}\n`;
        if (assetIncome > 0) body += `(INCL. ASSET DIVIDENDS: £${assetIncome.toLocaleString()})\n`;
        body += `TOTAL EXPENSES: £${report.expenses.toLocaleString()}\n`;
        body += `NET PROFIT/LOSS: £${report.profit.toLocaleString()}\n\n`;
        body += `BREAKDOWN BY CATEGORY:\n`;
        
        for (const [cat, val] of Object.entries(report.categories)) {
            body += `- ${cat}: £${val.toLocaleString()}\n`;
        }

        messageManager.addMessage('FINANCIAL_REPORT', `${monthName} P&L BREAKDOWN`, body, { report, type: 'MONTHLY' }, this.currentDate.toISOString());
    }

    triggerAnnualReport(date) {
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const yearEnd = new Date(date.getFullYear(), 11, 31, 23, 59, 59);
        const report = promotionManager.getReport(yearStart, yearEnd);

        // Extract asset income
        const assetIncome = report.categories['PROMOTION_ASSET'] || 0;
        
        let body = `ANNUAL PERFORMANCE REVIEW: ${date.getFullYear()}\n\n`;
        body += `TOTAL ANNUAL INCOME: £${report.income.toLocaleString()}\n`;
        if (assetIncome > 0) body += `(INCL. ANNUAL ASSET YIELD: £${assetIncome.toLocaleString()})\n`;
        body += `TOTAL ANNUAL EXPENSES: £${report.expenses.toLocaleString()}\n`;
        body += `ANNUAL NET PROFIT/LOSS: £${report.profit.toLocaleString()}\n\n`;
        body += `Significant year for the promotion. `;
        body += report.profit > 0 ? "Growth is steady." : "Watch those overheads!";

        messageManager.addMessage('FINANCIAL_REPORT', `${date.getFullYear()} ANNUAL P&L BREAKDOWN`, body, { report, type: 'ANNUAL' }, this.currentDate.toISOString());
    }
}

export const calendarManager = new CalendarManager();