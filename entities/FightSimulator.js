import { BOXING_STYLE_DATA, INJURY_DATA, INJURY_SEVERITY } from '../constants.js';

export class FightSimulator {
    constructor() {
        this.JUDGE_PERSONALITIES = {
            'PURIST': { punches: 0.8, damage: 0.2, technique: 0, drift: 0.05 },
            'SLUGGER': { punches: 0.2, damage: 0.8, technique: 0, drift: 0.05 },
            'DRAWER': { punches: 0.5, damage: 0.5, technique: 0, drift: 0.1, forceDraw: true },
            'GOLD': { punches: 0.5, damage: 0.5, technique: 0, drift: 0 },
            'SILVER': { punches: 0.55, damage: 0.45, technique: 0, drift: 0.05 },
            'BRONZE': { punches: 0.6, damage: 0.4, technique: 0, drift: 0.05 },
            'SNOB': { punches: 0.6, damage: 0.3, technique: 0.1, drift: 0.05 }
        };

        this.PUNCH_DATA = {
            'Jab': { damageMult: 0.25, staminaCostBase: 1, staminaCostPct: 0.002, staminaDrainDefender: 0.1 },
            'Straight': { damageMult: 0.5, staminaCostBase: 1, staminaCostPct: 0.003, staminaDrainDefender: 0.2 },
            'Hook': { damageMult: 0.6, staminaCostBase: 1, staminaCostPct: 0.005, staminaDrainDefender: 0.3 },
            'Uppercut': { damageMult: 0.7, staminaCostBase: 1, staminaCostPct: 0.006, staminaDrainDefender: 0.3 },
            'Overhand': { damageMult: 1.0, staminaCostBase: 1, staminaCostPct: 0.007, staminaDrainDefender: 0.4 }
        };
    }

    simulate(fighterA, fighterB, totalRounds, promoterReputation, locationName = "Unknown Venue") {
        return {
            a: this.initFighterState(fighterA),
            b: this.initFighterState(fighterB),
            roundScores: [],
            isKO: false,
            winnerId: null,
            method: 'DECISION',
            lastRound: 1,
            history: [],
            judges: this.selectJudges(fighterA, fighterB, promoterReputation),
            locationName,
            totalRounds,
            shoutHistory: { a: [], b: [] },
            pointsDeducted: { a: 0, b: 0 },
            warnings: { a: 0, b: 0 },
            mentionedTactics: { a: false, b: false },
            mentionedMental: { a: false, b: false }
        };
    }

    simulateRoundStep(state, round, playerShout, opponentShout) {
        state.lastRound = round;
        state.a.currentShout = playerShout;
        state.b.currentShout = opponentShout;
        
        state.shoutHistory.a.push(playerShout.id);
        state.shoutHistory.b.push(opponentShout.id);

        const roundHistory = { round, exchanges: [] };
        
        if (round === 1) {
            roundHistory.exchanges.push({
                time: 180,
                commentary: `${state.a.name.toUpperCase()} VS ${state.b.name.toUpperCase()} AT ${state.locationName.toUpperCase()}.`,
                events: []
            });
        }

        const roundStats = this.simulateRound(state, roundHistory);
        state.history.push(roundHistory);

        if (state.isKO) {
            const lastExchange = roundHistory.exchanges[roundHistory.exchanges.length - 1];
            state.timeOfFinish = lastExchange ? lastExchange.time : 0;
        } else {
            this.resetStatus(state.a);
            this.resetStatus(state.b);
            const roundScore = this.scoreRound(roundStats, state.judges);
            
            let winsA = 0, winsB = 0;
            roundScore.forEach(s => {
                if (s[0] > s[1]) winsA++;
                else if (s[1] > s[0]) winsB++;
            });
            const roundWinner = winsA > winsB ? 'a' : (winsB > winsA ? 'b' : 'draw');
            
            this.recoverFighters(state, roundWinner);

            roundScore.forEach(s => {
                s[0] -= state.pointsDeducted.a;
                s[1] -= state.pointsDeducted.b;
                state.pointsDeducted.a = 0;
                state.pointsDeducted.b = 0;
            });

            state.roundScores.push(roundScore);
            this.addRoundOutcomeCommentary(state, roundScore);
        }

        return state;
    }

