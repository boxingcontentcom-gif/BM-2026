import { fighterManager } from './FighterManager.js';
import { promotionManager } from './PromotionManager.js';
import { calendarManager } from './CalendarManager.js';
import { messageManager } from './MessageManager.js';
import { WEIGHT_DIVISIONS, COLORS, FIGHTER_PERSONALITIES } from '../constants.js';

class InstanceManager {
    constructor() {
        this.oneTimeEvents = {
            GYM_TRAINER_BLOCK_CLINIC: false,
            INITIAL_PROSPECT_TRIGGERED: false
        };
        this.lastYearlyRoll = null;
        this.lastOlympicYear = null;
        this.load();
    }

    load() {
        const saved = localStorage.getItem('boxing_instances_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.oneTimeEvents = data.oneTimeEvents || { GYM_TRAINER_BLOCK_CLINIC: false, INITIAL_PROSPECT_TRIGGERED: false };
            this.lastYearlyRoll = data.lastYearlyRoll;
            this.lastOlympicYear = data.lastOlympicYear;
        }
    }

    save() {
        localStorage.setItem('boxing_instances_data', JSON.stringify({
            oneTimeEvents: this.oneTimeEvents,
            lastYearlyRoll: this.lastYearlyRoll,
            lastOlympicYear: this.lastOlympicYear
        }));
    }

    /**
     * Initial setup for the very first instance.
     */
    triggerInitialInstance() {
        if (!this.oneTimeEvents.INITIAL_PROSPECT_TRIGGERED) {
            this.triggerOlympicProspect();
            this.oneTimeEvents.INITIAL_PROSPECT_TRIGGERED = true;
            this.save();
        }
    }

    /**
     * Called when time advances to check for yearly rolls.
     */
    checkYearlyInstances() {
        const currentYear = calendarManager.currentDate.getFullYear();
        if (this.lastYearlyRoll !== currentYear) {
            this.rollYearlyInstance();
            this.lastYearlyRoll = currentYear;

            // Every 4 years in January for Olympic Prospect
            const currentMonth = calendarManager.currentDate.getMonth();
            if (currentMonth === 0 && (currentYear % 4 === 0)) {
                this.triggerOlympicProspect();
            }
            this.save();
        }
    }

    rollYearlyInstance() {
        const promo = promotionManager.promotion;
        const rep = Math.floor(promo.reputation || 1);
        
        // Probability check (10% chance for some events as requested)
        const roll = Math.random();

        // 1. Gym Trainer Block Clinic (One-time, Level 4-10)
        if (!this.oneTimeEvents.GYM_TRAINER_BLOCK_CLINIC && rep >= 4) {
            this.triggerGymBlockClinic();
            return;
        }

        // 2. Short Notice Fight (Level 2-5, 10% chance)
        if (rep >= 2 && rep <= 5 && roll < 0.1) {
            this.triggerShortNoticeOffer(rep);
            return;
        }

        // 3. International Fight (Level 4-5, 10% chance)
        if ((rep === 4 || rep === 5) && roll < 0.1) {
            this.triggerInternationalFightOffer();
            return;
        }

        // 4. Reality TV (Level 7-10, 10% chance)
        if (rep >= 7 && roll < 0.1) {
            this.triggerRealityTVOffer();
            return;
        }

        // 5. Sparring or Tape sessions (Level 1-5, higher chance if other rolls fail)
        if (rep <= 5) {
            const fighter = this.getRandomEligibleFighter(f => !calendarManager.getNextFightEvent(f.id));
            if (fighter) {
                if (Math.random() > 0.5) {
                    this.triggerSparringOffer(fighter);
                } else {
                    this.triggerWatchTapeOffer(fighter);
                }
                return;
            }
        }
    }

