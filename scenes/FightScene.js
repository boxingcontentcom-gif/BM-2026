import Phaser from 'phaser';
import { 
    COLORS, FONTS, GENERIC_SHOUTS, BOXING_STYLE_DATA, BE_YOURSELF_SHOUT, CHAMPIONSHIPS,
    COMMENTARY_PHRASES, WEIGHT_DIVISIONS 
} from '../constants.js';
import { promotionManager } from '../entities/PromotionManager.js';

export default class FightScene extends Phaser.Scene {
    constructor() {
        super('FightScene');
    }

    init(data) {
        this.fighter = data.fighter;
        this.opponent = data.opponent;
        this.fightState = data.fightData; 
        this.fightEvent = data.event;
        
        this.currentRound = 1;
        this.currentExchangeIdx = 0;
        this.isPaused = false;
        this.isEnding = false;
        this.gameSpeedMultiplier = 2.0; // 2x speed requested
        this.roundTime = 180;
        this.currentRoundData = null;
        
        this.availableShouts = [BE_YOURSELF_SHOUT, ...GENERIC_SHOUTS];
        this.selectedShout = BE_YOURSELF_SHOUT;

        this.nextGeneralCommentaryTime = 175; // First one early
        this.midpointTriggered = false;
        this.isCounting = false;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        if (!this.fightState || !this.fighter || !this.opponent) {
            console.error('Missing fight data');
            this.scene.start('ManagementScene');
            return;
        }

        this.isPaused = true;
        
        this.add.rectangle(0, 0, width, height, 0x050505).setOrigin(0);
        this.createStaticUI(width, height);
        this.createStatsComparison(width, height);
    }

    update(time, delta) {
        if (this.isPaused || !this.currentRoundData) return;

        // Smooth Clock decrement
        const dt = (delta / 1000) * this.gameSpeedMultiplier;
        this.roundTime = Math.max(0, this.roundTime - dt);
        
        const minutes = Math.floor(this.roundTime / 60);
        const seconds = Math.floor(this.roundTime % 60);
        this.clockText.setText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);

        // Situational Commentary - Midpoint (1:30)
        if (!this.midpointTriggered && this.roundTime <= 90) {
            this.midpointTriggered = true;
            this.triggerSituationalCommentary('MIDPOINT');
        }

        // Periodic General Commentary
        if (this.roundTime <= this.nextGeneralCommentaryTime) {
            this.triggerSituationalCommentary('GENERAL');
            // Schedule next general comment in 25-45 seconds
            this.nextGeneralCommentaryTime = this.roundTime - (25 + Math.random() * 20);
        }

        // Check if we need to trigger an exchange
        const exchanges = this.currentRoundData.exchanges;
        while (!this.isCounting && this.currentExchangeIdx < exchanges.length && exchanges[this.currentExchangeIdx].time >= this.roundTime) {
            const triggeredCount = this.processExchangeUI(exchanges[this.currentExchangeIdx]);
            this.currentExchangeIdx++;
            if (triggeredCount) break;
        }