    initFighterState(f) {
        return {
            ...f,
            currentHealth: Math.round(f.skills.physical.health),
            currentStamina: Math.round(f.skills.physical.stamina),
            stunState: null,
            stunTimer: 0,
            cumulativeScore: 0,
            consecutiveMissedPunches: 0,
            totalPunches: { Jab: 0, Straight: 0, Hook: 0, Uppercut: 0, Overhand: 0 },
            totalLanded: { Jab: 0, Straight: 0, Hook: 0, Uppercut: 0, Overhand: 0 },
            roundLanded: { Jab: 0, Straight: 0, Hook: 0, Uppercut: 0, Overhand: 0 },
            totalHeadPunchesReceived: 0,
            cutsCount: 0,
            kds: 0,
            totalDamage: 0,
            inFightInjuries: [],
            currentShout: null,
            blockEffectiveness: 1.0
        };
    }

    simulateRound(state, roundHistory) {
        let time = 180;
        state.a.roundLanded = { Jab: 0, Straight: 0, Hook: 0, Uppercut: 0, Overhand: 0 };
        state.b.roundLanded = { Jab: 0, Straight: 0, Hook: 0, Uppercut: 0, Overhand: 0 };

        const roundStats = {
            aPunches: 0, bPunches: 0,
            aDamage: 0, bDamage: 0,
            aKDs: 0, bKDs: 0,
            aTech: state.a.skills.attack.technique,
            bTech: state.b.skills.attack.technique
        };

        while (time > 0 && !state.isKO) {
            const timeStep = Math.floor(Math.random() * 4) + 2; // 2-5 seconds
            time -= timeStep;
            
            let attackerKey = null;
            const turnOrder = Math.random() < 0.5 ? ['a', 'b'] : ['b', 'a'];
            
            for (const k of turnOrder) {
                const f = state[k];
                if (f.stunTimer > 0) continue;

                const cache = this.cacheSkills(f);
                const skillToPick = ['speed', 'timing', 'offenceIQ', 'technique'][Math.floor(Math.random() * 4)];
                let gain = cache[skillToPick];
                
                if (f.currentShout?.mods?.punchOutput) {
                    gain *= f.currentShout.mods.punchOutput;
                }
                
                f.cumulativeScore += gain;

                if (f.cumulativeScore >= 100 || f.consecutiveMissedPunches >= 5) {
                    attackerKey = k;
                    f.cumulativeScore = 0;
                    f.consecutiveMissedPunches = 0;
                    break;
                }
            }

            if (attackerKey) {
                if (Math.random() < 0.1) {
                    roundHistory.exchanges.push({ time, events: [], commentary: this.generateIdleCommentary(), snapshots: this.getSnapshots(state) });
                } else {
                    const defenderKey = attackerKey === 'a' ? 'b' : 'a';
                    const exchange = this.processExchange(state, attackerKey, defenderKey, roundStats);
                    exchange.time = time;
                    exchange.commentary = this.generateCommentary(exchange, state[attackerKey], state[defenderKey]);
                    roundHistory.exchanges.push(exchange);
                }
                const otherKey = attackerKey === 'a' ? 'b' : 'a';
                state[otherKey].consecutiveMissedPunches++;
            } else {
                roundHistory.exchanges.push({ time, events: [], commentary: this.generateIdleCommentary(), snapshots: this.getSnapshots(state) });
                state.a.consecutiveMissedPunches++;
                state.b.consecutiveMissedPunches++;
            }

            this.updateStatusTimers(state.a, timeStep);
            this.updateStatusTimers(state.b, timeStep);
        }

        return roundStats;
    }