    /**
     * Triggered after a fight to check for performance-based instances.
     */
    checkPostFightInstances(fighter, result) {
        const promo = promotionManager.promotion;
        const rep = Math.floor(promo.reputation || 1);

        // 1. Confidence Boost (Win or KO)
        if (result.winnerId === 'PLAYER') {
            const isKO = result.method === 'KO' || result.method === 'TKO';
            if (isKO) {
                this.triggerConfidenceBoostKO(fighter);
            } else {
                this.triggerConfidenceBoostWin(fighter);
            }
        }

        // 2. Toilet Paper Sponsorship (3 losses in a row)
        if (fighter.record.losses >= 3) {
            const lastThree = fighter.fightHistory.slice(-3);
            const allLosses = lastThree.length === 3 && lastThree.every(h => h.outcome.includes('LOSS') || h.outcome.includes('DEFEAT'));
            if (allLosses) {
                this.triggerSponsorshipOffer(fighter);
            }
        }
    }

    // --- INSTANCE DEFINITIONS ---

    triggerOlympicProspect() {
        // Can only occur if roster not full
        if (fighterManager.fighters.length >= 8) return; 

        messageManager.addMessage(
            'CHOICE',
            'OLYMPIC PROSPECT AVAILABLE',
            'An Olympic prospect’s deal with a major promoter has fallen through. He is a highly gifted 18-year-old Technician looking for the right stable. Would you like to sign him?',
            { 
                instanceType: 'OLYMPIC_PROSPECT',
                choices: [
                    { id: 'ACCEPT', label: 'SIGN HIM', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'DECLINE', color: COLORS.RED }
                ]
            }
        );
    }

    triggerShortNoticeOffer(rep) {
        const fighter = this.getRandomEligibleFighter(f => !f.recoveryUntil && !calendarManager.getNextFightEvent(f.id));
        if (!fighter) return;

        const fee = rep === 2 ? 5000 : (rep === 3 ? 7500 : (rep === 4 ? 10000 : 15000));
        
        messageManager.addMessage(
            'CHOICE',
            'SHORT NOTICE OFFER',
            `A promoter has offered £${fee.toLocaleString()} for ${fighter.name.toUpperCase()} to fight next week on short notice. It allows for only one week of preparation. Accept?`,
            {
                instanceType: 'SHORT_NOTICE_FIGHT',
                fighterId: fighter.id,
                fee: fee,
                choices: [
                    { id: 'ACCEPT', label: 'ACCEPT FIGHT', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'DECLINE', color: COLORS.RED }
                ]
            }
        );
    }

    triggerInternationalFightOffer() {
        const fighter = this.getRandomEligibleFighter(f => !f.recoveryUntil && !calendarManager.getNextFightEvent(f.id));
        if (!fighter) return;

        const fee = 10000 + Math.floor(Math.random() * 10000);
        
        messageManager.addMessage(
            'CHOICE',
            'INTERNATIONAL OFFER',
            `An international promoter wants ${fighter.name.toUpperCase()} to fight an opponent ranked two levels higher next week. The purse is £${fee.toLocaleString()}. Travel required. Accept?`,
            {
                instanceType: 'INTERNATIONAL_FIGHT',
                fighterId: fighter.id,
                fee: fee,
                choices: [
                    { id: 'ACCEPT', label: 'ACCEPT FIGHT', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'DECLINE', color: COLORS.RED }
                ]
            }
        );
    }

    triggerSponsorshipOffer(fighter) {
        messageManager.addMessage(
            'INFO',
            'TOILET PAPER SPONSORSHIP',
            `A local toilet paper company has offered to sponsor ${fighter.name.toUpperCase()} following his recent run of form. You receive £1,000 and have sold 10 VIP tickets for his next bout.`,
            { instanceType: 'SPONSORSHIP' }
        );
        promotionManager.addTransaction('REVENUE', `SPONSORSHIP: ${fighter.name.toUpperCase()}`, 1000, 'INCOME');
        fighter.promotionStats = fighter.promotionStats || {};
        fighter.promotionStats.bonusVipTickets = (fighter.promotionStats.bonusVipTickets || 0) + 10;
        fighterManager.save();
    }

    triggerConfidenceBoostWin(fighter) {
        messageManager.addMessage(
            'INFO',
            'CONFIDENCE SURGE',
            `${fighter.name.toUpperCase()} is full of confidence after his recent win. His skills have surged across the board!`,
            { instanceType: 'SKILL_BOOST' }
        );
        this.applyRandomSkillPoints(fighter, 6);
    }