        // End of round check
        if (!this.isCounting && (this.roundTime <= 0 || (this.fightState.isKO && this.currentRound === this.fightState.lastRound && this.currentExchangeIdx >= exchanges.length))) {
            this.isPaused = true;
            this.logText.setText(`END OF ROUND ${this.currentRound}`);
            this.logText.setColor(COLORS.STR_GOLD);
            
            this.time.delayedCall(1500 / this.gameSpeedMultiplier, () => { 
                this.currentRound++;
                if (this.currentRound > this.fightState.totalRounds || (this.fightState.isKO && this.fightState.lastRound < this.currentRound)) {
                    this.endFight();
                } else {
                    this.renderShoutSelection();
                }
            });
        }
    }

    renderShoutSelection() {
        const { width, height } = this.scale;
        this.shoutOverlay = this.add.container(0, 0).setDepth(1000);
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0).setInteractive();
        this.shoutOverlay.add(bg);

        const card = this.add.graphics();
        card.fillStyle(0x1a1a1a, 1);
        card.fillRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.8, 20);
        card.lineStyle(2, COLORS.STR_GOLD, 1);
        card.strokeRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.8, 20);
        this.shoutOverlay.add(card);

        this.shoutOverlay.add(this.add.text(width / 2, height * 0.15, `ROUND ${this.currentRound}: FIGHTER SHOUT`, {
            fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        const btnWidth = width * 0.4;
        const btnHeight = 60;
        const startX = width * 0.08;
        const startY = height * 0.22;
        
        const highlight = this.add.graphics();
        highlight.lineStyle(3, COLORS.STR_GOLD, 1);
        highlight.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);
        highlight.setVisible(false);
        this.shoutOverlay.add(highlight);

        this.availableShouts.forEach((shout, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + (col * (btnWidth + width * 0.04));
            const y = startY + (row * (btnHeight + 10));

            const btn = this.add.graphics();
            btn.fillStyle(0x333333, 1);
            btn.fillRoundedRect(x, y, btnWidth, btnHeight, 10);
            this.shoutOverlay.add(btn);

            const name = this.add.text(x + 10, y + 10, shout.name.toUpperCase(), { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE, wordWrap: { width: btnWidth - 20 } });
            const desc = this.add.text(x + 10, y + 30, shout.desc, { fontSize: '8px', fontFamily: FONTS.BODY, color: '#aaa', wordWrap: { width: btnWidth - 20 } });
            this.shoutOverlay.add([name, desc]);

            const zone = this.add.rectangle(x + btnWidth / 2, y + btnHeight / 2, btnWidth, btnHeight, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this.selectedShout = shout;
                highlight.setPosition(x + btnWidth / 2, y + btnHeight / 2);
                highlight.setVisible(true);
            });
            this.shoutOverlay.add(zone);
        });

        const confirmBtn = this.add.graphics();
        confirmBtn.fillStyle(0x00FF00, 1);
        confirmBtn.fillRoundedRect(width * 0.25, height * 0.82, width * 0.5, 40, 20);
        const confirmTxt = this.add.text(width / 2, height * 0.82 + 20, 'CONFIRM SHOUT', { fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000' }).setOrigin(0.5);
        const confirmZone = this.add.rectangle(width / 2, height * 0.82 + 20, width * 0.5, 40, 0, 0).setInteractive({ useHandCursor: true });
        
        confirmZone.on('pointerdown', () => {
            if (this.selectedShout.isStyleChange) {
                this.renderStyleSelection();
            } else {
                this.shoutOverlay.destroy();
                this.startRoundSimulation();
            }
        });
        this.shoutOverlay.add([confirmBtn, confirmTxt, confirmZone]);
    }

    renderStyleSelection() {
        const { width, height } = this.scale;
        this.styleOverlay = this.add.container(0, 0).setDepth(1100);
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.95).setOrigin(0).setInteractive();
        this.styleOverlay.add(bg);

        const card = this.add.graphics();
        card.fillStyle(0x1a1a1a, 1);
        card.fillRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.8, 20);
        card.lineStyle(2, COLORS.STR_GOLD, 1);
        card.strokeRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.8, 20);
        this.styleOverlay.add(card);

        this.styleOverlay.add(this.add.text(width / 2, height * 0.15, 'SELECT NEW STYLE', {
            fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        const styles = Object.keys(BOXING_STYLE_DATA);
        const btnWidth = width * 0.4;
        const btnHeight = 40;
        const startX = width * 0.08;
        const startY = height * 0.22;

        let styleToApply = this.fightState.a.style;

        const highlight = this.add.graphics();
        highlight.lineStyle(3, COLORS.STR_GOLD, 1);
        highlight.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);
        highlight.setVisible(false);
        this.styleOverlay.add(highlight);

        styles.forEach((style, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = startX + (col * (btnWidth + width * 0.04));
            const y = startY + (row * (btnHeight + 10));

            const btn = this.add.graphics().fillStyle(0x333333, 1).fillRoundedRect(x, y, btnWidth, btnHeight, 10);
            this.styleOverlay.add(btn);

            const name = this.add.text(x + btnWidth / 2, y + btnHeight / 2, style.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5);
            this.styleOverlay.add(name);

            const zone = this.add.rectangle(x + btnWidth / 2, y + btnHeight / 2, btnWidth, btnHeight, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                styleToApply = style;
                highlight.setPosition(x + btnWidth / 2, y + btnHeight / 2);
                highlight.setVisible(true);
            });
            this.styleOverlay.add(zone);
        });

        const applyBtn = this.add.graphics().fillStyle(0x00FF00, 1).fillRoundedRect(width * 0.25, height * 0.82, width * 0.5, 40, 20);
        const applyTxt = this.add.text(width / 2, height * 0.82 + 20, 'APPLY', { fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000' }).setOrigin(0.5);
        const applyZone = this.add.rectangle(width / 2, height * 0.82 + 20, width * 0.5, 40, 0, 0).setInteractive({ useHandCursor: true });
        
        applyZone.on('pointerdown', () => {
            this.fightState.a.style = styleToApply;
            this.styleOverlay.destroy();
            this.shoutOverlay.destroy();
            this.startRoundSimulation();
        });
        this.styleOverlay.add([applyBtn, applyTxt, applyZone]);
    }

    startRoundSimulation() {
        const oppStyleData = BOXING_STYLE_DATA[this.opponent.style] || BOXING_STYLE_DATA['Technician'];
        const oppOptions = [...GENERIC_SHOUTS, oppStyleData.shout, BE_YOURSELF_SHOUT];
        const oppShout = oppOptions[Math.floor(Math.random() * oppOptions.length)];

        import('../entities/FightSimulator.js').then(module => {
            module.fightSimulator.simulateRoundStep(this.fightState, this.currentRound, this.selectedShout, oppShout);
            this.currentRoundData = this.fightState.history[this.currentRound - 1];
            this.roundTime = 180;
            this.currentExchangeIdx = 0;
            this.isPaused = false;
            this.roundText.setText(`ROUND ${this.currentRound}`);
            this.updateSkillDisplays();

            this.midpointTriggered = false;
            this.nextGeneralCommentaryTime = 160 + Math.random() * 10;

            if (this.currentRound > 1) {
                this.triggerSituationalCommentary('ROUND_START_AFTER_1');
            }
        });
    }

    updateSkillDisplays() {
        const updateFighterSkills = (ui, fighter) => {
            const mods = fighter.currentShout ? fighter.currentShout.mods : {};
            const skillStyle = { fontSize: '12px', fontFamily: FONTS.TITLE };
            
            ui.skillContainer.removeAll(true);
            const displayWidth = this.scale.width * 0.43;

            const renderGroup = (skills, startY, xOffset, mods) => {
                Object.entries(skills).forEach(([name, val], i) => {
                    const label = name.charAt(0).toUpperCase() + name.slice(1);
                    const y = startY + (i * 14);
                    
                    let color = '#fff';
                    if (mods.timing && name === 'timing') color = mods.timing > 1 ? '#00ff00' : '#ff0000';
                    if (mods.power && name === 'power') color = mods.power > 1 ? '#00ff00' : '#ff0000';
                    if (mods.dodge && name === 'dodge') color = mods.dodge > 1 ? '#00ff00' : '#ff0000';
                    if (mods.offenceIQ && name === 'offenceIQ') color = mods.offenceIQ > 1 ? '#00ff00' : '#ff0000';
                    if (mods.defenceIQ && name === 'defenceIQ') color = mods.defenceIQ > 1 ? '#00ff00' : '#ff0000';
                    
                    if (mods.defensiveAll && ['guard','dodge','clinch','defenceIQ'].includes(name)) {
                        color = mods.defensiveAll > 1 ? '#00ff00' : '#ff0000';
                    }
                    if (mods.offensiveAll && ['speed','power','timing','offenceIQ','technique','combinations'].includes(name)) {
                        color = mods.offensiveAll > 1 ? '#00ff00' : '#ff0000';
                    }

                    ui.skillContainer.add(this.add.text(xOffset, y, `${label.toUpperCase()}:`, { ...skillStyle, color: '#666' }));
                    ui.skillContainer.add(this.add.text(xOffset + displayWidth * 0.45, y, Math.floor(val).toString(), { ...skillStyle, color }).setOrigin(1, 0));
                });
            };

            renderGroup(fighter.skills.attack, 0, 0, mods);
            renderGroup(fighter.skills.defence, 0, displayWidth * 0.5, mods);
        };

        updateFighterSkills(this.playerUI, this.fightState.a);
        updateFighterSkills(this.oppUI, this.fightState.b);
    }

    createFighterDisplay(x, y, side) {
        const { width } = this.scale;
        const displayWidth = width * 0.43;
        const fighter = side === 'a' ? this.fighter : this.opponent;
        const mainColor = side === 'a' ? 0xff3333 : 0x3333ff; 
        
        const container = this.add.container(x, y);
        const barH = 12;
        const barW = displayWidth;
        
        const healthLabel = this.add.text(0, 0, 'HEALTH', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#888', letterSpacing: 1 });
        const hValTxt = this.add.text(barW, 0, `${Math.floor(fighter.skills.physical.health)}/${Math.floor(fighter.skills.physical.health)}`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0);
        container.add([healthLabel, hValTxt]);

        const hBg = this.add.graphics().fillStyle(0x1a1a1a, 1).fillRoundedRect(0, 20, barW, barH, 6);
        container.add(hBg);
        const hBar = this.add.graphics().fillStyle(mainColor, 1).fillRoundedRect(0, 20, barW, barH, 6);
        container.add(hBar);
        
        const staminaLabel = this.add.text(0, 42, 'STAMINA', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#888', letterSpacing: 1 });
        const sValTxt = this.add.text(barW, 42, `${Math.floor(fighter.skills.physical.stamina)}/${Math.floor(fighter.skills.physical.stamina)}`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0);
        container.add([staminaLabel, sValTxt]);

        const sBg = this.add.graphics().fillStyle(0x1a1a1a, 1).fillRoundedRect(0, 62, barW, barH, 6);
        container.add(sBg);
        const sBar = this.add.graphics().fillStyle(0x00ffcc, 1).fillRoundedRect(0, 62, barW, barH, 6);
        container.add(sBar);
        
        const styleText = this.add.text(displayWidth / 2, 90, fighter.style.toUpperCase(), { 
            fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, letterSpacing: 1
        }).setOrigin(0.5, 0);
        container.add(styleText);
        
        const punchTypes = ['Jab', 'Straight', 'Hook', 'Uppercut', 'Overhand'];
        const detailedStats = this.add.container(0, 130);
        punchTypes.forEach((type, i) => {
            const rowY = i * 22;
            detailedStats.add(this.add.text(0, rowY, type.toUpperCase(), { fontSize: '13px', fontFamily: FONTS.TITLE, color: '#666' }));
            const val = this.add.text(barW, rowY, '0 / 0', { fontSize: '15px', fontFamily: FONTS.TITLE, color: '#fff' }).setOrigin(1, 0);
            detailedStats.add(val);
            detailedStats[`txt${type}`] = val;
        });
        container.add(detailedStats);
        
        const kdText = this.add.text(0, 230, 'KDs: 0', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD });
        container.add(kdText);

        const skillContainer = this.add.container(0, 260);
        container.add(skillContainer);

        // Momentum Bar
        const momLabel = this.add.text(0, 245, 'MOMENTUM', { fontSize: '10px', fontFamily: FONTS.TITLE, color: '#444' });
        const momBg = this.add.graphics().fillStyle(0x111111, 1).fillRect(0, 258, barW, 4);
        const momBar = this.add.graphics().fillStyle(COLORS.ACCENT, 1).fillRect(0, 258, 0, 4);
        container.add([momLabel, momBg, momBar]);

        const uiObj = { 
            hBar, sBar, hValTxt, sValTxt, kdText, detailedStats, skillContainer, momBar,
            name: fighter.name, maxH: fighter.skills.physical.health, maxS: fighter.skills.physical.stamina,
            barW: barW, barH: barH, color: mainColor
        };

        if (side === 'a') this.playerUI = uiObj;
        else this.oppUI = uiObj;
    }

    processExchangeUI(exchange) {
        let knockdownTriggered = false;

        if (exchange.commentary) {
            this.logText.setText(exchange.commentary.toUpperCase());
            this.logText.setColor(COLORS.STR_WHITE);
        }

        exchange.events.forEach((e) => {
            if (e.type === 'HIT') {
                if (e.damage > 5) this.logText.setColor(e.fighter === 'a' ? '#ff4444' : '#4444ff');
                if (e.damage > 20) this.cameras.main.shake(100, 0.005);
            } else if (e.type === 'INJURY') {
                this.cameras.main.shake(100, 0.01);
                this.logText.setColor(COLORS.STR_GOLD);
            } else if (e.type === 'KNOCKDOWN') {
                this.cameras.main.shake(300, 0.02);
                this.logText.setColor(COLORS.RED);
                
                // Update UI knockdown counter immediately
                if (e.fighter === 'a') {
                    this.playerUI.kdText.setText(`KDs: ${this.fightState.a.kds}`);
                } else {
                    this.oppUI.kdText.setText(`KDs: ${this.fightState.b.kds}`);
                }

                this.performKnockdownCount(exchange.isKO);
                knockdownTriggered = true;
            }
        });

        if (exchange.snapshots) {
            const s = exchange.snapshots;
            
            // Player Updates
            const pW = Math.max(0, (s.a.health / this.playerUI.maxH) * this.playerUI.barW);
            this.playerUI.hBar.clear().fillStyle(this.playerUI.color, 1).fillRoundedRect(0, 20, pW, 12, 6);
            this.playerUI.hValTxt.setText(`${Math.floor(s.a.health)}/${Math.floor(this.playerUI.maxH)}`);
            
            const pS = Math.max(0, (s.a.stamina / this.playerUI.maxS) * this.playerUI.barW);
            this.playerUI.sBar.clear().fillStyle(0x00ffcc, 1).fillRoundedRect(0, 62, pS, 12, 6);
            this.playerUI.sValTxt.setText(`${Math.floor(s.a.stamina)}/${Math.floor(this.playerUI.maxS)}`);

            const pM = Math.min(1, (s.a.momentum || 0) / 100) * this.playerUI.barW;
            this.playerUI.momBar.clear().fillStyle(COLORS.ACCENT, 1).fillRect(0, 258, pM, 4);
            
            // Opponent Updates
            const oW = Math.max(0, (s.b.health / this.oppUI.maxH) * this.oppUI.barW);
            this.oppUI.hBar.clear().fillStyle(this.oppUI.color, 1).fillRoundedRect(0, 20, oW, 12, 6);
            this.oppUI.hValTxt.setText(`${Math.floor(s.b.health)}/${Math.floor(this.oppUI.maxH)}`);
            
            const oS = Math.max(0, (s.b.stamina / this.oppUI.maxS) * this.oppUI.barW);
            this.oppUI.momBar.clear().fillStyle(COLORS.ACCENT, 1).fillRect(0, 258, Math.min(1, (s.b.momentum || 0) / 100) * this.oppUI.barW, 4);

            this.oppUI.sBar.clear().fillStyle(0x00ffcc, 1).fillRoundedRect(0, 62, oS, 12, 6);
            this.oppUI.sValTxt.setText(`${Math.floor(s.b.stamina)}/${Math.floor(this.oppUI.maxS)}`);

            ['Jab', 'Straight', 'Hook', 'Uppercut', 'Overhand'].forEach(type => {
                if (s.a.totalLanded) {
                    this.playerUI.detailedStats[`txt${type}`].setText(`${s.a.totalLanded[type]} / ${s.a.totalPunches[type]}`);
                    this.oppUI.detailedStats[`txt${type}`].setText(`${s.b.totalLanded[type]} / ${s.b.totalPunches[type]}`);
                }
            });
        }

        return knockdownTriggered;
    }

    performKnockdownCount(isKO) {
        this.isCounting = true;
        this.isPaused = true;
        
        let count = 1;
        const maxCount = 8;
        const interval = 800 / this.gameSpeedMultiplier;

        const baseCommentary = this.logText.text;

        const iterateCount = () => {
            if (count <= maxCount) {
                const countString = Array.from({ length: count }, (_, i) => i + 1).join(', ');
                this.logText.setText(`${baseCommentary}\n${countString}...`);
                this.logText.setColor(COLORS.STR_GOLD);
                
                count++;
                this.time.delayedCall(interval, iterateCount);
            } else {
                this.isCounting = false;
                if (isKO) {
                    // Commentary finishes speaking (already done by the loop), then progression screen
                    this.time.delayedCall(1000 / this.gameSpeedMultiplier, () => {
                        this.endFight();
                    });
                } else {
                    this.isPaused = false;
                }
            }
        };

        // Start the sequence after a brief pause for the "DOWN HE GOES" to be read
        this.time.delayedCall(1000 / this.gameSpeedMultiplier, iterateCount);
    }

    createStaticUI(width, height) {
        const header = this.add.container(0, 0);
        const headerBg = this.add.graphics().fillStyle(0x111111, 1).fillRoundedRect(width * 0.02, 10, width * 0.96, 90, 15);
        header.add(headerBg);
        
        this.roundText = this.add.text(width / 2, 35, 'PRE-FIGHT', {
            fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, letterSpacing: 2
        }).setOrigin(0.5);
        
        this.clockText = this.add.text(width / 2, 70, '3:00', {
            fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE, fontWeight: 'bold'
        }).setOrigin(0.5);

        const scoreBtn = this.add.graphics().fillStyle(0x222222, 1).fillRoundedRect(width * 0.35, 105, width * 0.3, 24, 12);
        const scoreTxt = this.add.text(width / 2, 117, 'VIEW SCORECARD', { fontSize: '10px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
        const scoreZone = this.add.rectangle(width / 2, 117, width * 0.3, 24, 0, 0).setInteractive({ useHandCursor: true });
        scoreZone.on('pointerdown', () => this.showScorecard());
        header.add([scoreBtn, scoreTxt, scoreZone]);
        
        header.add(this.add.text(width * 0.05, 30, this.fighter.name.toUpperCase(), { fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }));
        header.add(this.add.text(width * 0.95, 30, this.opponent.name.toUpperCase(), { fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
        
        this.createFighterDisplay(width * 0.05, 140, 'a');
        this.createFighterDisplay(width * 0.52, 140, 'b');

        this.logContainer = this.add.container(width / 2, height - 100);
        const logBg = this.add.graphics().fillStyle(0x000000, 0.8).fillRoundedRect(-width * 0.48, -45, width * 0.96, 90, 10).lineStyle(1, 0x444444, 1).strokeRoundedRect(-width * 0.48, -45, width * 0.96, 90, 10);
        this.logText = this.add.text(0, 0, 'FIGHT BEGINS...', {
            fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE, align: 'center', wordWrap: { width: width * 0.9 }
        }).setOrigin(0.5);
        this.logContainer.add([logBg, this.logText]);

        this.runningScoreText = this.add.text(width / 2, 135, 'SCORE: 0 - 0', {
            fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, fontWeight: 'bold'
        }).setOrigin(0.5);
    }

    createStatsComparison(width, height) {
        this.statsComparison = this.add.container(0, 0);
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.95).setOrigin(0).setInteractive();
        const card = this.add.graphics().fillStyle(0x1a1a1a, 1).fillRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.75, 20).lineStyle(2, COLORS.GOLD, 1).strokeRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.75, 20);
        this.statsComparison.add([overlay, card]);

        this.statsComparison.add(this.add.text(width / 2, height * 0.15, 'TALE OF THE TAPE', { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));

        const getRecordStr = (f) => `${f.record.wins}-${f.record.losses}-${f.record.draws}`;
        const statsY = height * 0.25;
        this.statsComparison.add(this.add.text(width * 0.1, statsY, this.fighter.name.toUpperCase(), { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }));
        this.statsComparison.add(this.add.text(width * 0.9, statsY, this.opponent.name.toUpperCase(), { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
        this.statsComparison.add(this.add.text(width * 0.1, statsY + 30, getRecordStr(this.fighter), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
        this.statsComparison.add(this.add.text(width * 0.9, statsY + 30, getRecordStr(this.opponent), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0));

        const startBtn = this.add.graphics().fillStyle(0xFFFF00, 1).fillRoundedRect(width * 0.25, height * 0.78, width * 0.5, 50, 25);
        const startTxt = this.add.text(width / 2, height * 0.78 + 25, 'START FIGHT', { fontSize: '20px', fontFamily: FONTS.TITLE, color: '#000', fontWeight: 'bold' }).setOrigin(0.5);
        const startZone = this.add.rectangle(width / 2, height * 0.78 + 25, width * 0.5, 50, 0, 0).setInteractive({ useHandCursor: true });
        
        startZone.on('pointerdown', () => {
            this.statsComparison.destroy();
            this.renderShoutSelection();
        });

        this.statsComparison.add([startBtn, startTxt, startZone]);
    }

    endFight() {
        if (this.isEnding) return;
        this.isEnding = true;
        this.isPaused = true;

        import('../entities/FightSimulator.js').then(module => {
            module.fightSimulator.finalizeDecision(this.fightState);
            const winId = this.fightState.winnerId;
            const method = this.fightState.method;
            let winnerName = "DRAW";
            if (winId === 'PLAYER') winnerName = this.fighter.name.toUpperCase();
            else if (winId === 'OPPONENT') winnerName = this.opponent.name.toUpperCase();

            const methodLong = { 'KO': 'KNOCKOUT', 'TKO': 'TECHNICAL KNOCKOUT', 'DQ': 'DISQUALIFICATION', 'DRAW': 'DRAW', 'DECISION': 'DECISION' }[method] || method;
            
            let finishDetail = "";
            if (['KO', 'TKO', 'DQ'].includes(method)) {
                const round = this.fightState.lastRound;
                const timeRemaining = this.fightState.timeOfFinish || 0;
                const timeElapsed = 180 - timeRemaining;
                const mins = Math.floor(timeElapsed / 60);
                const secs = Math.floor(timeElapsed % 60);
                finishDetail = `\nROUND ${round} @ ${mins}:${secs.toString().padStart(2, '0')}`;
            }

            const fullMethodDisplay = methodLong + finishDetail;
            this.logText.setText(`FIGHT OVER!\n${winnerName} via ${fullMethodDisplay}`);
            this.logText.setColor(COLORS.STR_GOLD);

            if (method === 'DRAW') {
                this.time.delayedCall(3000, () => {
                    this.triggerSituationalCommentary('DRAW');
                });
            }

            import('../entities/FighterManager.js').then(fm => {
                fm.fighterManager.applyPlayerFightOutcome(this.fightState, this.fighter, this.opponent, this.fightEvent);
                this.time.delayedCall(2000, () => this.showPostFightSummary(winnerName, fullMethodDisplay));
            });
        });
    }

    showPostFightSummary(winnerName, method) {
        const { width, height } = this.scale;
        this.summaryContainer = this.add.container(0, 0);
        this.summaryContainer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.95).setOrigin(0).setInteractive());
        const card = this.add.graphics().fillStyle(0x1a1a1a, 1).fillRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.75, 20).lineStyle(2, COLORS.GOLD, 1).strokeRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.75, 20);
        this.summaryContainer.add(card);

        this.summaryContainer.add(this.add.text(width / 2, height * 0.15, 'OFFICIAL FIGHT SUMMARY', { fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const summaryText = `${winnerName}\n${method}`;
        this.summaryContainer.add(this.add.text(width / 2, height * 0.22, summaryText, { fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE, align: 'center' }).setOrigin(0.5));

        // Scorecard display in summary
        const scoreLabel = this.fightState.isKO ? 'SCORES AT TIME OF STOPPAGE' : 'OFFICIAL JUDGES SCORES';
        this.summaryContainer.add(this.add.text(width / 2, height * 0.32, scoreLabel, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const scorecard = this.fightState.scoreString || "PENDING";
        this.summaryContainer.add(this.add.text(width / 2, height * 0.37, scorecard, { fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));

        const viewFullBtn = this.add.graphics().fillStyle(0x333333, 1).fillRoundedRect(width * 0.3, height * 0.45, width * 0.4, 40, 20);
        const viewFullTxt = this.add.text(width / 2, height * 0.45 + 20, 'VIEW FULL SCORECARD', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
        const viewFullZone = this.add.rectangle(width / 2, height * 0.45 + 20, width * 0.4, 40, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showScorecard());
        this.summaryContainer.add([viewFullBtn, viewFullTxt, viewFullZone]);

        const returnBtn = this.add.graphics().fillStyle(0xFFFF00, 1).fillRoundedRect(width * 0.25, height * 0.78, width * 0.5, 50, 25);
        const returnTxt = this.add.text(width / 2, height * 0.78 + 25, 'RETURN TO OFFICE', { fontSize: '18px', fontFamily: FONTS.TITLE, color: '#000', fontWeight: 'bold' }).setOrigin(0.5);
        const returnZone = this.add.rectangle(width / 2, height * 0.78 + 25, width * 0.5, 50, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('ManagementScene'));
        this.summaryContainer.add([returnBtn, returnTxt, returnZone]);
    }

    showScorecard() {
        const { width, height } = this.scale;
        const overlay = this.add.container(0, 0).setDepth(2000);
        overlay.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0).setInteractive());
        const card = this.add.graphics().fillStyle(0x1a1a1a, 1).fillRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.8, 20).lineStyle(2, COLORS.GOLD, 1).strokeRoundedRect(width * 0.05, height * 0.1, width * 0.9, height * 0.8, 20);
        overlay.add(card);
        overlay.add(this.add.text(width / 2, height * 0.15, 'JUDGES SCORECARDS', { fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        let y = height * 0.22;
        this.fightState.roundScores.forEach((scores, i) => {
            let rowText = `ROUND ${i+1}: `;
            scores.forEach((s, j) => rowText += `[J${j+1}: ${s[0]}-${s[1]}] `);
            overlay.add(this.add.text(width * 0.1, y, rowText, { fontSize: '12px', fontFamily: FONTS.TITLE, color: '#fff' }));
            y += 20;
        });

        const closeBtn = this.add.text(width / 2, height * 0.85, 'CLOSE', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => overlay.destroy());
        overlay.add(closeBtn);
    }

    triggerSituationalCommentary(type) {
        const promo = promotionManager.promotion;
        let phrases = COMMENTARY_PHRASES[type];
        if (!phrases || phrases.length === 0) return;

        let phrase = phrases[Math.floor(Math.random() * phrases.length)];
        
        // Format phrase
        phrase = phrase.replace(/{weightDivision}/g, this.fighter.weightDivision || 'FIGHT');
        phrase = phrase.replace(/{promotionName}/g, promo.name || 'THE PROMOTION');
        phrase = phrase.replace(/{promotionSlogan}/g, promo.slogan || 'OUR SLOGAN');

        this.logText.setText(phrase.toUpperCase());
        this.logText.setColor(COLORS.STR_WHITE);
    }
}