    cacheSkills(f) {
        const cache = {};
        const fluctuation = 0.10;
        
        const groups = ['attack', 'defence'];
        groups.forEach(g => {
            Object.keys(f.skills[g]).forEach(k => {
                let val = f.skills[g][k];
                
                if (f.currentShout && f.currentShout.mods) {
                    const mods = f.currentShout.mods;
                    if (k === 'timing' && mods.timing) val *= mods.timing;
                    if (k === 'power' && mods.power) val *= mods.power;
                    if (k === 'dodge' && mods.dodge) val *= mods.dodge;
                    if (g === 'defence' && mods.defensiveAll) val *= mods.defensiveAll;
                    if (g === 'attack' && mods.offensiveAll) val *= mods.offensiveAll;
                }

                f.inFightInjuries.forEach(inj => {
                    if (inj.effects && inj.effects[k]) val *= inj.effects[k];
                });

                const roll = 1 + (Math.random() * fluctuation * 2 - fluctuation);
                cache[k] = Math.round(val * roll);
            });
        });
        
        return cache;
    }

    processExchange(state, attKey, defKey, roundStats) {
        const att = state[attKey];
        const def = state[defKey];
        const attCache = this.cacheSkills(att);
        const defCache = this.cacheSkills(def);

        const exchange = { attacker: attKey, defender: defKey, events: [], snapshots: {} };

        const style = BOXING_STYLE_DATA[att.style] || BOXING_STYLE_DATA['Technician'];
        const punchType = this.selectPunch(att, style);
        const target = Math.random() * 100 < style.target.head ? 'head' : 'body';
        const isBody = target === 'body';
        const pData = this.PUNCH_DATA[punchType];

        att.totalPunches[punchType]++;

        let appliedStaminaCost = Math.round(pData.staminaCostBase + (att.skills.physical.stamina * pData.staminaCostPct));
        if (att.currentShout?.mods?.staminaCostMult) appliedStaminaCost = Math.round(appliedStaminaCost * att.currentShout.mods.staminaCostMult);
        if (punchType === 'Jab' && att.currentShout?.mods?.jabStaminaDrainMult) appliedStaminaCost = Math.round(appliedStaminaCost * att.currentShout.mods.jabStaminaDrainMult);

        let missChance = 0;
        if (attCache.timing < 25) missChance = 0.25;
        else if (attCache.timing < 50) missChance = 0.125;
        else if (attCache.timing < 75) missChance = 0.0625;

        if (Math.random() < missChance) {
            att.currentStamina = Math.max(0, att.currentStamina - appliedStaminaCost);
            exchange.events.push({ type: 'MISS', punch: punchType, fighter: attKey });
            exchange.snapshots = this.getSnapshots(state);
            return exchange;
        }

        const attWeight = Math.random() * 0.4 + 0.3;
        const attCleanScore = Math.round(attCache.speed * attWeight + attCache.timing * (1 - attWeight));
        const defVisionScore = defCache.vision;
        const seenMinChance = (def.stunState === 'SERIOUS' ? 0.05 : (def.stunState === 'PARTIAL' ? 0.15 : 0.25));
        const isSeen = Math.random() < Math.max(seenMinChance, (defVisionScore / (attCleanScore / 2 + defVisionScore)));
        const isClean = !isSeen;

        const attWeight2 = Math.random() * 0.4 + 0.3;
        const attOffenceScore = Math.round(attCache.offenceIQ * attWeight2 + attCache.technique * (1 - attWeight2));
        
        const defStyle = BOXING_STYLE_DATA[def.style] || BOXING_STYLE_DATA['Technician'];
        const defAction = this.selectDefensiveAction(defStyle);
        const defActionSkill = defCache[this.mapDefActionToSkill(defAction)];
        const defWeight = Math.random() * 0.4 + 0.3;
        const defDefenseScore = Math.round(defCache.defenceIQ * defWeight + defActionSkill * (1 - defWeight));

        if (defDefenseScore > attOffenceScore) {
            const baseDamage = this.calculateBaseDamage(attCache, pData);
            if (defAction === 'block') {
                const reducedDamage = Math.round(baseDamage * (1 - (0.9 * def.blockEffectiveness)));
                def.blockEffectiveness = Math.max(0.1, def.blockEffectiveness - 0.02);
                this.applyDamageToDefender(state, defKey, reducedDamage, isBody, punchType, exchange, roundStats, isClean);
                exchange.events.push({ type: 'BLOCK', fighter: defKey });
            } else if (defAction === 'counter') {
                const reflected = Math.round(baseDamage * 1.5);
                this.applyDamageToDefender(state, attKey, reflected, false, 'Counter', exchange, roundStats, false);
                exchange.events.push({ type: 'COUNTER', fighter: defKey });
            } else if (defAction === 'clinch') {
                const reflectedAttacker = Math.round(baseDamage * 0.25);
                def.currentStamina = Math.min(def.skills.physical.stamina, Math.round(def.currentStamina + def.currentStamina * 0.01));
                this.applyDamageToDefender(state, attKey, reflectedAttacker, false, 'Clinch Work', exchange, roundStats, false);
                exchange.events.push({ type: 'CLINCH_SUCCESS', fighter: defKey });
                if (def.style === 'Dirty' && Math.random() < 0.01) this.triggerCut(state, attKey, exchange);
            } else if (defAction === 'dodge') {
                att.currentStamina = Math.max(0, att.currentStamina - appliedStaminaCost * 2);
                exchange.events.push({ type: 'DODGE', fighter: defKey });
            }
            att.currentStamina = Math.max(0, att.currentStamina - appliedStaminaCost);
        } else {
            let damage = this.calculateBaseDamage(attCache, pData);
            if (isClean) {
                damage = Math.round(damage * 1.5);
                if (Math.random() < 0.25) appliedStaminaCost = Math.round(appliedStaminaCost * 0.5);
            }
            att.currentStamina = Math.max(0, att.currentStamina - appliedStaminaCost);
            this.applyDamageToDefender(state, defKey, damage, isBody, punchType, exchange, roundStats, isClean);
            
            if (!state.isKO && !exchange.events.some(e => e.type === 'KNOCKDOWN')) {
                let comboChance = attCache.combinations;
                const roll = Math.random() * 100;
                if (att.currentStamina < (att.skills.physical.stamina * 0.25)) comboChance -= 25;
                else if (att.currentStamina < (att.skills.physical.stamina * 0.5)) comboChance -= 10;
                
                if (roll < comboChance) {
                    exchange.isCombo = true;
                    const followUp = this.processExchange(state, attKey, defKey, roundStats);
                    exchange.events.push(...followUp.events);
                }
            }
        }

        exchange.snapshots = this.getSnapshots(state);
        return exchange;
    }