    triggerConfidenceBoostKO(fighter) {
        messageManager.addMessage(
            'INFO',
            'POWER SURGE',
            `${fighter.name.toUpperCase()} is full of confidence after his recent knockout victory. His punch power is greater than ever!`,
            { instanceType: 'POWER_BOOST' }
        );
        fighter.skills.attack.power = Math.min(99, fighter.skills.attack.power + 5);
        fighterManager.save();
    }

    triggerSparringOffer(fighter) {
        messageManager.addMessage(
            'CHOICE',
            'ELITE SPARRING INVITATION',
            `${fighter.name.toUpperCase()} has been offered to spar at a high-profile gym. He will be unavailable for 2 weeks but will return with significantly improved conditioning.`,
            {
                instanceType: 'ELITE_SPARRING',
                fighterId: fighter.id,
                choices: [
                    { id: 'ACCEPT', label: 'SEND HIM', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'REJECT', color: COLORS.RED }
                ]
            }
        );
    }

    triggerWatchTapeOffer(fighter) {
        messageManager.addMessage(
            'CHOICE',
            'TECHNICAL ANALYSIS SESSION',
            `${fighter.name.toUpperCase()} has been offered to watch tape with a leading gym trainer. He will be unavailable for 2 weeks but gain deep defensive insights.`,
            {
                instanceType: 'WATCH_TAPE',
                fighterId: fighter.id,
                choices: [
                    { id: 'ACCEPT', label: 'ACCEPT', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'REJECT', color: COLORS.RED }
                ]
            }
        );
    }

    triggerRealityTVOffer() {
        const fighter = this.getRandomEligibleFighter(f => f.reputation >= 5 && !calendarManager.getNextFightEvent(f.id));
        if (!fighter) return;

        messageManager.addMessage(
            'CHOICE',
            'REALITY TV OPPORTUNITY',
            `A major network wants ${fighter.name.toUpperCase()} to appear on a reality TV show. He will be unavailable for 4 weeks. This will generate £10,000 and a massive charisma boost.`,
            {
                instanceType: 'REALITY_TV',
                fighterId: fighter.id,
                choices: [
                    { id: 'ACCEPT', label: 'SIGN CONTRACT', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'DECLINE', color: COLORS.RED }
                ]
            }
        );
    }

    triggerGymBlockClinic() {
        messageManager.addMessage(
            'CHOICE',
            'BLOCKING MASTERCLASS',
            'A leading gym trainer has offered to teach all of your fighters advanced blocking techniques for a one-time fee of £10,000.',
            {
                instanceType: 'BLOCK_CLINIC',
                choices: [
                    { id: 'ACCEPT', label: 'PAY £10,000', color: COLORS.GOLD },
                    { id: 'REJECT', label: 'NOT NOW', color: COLORS.RED }
                ]
            }
        );
    }

    // --- CHOICE RESOLUTION ---

    handleChoice(messageId, choiceId) {
        const msg = messageManager.messages.find(m => m.id === messageId);
        if (!msg || !msg.data) return;

        const type = msg.data.instanceType;
        const fighterId = msg.data.fighterId;
        const fighter = fighterId ? fighterManager.getFighter(fighterId) : null;

        if (choiceId === 'REJECT') {
            messageManager.addMessage('INFO', 'OFFER DECLINED', 'The opportunity has been declined and will not proceed.');
            messageManager.deleteMessage(messageId);
            return;
        }

        switch (type) {
            case 'OLYMPIC_PROSPECT':
                this.resolveOlympicProspect();
                break;
            case 'SHORT_NOTICE_FIGHT':
                this.resolveShortNoticeFight(fighter, msg.data.fee);
                break;
            case 'INTERNATIONAL_FIGHT':
                this.resolveInternationalFight(fighter, msg.data.fee);
                break;
            case 'ELITE_SPARRING':
                this.resolveEliteSparring(fighter);
                break;
            case 'WATCH_TAPE':
                this.resolveWatchTape(fighter);
                break;
            case 'REALITY_TV':
                this.resolveRealityTV(fighter);
                break;
            case 'BLOCK_CLINIC':
                this.resolveBlockClinic();
                break;
        }

        // Mark original choice message as resolved/deleted
        messageManager.deleteMessage(messageId);
    }