    calculateBaseDamage(cache, pData) {
        const secondary = [cache.technique, cache.offenceIQ, cache.timing, cache.speed][Math.floor(Math.random() * 4)];
        let damage = (cache.power * 0.7) + (secondary / 3);
        damage *= pData.damageMult;
        return Math.max(1, Math.round(damage));
    }

    applyDamageToDefender(state, defKey, damage, isBody, punchType, exchange, roundStats, isClean = false) {
        const def = state[defKey];
        const attKey = defKey === 'a' ? 'b' : 'a';
        const att = state[attKey];

        if (att.currentStamina <= 0) damage = Math.round(damage * 0.1);

        damage = Math.round(damage);
        def.currentHealth = Math.max(0, def.currentHealth - damage);
        att.totalDamage += damage;
        att.totalLanded[punchType]++;
        att.roundLanded[punchType]++;
        
        if (attKey === 'a') roundStats.aDamage += damage; else roundStats.bDamage += damage;
        if (attKey === 'a') roundStats.aPunches++; else roundStats.bPunches++;

        exchange.events.push({ type: 'HIT', punch: punchType, fighter: attKey, damage, isBody, isClean });

        const pData = this.PUNCH_DATA[punchType] || { staminaDrainDefender: 0.1 };
        let stamDrain = Math.round(damage * pData.staminaDrainDefender);
        if (isBody && punchType !== 'Overhand') stamDrain *= 2;
        
        if (att.currentShout?.mods?.opponentStaminaDrainMult) stamDrain = Math.round(stamDrain * att.currentShout.mods.opponentStaminaDrainMult);
        def.currentStamina = Math.max(0, def.currentStamina - stamDrain);

        if (!isBody) {
            att.totalHeadPunchesReceived++;
            this.checkCuts(state, defKey, att, damage, exchange);
        }

        this.checkStun(state, defKey, isClean, exchange);
        this.checkKnockdown(state, defKey, att, damage, isClean, punchType, exchange, roundStats);
    }