    resolveOlympicProspect() {
        const div = WEIGHT_DIVISIONS[Math.floor(Math.random() * WEIGHT_DIVISIONS.length)].name;
        
        // Generate a base fighter to get a random name and nationality etc
        const baseFighter = fighterManager.generateOpponent(1, div);
        
        const newFighter = {
            ...baseFighter,
            id: 'OLY_' + Date.now(),
            nickname: 'The Bronze Boy',
            age: 18,
            dob: `${new Date().getFullYear() - 18}-01-01`,
            style: 'Technician',
            personality: FIGHTER_PERSONALITIES.NORMAL,
            charisma: 70 + Math.floor(Math.random() * 31),
            availability: 'CONTRACTED',
            reputation: 1, // Stays at 1 for the player's career start
            reputationStatus: 'LOCAL PROSPECT',
            record: { wins: 0, losses: 0, draws: 0, koWins: 0, koLosses: 0 },
            fightHistory: [],
            skills: {
                attack: {},
                defence: {},
                physical: {}
            },
            injuries: [],
            skillPoints: 0,
            contract: { fightsRemaining: 5 },
            hasBeenSigned: true // Olympic Superstar starts as signed by default in this context
        };
        
        // Boost stats to Reputation 2 quality while remaining Reputation 1
        newFighter.reputation = 2; // Temporary bump for stat allocation
        fighterManager.assignStatsToFighter(newFighter);
        
        // Add +10 Reputation and +5 to all other stats
        newFighter.xp = (newFighter.xp || 0) + (10 * 100); // +10 Reputation levels in XP
        fighterManager.updateFighterMetadata(newFighter);

        // Apply +5 to all attack/defence stats
        Object.keys(newFighter.skills.attack).forEach(k => newFighter.skills.attack[k] = Math.min(99, newFighter.skills.attack[k] + 5));
        Object.keys(newFighter.skills.defence).forEach(k => newFighter.skills.defence[k] = Math.min(99, newFighter.skills.defence[k] + 5));

        // Health & Stamina 200-250 range
        newFighter.skills.physical.health = 200 + Math.floor(Math.random() * 51);
        newFighter.skills.physical.stamina = 200 + Math.floor(Math.random() * 51);
        
        // Add to roster
        fighterManager.fighters.push(newFighter);
        fighterManager.save();
        
        messageManager.addMessage('INFO', 'PROSPECT SIGNED', `The Olympic Prospect, ${newFighter.name.toUpperCase()} (aka 'The Bronze Boy'), has joined your roster. He is an 18-year-old technician in the ${div.toUpperCase()} division with legendary potential.`);
    }

    resolveShortNoticeFight(fighter, fee) {
        if (!fighter) return;
        
        // Find an opponent (1 level lower)
        const opponentRep = Math.max(1, (fighter.reputation || 1) - 1);
        const opponents = fighterManager.worldPopulation.filter(f => f.reputation === opponentRep && f.weightDivision === fighter.weightDivision);
        const opponent = opponents[Math.floor(Math.random() * opponents.length)] || { name: 'Local Jouneyman', reputation: opponentRep };

        const fightDate = new Date(calendarManager.currentDate);
        fightDate.setDate(fightDate.getDate() + 7);

        calendarManager.addEvent({
            type: 'FIGHT',
            date: fightDate.toISOString(),
            fighterId: fighter.id,
            opponent: opponent,
            purse: fee,
            titleFight: false
        });

        messageManager.addMessage('INFO', 'FIGHT SCHEDULED', `The short notice fight for ${fighter.name.toUpperCase()} has been added to your calendar for next week.`);
    }

    resolveInternationalFight(fighter, fee) {
        if (!fighter) return;

        // Opponent ranked 2 levels higher
        const opponentRep = Math.min(10, (fighter.reputation || 1) + 2);
        const opponents = fighterManager.worldPopulation.filter(f => f.reputation === opponentRep && f.weightDivision === fighter.weightDivision);
        const opponent = opponents[Math.floor(Math.random() * opponents.length)] || { name: 'International Contender', reputation: opponentRep };

        const fightDate = new Date(calendarManager.currentDate);
        fightDate.setDate(fightDate.getDate() + 7);

        calendarManager.addEvent({
            type: 'FIGHT',
            date: fightDate.toISOString(),
            fighterId: fighter.id,
            opponent: opponent,
            purse: fee,
            titleFight: false,
            isInternational: true // Can be used for travel cost logic
        });

        messageManager.addMessage('INFO', 'INTERNATIONAL FIGHT BOOKED', `The international bout for ${fighter.name.toUpperCase()} is set for next week.`);
    }