    checkKnockdown(state, defKey, attacker, damage, isClean, punchType, exchange, roundStats) {
        const def = state[defKey];
        const attKey = defKey === 'a' ? 'b' : 'a';
        
        let chance = 0;
        const powerDiff = (attacker.skills.attack.power - def.skills.defence.guard) / (def.skills.defence.guard || 1);
        if (powerDiff > 0.2) chance += 0.05;
        if (isClean) chance += 0.025;
        
        const damagePct = (damage / def.skills.physical.health);
        if (damagePct > 0.05) chance += 0.05;

        const typeBonus = { 'Jab': 0, 'Straight': 0.02, 'Hook': 0.03, 'Uppercut': 0.03, 'Overhand': 0.04 };
        chance += (typeBonus[punchType] || 0);

        const healthPct = def.currentHealth / def.skills.physical.health;
        if (healthPct < 0.5) chance += 0.02;
        else if (healthPct < 0.75) chance += 0.01;

        const staminaPct = def.currentStamina / def.skills.physical.stamina;
        if (staminaPct <= 0) chance += 0.05;
        else if (staminaPct < 0.25) chance += 0.02;
        else if (staminaPct < 0.5) chance += 0.01;

        if (attacker.currentShout?.mods?.knockdownChanceMult) chance *= attacker.currentShout.mods.knockdownChanceMult;
        if (def.stunState === 'SERIOUS') chance += 0.20;
        else if (def.stunState === 'PARTIAL') chance += 0.10;

        if (healthPct > 0.75) chance *= 0.5;
        else if (healthPct > 0.5) chance *= 0.8;

        if (Math.random() < chance) {
            exchange.events.push({ type: 'KNOCKDOWN', fighter: defKey });
            def.kds++;
            if (attKey === 'a') roundStats.aKDs++; else roundStats.bKDs++;

            if (!this.resolveRecovery(def)) {
                state.isKO = true;
                state.method = 'KO';
                state.winnerId = attKey === 'a' ? 'PLAYER' : 'OPPONENT';
                exchange.isKO = true;
            } else {
                const stunRoll = Math.random();
                if (stunRoll < 0.10) {
                    def.stunState = 'SERIOUS';
                    def.stunTimer = 30;
                } else if (stunRoll < 0.35) {
                    def.stunState = 'PARTIAL';
                    def.stunTimer = 10;
                }
            }
        }
    }

    resolveRecovery(f) {
        const healthPct = f.currentHealth / f.skills.physical.health;
        let chance = 0.09;
        if (healthPct > 0.9) chance = 0.99;
        else if (healthPct > 0.8) chance = 0.89;
        else if (healthPct > 0.7) chance = 0.79;
        else if (healthPct > 0.6) chance = 0.69;
        else if (healthPct > 0.5) chance = 0.59;
        else if (healthPct > 0.4) chance = 0.49;
        else if (healthPct > 0.3) chance = 0.39;
        else if (healthPct > 0.2) chance = 0.29;
        else if (healthPct > 0.1) chance = 0.19;

        if (f.kds === 1) chance -= 0.20;
        else if (f.kds === 2) chance -= 0.30;
        else if (f.kds >= 3) chance -= 0.90;

        if (f.skills.physical.stamina >= 75) chance += 0.10;
        const staminaPct = f.currentStamina / f.skills.physical.stamina;
        if (staminaPct < 0.25) chance -= 0.10;
        else if (staminaPct < 0.5) chance -= 0.05;

        return Math.random() < chance;
    }