    resolveEliteSparring(fighter) {
        if (!fighter) return;
        const boost = 10 + Math.floor(Math.random() * 41);
        fighter.skills.physical.health = Math.min(100, fighter.skills.physical.health + boost);
        fighter.skills.physical.stamina = Math.min(100, fighter.skills.physical.stamina + boost);
        
        const recoveryDate = new Date(calendarManager.currentDate);
        recoveryDate.setDate(recoveryDate.getDate() + 14);
        fighter.recoveryUntil = recoveryDate.toISOString();
        
        fighterManager.save();
        messageManager.addMessage('INFO', 'SPARRING COMPLETE', `${fighter.name.toUpperCase()} has returned from elite sparring with +${boost} to Health and Stamina.`);
    }

    resolveWatchTape(fighter) {
        if (!fighter) return;
        fighter.skills.defence.defenceIQ = Math.min(99, fighter.skills.defence.defenceIQ + 5);
        
        const recoveryDate = new Date(calendarManager.currentDate);
        recoveryDate.setDate(recoveryDate.getDate() + 14);
        fighter.recoveryUntil = recoveryDate.toISOString();

        fighterManager.save();
        messageManager.addMessage('INFO', 'ANALYSIS COMPLETE', `${fighter.name.toUpperCase()} has finished his technical study. Defence IQ increased by 5.`);
    }

    resolveRealityTV(fighter) {
        if (!fighter) return;
        fighter.charisma = Math.min(100, fighter.charisma + 15);
        promotionManager.addTransaction('REVENUE', 'REALITY TV APPEARANCE', 10000, 'INCOME');
        
        const recoveryDate = new Date(calendarManager.currentDate);
        recoveryDate.setDate(recoveryDate.getDate() + 28);
        fighter.recoveryUntil = recoveryDate.toISOString();

        fighterManager.save();
        messageManager.addMessage('INFO', 'TV DEAL COMPLETE', `${fighter.name.toUpperCase()} is now a reality star! Charisma boosted and £10,000 added to promotion funds.`);
    }

    resolveBlockClinic() {
        if (promotionManager.promotion.cash < 10000) {
            messageManager.addMessage('INFO', 'INSUFFICIENT FUNDS', 'You did not have enough cash to pay for the blocking masterclass.');
            return;
        }

        promotionManager.addTransaction('EXPENSE', 'BLOCKING MASTERCLASS', 10000, 'EXPENSE');
        fighterManager.fighters.forEach(f => {
            f.skills.defence.guard = Math.min(99, f.skills.defence.guard + 3);
        });
        this.oneTimeEvents.GYM_TRAINER_BLOCK_CLINIC = true;
        this.save();
        fighterManager.save();
        messageManager.addMessage('INFO', 'MASTERCLASS COMPLETE', 'All fighters in your roster have improved their blocking skill by 3.');
    }

    // --- HELPERS ---

    getRandomEligibleFighter(predicate) {
        const eligible = fighterManager.fighters.filter(predicate);
        if (eligible.length === 0) return null;
        return eligible[Math.floor(Math.random() * eligible.length)];
    }

    applyRandomSkillPoints(fighter, points) {
        const skills = [];
        // Attack
        Object.keys(fighter.skills.attack).forEach(k => skills.push({ group: 'attack', key: k }));
        // Defence
        Object.keys(fighter.skills.defence).forEach(k => skills.push({ group: 'defence', key: k }));

        for (let i = 0; i < points; i++) {
            const pick = skills[Math.floor(Math.random() * skills.length)];
            fighter.skills[pick.group][pick.key] = Math.min(99, fighter.skills[pick.group][pick.key] + 1);
        }
        fighterManager.save();
    }
}

export const instanceManager = new InstanceManager();