    checkStun(state, defKey, isClean, exchange) {
        const def = state[defKey];
        if (def.stunState) return;

        let chance = 0;
        if (isClean) {
            chance = 0.05; // 5% base from landed clean
            const healthPct = def.currentHealth / def.skills.physical.health;
            if (healthPct < 0.25) chance += 0.20;
            else if (healthPct < 0.5) chance += 0.10;
            else if (healthPct < 0.75) chance += 0.05;

            const staminaPct = def.currentStamina / def.skills.physical.stamina;
            if (staminaPct < 0.25) chance += 0.10;
            else if (staminaPct < 0.5) chance += 0.05;
            else if (staminaPct < 0.75) chance += 0.025;
        }

        if (Math.random() < chance) {
            def.stunState = 'PARTIAL';
            def.stunTimer = 10;
            exchange.events.push({ type: 'STUN', fighter: defKey });
        }
    }

    checkCuts(state, defKey, attacker, damage, exchange) {
        const def = state[defKey];
        if (def.cutsCount >= 2) return;

        let chance = 0;
        const attPower = attacker.skills.attack.power;
        if (attPower > 80) chance += 0.015;
        else if (attPower > 60) chance += 0.01;
        else if (attPower > 40) chance += 0.005;
        else if (attPower > 20) chance += 0.001;

        const headPunches = attacker.totalHeadPunchesReceived;
        const thresholds = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
        const minorChances = [0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09];
        const regularChances = [0.002, 0.004, 0.008, 0.012, 0.016, 0.02, 0.024, 0.028, 0.032, 0.036];

        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (headPunches >= thresholds[i]) {
                if (Math.random() < regularChances[i]) {
                    this.triggerCut(state, defKey, exchange, true);
                    return;
                }
                if (Math.random() < minorChances[i]) {
                    this.triggerCut(state, defKey, exchange, false);
                    return;
                }
                break;
            }
        }

        if (Math.random() < chance) {
            this.triggerCut(state, defKey, exchange, Math.random() < 0.3);
        }
    }

    triggerCut(state, fKey, exchange, isRegular = false) {
        const f = state[fKey];
        const eligible = Object.keys(INJURY_DATA).filter(k => {
            const isCut = k.includes('CUT');
            const severityMatch = isRegular ? INJURY_DATA[k].severity === INJURY_SEVERITY.BADLY_INJURED : INJURY_DATA[k].severity === INJURY_SEVERITY.INJURED;
            return isCut && severityMatch;
        });

        if (eligible.length > 0) {
            const key = eligible[Math.floor(Math.random() * eligible.length)];
            const data = INJURY_DATA[key];
            f.inFightInjuries.push({ key, name: data.name, effects: data.effects });
            f.cutsCount++;
            exchange.events.push({ type: 'INJURY', fighter: fKey, injuryName: data.name, severity: data.severity, key });
        }
    }

    selectPunch(f, style) {
        const punches = style.punches;
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const [type, chance] of Object.entries(punches)) {
            cumulative += chance;
            if (roll < cumulative) return type.charAt(0).toUpperCase() + type.slice(1);
        }
        return 'Jab';
    }

    selectDefensiveAction(style) {
        const def = style.defense;
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const [type, chance] of Object.entries(def)) {
            cumulative += chance;
            if (roll < cumulative) return type;
        }
        return 'block';
    }

    mapDefActionToSkill(action) {
        const map = { block: 'guard', counter: 'counter', dodge: 'dodge', clinch: 'clinch' };
        return map[action] || 'guard';
    }

    getSnapshots(state) {
        return {
            a: { 
                health: state.a.currentHealth, 
                stamina: state.a.currentStamina, 
                totalPunches: { ...state.a.totalPunches }, 
                totalLanded: { ...state.a.totalLanded },
                momentum: state.a.cumulativeScore
            },
            b: { 
                health: state.b.currentHealth, 
                stamina: state.b.currentStamina, 
                totalPunches: { ...state.b.totalPunches }, 
                totalLanded: { ...state.b.totalLanded },
                momentum: state.b.cumulativeScore
            }
        };
    }

    updateStatusTimers(f, seconds) {
        if (f.stunTimer > 0) {
            f.stunTimer -= seconds;
            if (f.stunTimer <= 0) {
                f.stunTimer = 0;
                f.stunState = null;
            }
        }
    }

    resetStatus(f) {
        f.stunState = null;
        f.stunTimer = 0;
        f.blockEffectiveness = 1.0;
    }

    recoverFighters(state, roundWinner) {
        ['a', 'b'].forEach(k => {
            const f = state[k];
            const recoveryPct = roundWinner === k ? 0.05 : 0.01;
            
            const hGain = Math.round(f.skills.physical.health * recoveryPct);
            const sGain = Math.round(f.skills.physical.stamina * recoveryPct);
            
            f.currentHealth = Math.min(f.skills.physical.health, f.currentHealth + hGain);
            f.currentStamina = Math.min(f.skills.physical.stamina, f.currentStamina + sGain);
        });
    }

    generateCommentary(exchange, attacker, defender) {
        const events = exchange.events;
        if (events.length === 0) return this.generateIdleCommentary();

        const lastEvent = events[events.length - 1];
        const aName = attacker.name.toUpperCase();
        const dName = defender.name.toUpperCase();

        if (lastEvent.type === 'HIT') {
            return `${aName} LANDS A SOLID ${lastEvent.punch.toUpperCase()}!`;
        }
        if (lastEvent.type === 'MISS') {
            return `${aName} MISSES WITH THE ${lastEvent.punch.toUpperCase()}.`;
        }
        if (lastEvent.type === 'KNOCKDOWN') {
            return exchange.isKO ? `LIGHTS OUT! ${dName} IS FINISHED!` : `1, 2, 3, 4, 5, 6, 7, 8... DOWN GOES ${dName}!`;
        }
        if (lastEvent.type === 'INJURY') {
            return `BLOOD! ${dName} HAS SUSTAINED A ${lastEvent.injuryName.toUpperCase()}!`;
        }
        return "TENSE EXCHANGES...";
    }

    generateIdleCommentary() {
        const phrases = ["WATCHING FOR AN OPENING...", "CIRCULING THE RING...", "TENSE ATMOSPHERE...", "FEELING THE PACE..."];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    selectJudges(a, b, rep) {
        const types = Object.keys(this.JUDGE_PERSONALITIES);
        return Array(3).fill(0).map((_, i) => ({ type: types[Math.floor(Math.random() * types.length)], name: `Judge ${i+1}` }));
    }

    scoreRound(res, judges) {
        return judges.map(j => {
            const p = this.JUDGE_PERSONALITIES[j.type];
            let aScore = (res.aPunches * p.punches + res.aDamage * p.damage);
            let bScore = (res.bPunches * p.punches + res.bDamage * p.damage);
            let rdA = 10, rdB = 10;
            if (aScore > bScore) rdB = 9; else if (bScore > aScore) rdA = 9;
            if (res.bKDs > 0) rdB -= Math.min(3, res.bKDs);
            if (res.aKDs > 0) rdA -= Math.min(3, res.aKDs);
            return [Math.max(6, rdA), Math.max(6, rdB)];
        });
    }

    addRoundOutcomeCommentary(state, roundScore) {
        // Simple placeholder for consistency
    }

    finalizeDecision(state) {
        const judgeCount = state.judges.length;
        const judgeTotals = Array(judgeCount).fill(0).map(() => [0, 0]);
        state.roundScores.forEach(rd => { 
            rd.forEach((jScore, idx) => { 
                judgeTotals[idx][0] += jScore[0]; 
                judgeTotals[idx][1] += jScore[1]; 
            }); 
        });
        let winsA = 0, winsB = 0, draws = 0;
        judgeTotals.forEach(total => { 
            if (total[0] > total[1]) winsA++; 
            else if (total[1] > total[0]) winsB++; 
            else draws++; 
        });
        state.scoreString = judgeTotals.map(t => `${t[0]}-${t[1]}`).join(', ');
        if (!state.isKO) {
            if (winsA > winsB && winsA >= draws) state.winnerId = 'PLAYER'; 
            else if (winsB > winsA && winsB >= draws) state.winnerId = 'OPPONENT';
            else state.winnerId = 'DRAW';
            state.method = (state.winnerId === 'DRAW') ? 'DRAW' : 'DECISION';
        }
        return state;
    }
}

export const fightSimulator = new FightSimulator();
