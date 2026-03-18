import Phaser from 'phaser';
import { promotionManager } from '../entities/PromotionManager.js';
import { calendarManager } from '../entities/CalendarManager.js';
import { fighterManager } from '../entities/FighterManager.js';
import { messageManager } from '../entities/MessageManager.js';
import { 
    BOXING_STYLE_DATA, BOXING_STYLES, COLORS, FONTS, REPUTATION_STATUS_LABELS, WEIGHT_DIVISIONS, 
    CHAMPIONSHIPS, ASSETS, FINANCIAL_DATA, PRESS_CONFERENCE_CHOICES, LOGO_OPTIONS,
    FIGHTER_PERSONALITIES, PRESS_CONFERENCE_QUESTIONS, INJURY_DATA, PROMOTION_ASSETS,
    NATIONALITIES, COLOR_SCHEMES
} from '../constants.js';
import { fightSimulator } from '../entities/FightSimulator.js';
import { assetManager } from '../entities/GymManager.js';
import { saveManager } from '../entities/SaveManager.js';
import { instanceManager } from '../entities/InstanceManager.js';

export default class ManagementScene extends Phaser.Scene {
    constructor() {
        super('ManagementScene');
        this.activeTab = 'DASHBOARD';
        this.selectedFighterId = null;
        this.selectedFighterTab = 'BIO'; 
        this.messageDot = null;
        this.opponentSelectionMode = false;
        this.negotiationMode = false; 
        this.negotiationData = null; 
        this.dashboardSubView = 'MAIN'; // MAIN, OFFICE, RANKINGS, FIGHT_READY
        this.schedulingFighter = null;
        this.activeFightData = null; // Clear fight data on init
        this.creationMode = false;
        this.creationStep = 1;
        this.creationData = {};
        
        // Activity Tracking
        this.weeklyPromotions = []; // [{type, fighterId}]
        this.fighterTraining = {}; // {fighterId: type}

        this.assetSubView = 'STORE'; // STORE, VAULT
        this.optionsOpen = false;
        this.optionsSubView = 'MAIN'; // MAIN, SAVE, LOAD, COLORS
    }

    create() {
        // Load Color Scheme
        const savedScheme = localStorage.getItem('boxing_color_scheme');
        if (savedScheme && COLOR_SCHEMES[savedScheme]) {
            const scheme = COLOR_SCHEMES[savedScheme];
            COLORS.GOLD = scheme.primary;
            COLORS.STR_GOLD = scheme.strPrimary;
            COLORS.ACCENT = scheme.secondary;
            COLORS.STR_ACCENT = scheme.strSecondary;
        }

        calendarManager.load();
        fighterManager.initialize();
        messageManager.load();
        const { width, height } = this.scale;
        
        // Background
        this.add.rectangle(0, 0, width, height, 0x121212).setOrigin(0);

        // Header
        this.header = this.add.container(0, 0);
        const headerBg = this.add.rectangle(0, 0, width, 80, 0x1A1A1A).setOrigin(0);
        const title = this.add.text(width / 2, 40, promotionManager.promotion.name.toUpperCase(), {
            fontSize: '28px',
            fontFamily: FONTS.TITLE,
            color: COLORS.STR_GOLD,
            letterSpacing: 2
        }).setOrigin(0.5);

        // Options Gear Button
        const gearIcon = this.add.image(width - 40, 40, 'logo-gear')
            .setDisplaySize(32, 32)
            .setTint(COLORS.GOLD)
            .setInteractive({ useHandCursor: true });
        
        gearIcon.on('pointerdown', () => {
            this.optionsOpen = !this.optionsOpen;
            this.optionsSubView = 'MAIN';
            this.renderActiveTab();
        });

        this.header.add([headerBg, title, gearIcon]);

        // Content Area
        this.contentContainer = this.add.container(0, 80);

        // Bottom Navigation
        this.createTabs();

        this.renderActiveTab();

        // Initial Unique Instance Trigger
        instanceManager.triggerInitialInstance();

        // Ensure layout is crisp after the scale has settled or if it changes
        this.scale.on('resize', () => {
            const { width: newWidth, height: newHeight } = this.scale;
            headerBg.width = newWidth;
            title.x = newWidth / 2;
            this.renderActiveTab();
        });
        
        // One-time forced re-render to catch any font load or scaling delay
        this.time.delayedCall(50, () => {
            this.renderActiveTab();
        });
    }

    createTabs() {
        const { width, height } = this.scale;
        const tabs = ['DASHBOARD', 'ROSTER', 'ASSETS', 'PRE-FIGHT', 'MESSAGES', 'MARKET'];
        const tabWidth = width / tabs.length;
        
        tabs.forEach((tab, i) => {
            const x = (i * tabWidth) + (tabWidth / 2);
            const y = height - 50;
            
            const btn = this.add.rectangle(x, y, tabWidth, 100, 0x1A1A1A).setInteractive({ useHandCursor: true });
            
            const indicator = this.add.rectangle(x, height - 98, tabWidth * 0.8, 4, 0xFFD700)
                .setVisible(this.activeTab === tab);

            const labelText = tab === 'PRE-FIGHT' ? 'PRE-FIGHT' : tab;
            const txt = this.add.text(x, y, labelText, {
                fontSize: tab === 'PRE-FIGHT' ? '12px' : '14px',
                fontFamily: FONTS.TITLE,
                fontWeight: '900',
                color: this.activeTab === tab ? COLORS.STR_GOLD : '#888888',
                letterSpacing: 1
            }).setOrigin(0.5);

            // Notification dot for messages
            if (tab === 'MESSAGES') {
                const dot = this.add.circle(x + 20, y - 15, 4, 0xFF0000).setVisible(messageManager.hasNew);
                this.messageDot = dot;
            }

            // Notification dot for pre-fight
            if (tab === 'PRE-FIGHT') {
                const dot = this.add.circle(x + 25, y - 15, 4, 0x00D1FF).setVisible(calendarManager.needsAttention());
                this.preFightDot = dot;
            }

            btn.on('pointerdown', () => {
                this.selectedFighterId = null;
                this.opponentSelectionMode = false;
                this.negotiationMode = false;
                this.optionsOpen = false; // Close settings/save menu when switching tabs
                this.creationMode = false; // Exit creation if switching tabs
                this.assetSubView = 'STORE';
                this.activeTab = tab;
                if (tab === 'DASHBOARD') this.dashboardSubView = 'MAIN';
                
                if (tab === 'MESSAGES') {
                    messageManager.hasNew = false;
                    if (this.messageDot) this.messageDot.setVisible(false);
                }
                this.renderActiveTab();
                
                // Update tabs manually
                this.children.list.forEach(child => {
                    if (child.type === 'Text' && tabs.includes(child.text)) {
                        child.setColor(child.text === tab ? COLORS.STR_GOLD : '#888888');
                    }
                    if (child.type === 'Rectangle' && child.height === 4) {
                        child.setVisible(false);
                    }
                });
                indicator.setVisible(true);
            });
        });
    }

    renderActiveTab() {
        this.updateNotificationDots();
        this.contentContainer.removeAll(true);
        
        // Ensure UI is unlocked on re-render
        this.input.enabled = true;
        this.isEditingField = false;

        if (this.optionsOpen) {
            this.renderOptions();
        } else if (this.negotiationMode) {
            this.renderNegotiationView();
        } else if (this.creationMode) {
            this.renderFighterCreation();
        } else if (this.opponentSelectionMode) {
            this.renderOpponentSelection(this.schedulingFighter);
        } else if (this.selectedFighterId) {
            // Ensure selectedFighterTab is BIO by default for newly selected fighters 
            // unless it's explicitly set to something else before this call (like PRESS)
            if (!this.selectedFighterTab) this.selectedFighterTab = 'BIO';
            this.renderFighterProfile(this.selectedFighterId);
        } else {
            switch(this.activeTab) {
                case 'DASHBOARD': this.renderDashboard(); break;
                case 'ROSTER': this.renderRoster(); break;
                case 'PRE-FIGHT': this.renderPreFight(); break;
                case 'ASSETS': this.renderAssets(); break;
                case 'MESSAGES': this.renderMessages(); break;
                case 'MARKET': this.renderMarket(); break;
            }
        }
    }

    updateNotificationDots() {
        if (this.messageDot) {
            this.messageDot.setVisible(messageManager.hasNew);
        }
        if (this.preFightDot) {
            this.preFightDot.setVisible(calendarManager.needsAttention());
        }
    }

    renderOptions() {
        const { width, height } = this.scale;
        
        const titleText = this.optionsSubView === 'MAIN' ? 'SETTINGS' : (this.optionsSubView === 'SAVE' ? 'SAVE GAME' : (this.optionsSubView === 'LOAD' ? 'LOAD GAME' : 'COLOR SCHEME'));

        this.contentContainer.add(this.add.text(width / 2, 40, titleText, {
            fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        if (this.optionsSubView === 'MAIN') {
            const menuItems = [
                { label: 'SAVE GAME', sub: 'SAVE' },
                { label: 'LOAD GAME', sub: 'LOAD' },
                { label: 'NEW GAME', action: () => {
                    this.showStatusModal(
                        'RESET PROMOTION',
                        'ARE YOU SURE YOU WANT TO START A NEW GAME? ALL CURRENT PROGRESS WILL BE LOST.',
                        COLORS.RED,
                        'CONFIRM_RESET'
                    );
                }},
                { label: 'COLOR SCHEME', sub: 'COLORS' },
                { label: 'EXIT GAME', action: () => {
                    this.showStatusModal(
                        'EXIT TO MENU',
                        'ANY UNSAVED PROGRESS WILL BE LOST. EXIT TO MAIN MENU?',
                        COLORS.RED,
                        'CONFIRM_EXIT'
                    );
                }}
            ];

            menuItems.forEach((item, i) => {
                const y = 140 + (i * 70);
                const bg = this.add.rectangle(width / 2, y, width * 0.8, 50, 0x1A1A1A).setInteractive({ useHandCursor: true });
                const txt = this.add.text(width / 2, y, item.label, { fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
                
                bg.on('pointerdown', () => {
                    if (item.sub) {
                        this.optionsSubView = item.sub;
                        this.renderActiveTab();
                    } else if (item.action) {
                        item.action();
                    }
                });
                this.contentContainer.add([bg, txt]);
            });

            const backBtn = this.add.rectangle(width / 2, height - 150, width * 0.4, 50, COLORS.RED).setInteractive({ useHandCursor: true });
            const backTxt = this.add.text(width / 2, height - 150, 'BACK TO GAME', { fontSize: '18px', fontFamily: FONTS.TITLE, color: '#FFF' }).setOrigin(0.5);
            backBtn.on('pointerdown', () => {
                this.optionsOpen = false;
                this.renderActiveTab();
            });
            this.contentContainer.add([backBtn, backTxt]);

        } else if (this.optionsSubView === 'SAVE' || this.optionsSubView === 'LOAD') {
            const slots = [1, 2, 3];
            slots.forEach((slot, i) => {
                const y = 140 + (i * 100);
                const meta = saveManager.getSaveMetadata(slot);
                const bg = this.add.rectangle(width / 2, y, width * 0.8, 80, 0x1A1A1A).setInteractive({ useHandCursor: true });
                
                const slotLabel = meta ? `${meta.name.toUpperCase()}` : 'EMPTY SLOT';
                const dateLabel = meta ? new Date(meta.date).toLocaleString() : '---';
                const repLabel = meta ? `REP LEVEL ${Math.floor(meta.reputation)}` : '';

                const txtSlot = this.add.text(width * 0.15, y - 20, `SLOT ${slot}`, { fontSize: '12px', fontFamily: FONTS.BODY, color: '#666' });
                const txtName = this.add.text(width * 0.15, y, slotLabel, { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
                const txtDate = this.add.text(width * 0.85, y + 15, dateLabel, { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666' }).setOrigin(1, 0.5);
                const txtRep = this.add.text(width * 0.85, y - 10, repLabel, { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0.5);

                bg.on('pointerdown', () => {
                    if (this.optionsSubView === 'SAVE') {
                        // Show brief saving indicator
                        const savingOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
                        const savingTxt = this.add.text(width / 2, height / 2, 'SAVING...', { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
                        
                        this.time.delayedCall(100, () => {
                            const result = saveManager.saveGame(slot);
                            savingOverlay.destroy();
                            savingTxt.destroy();
                            
                            if (result.success) {
                                this.showStatusModal('SAVE COMPLETE', `Progress saved to Slot ${slot}.`, COLORS.GOLD);
                            } else {
                                this.showStatusModal('SAVE FAILED', result.message, COLORS.RED);
                            }
                            this.renderActiveTab();
                        });
                    } else {
                        if (!meta) return;
                        if (confirm(`Load game from Slot ${slot}? Current progress will be lost.`)) {
                            saveManager.loadGame(slot);
                            this.optionsOpen = false;
                            this.renderActiveTab();
                        }
                    }
                });
                this.contentContainer.add([bg, txtSlot, txtName, txtDate, txtRep]);
            });

            const backBtn = this.add.text(width / 2, height - 150, 'BACK', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            backBtn.on('pointerdown', () => { this.optionsSubView = 'MAIN'; this.renderActiveTab(); });
            this.contentContainer.add(backBtn);

        } else if (this.optionsSubView === 'COLORS') {
            const schemes = Object.keys(COLOR_SCHEMES);
            schemes.forEach((key, i) => {
                const y = 140 + (i * 70);
                const scheme = COLOR_SCHEMES[key];
                const bg = this.add.rectangle(width / 2, y, width * 0.8, 50, 0x1A1A1A).setInteractive({ useHandCursor: true });
                const txt = this.add.text(width / 2, y, key.replace('_', ' '), { fontSize: '20px', fontFamily: FONTS.TITLE, color: scheme.strPrimary }).setOrigin(0.5);
                
                bg.on('pointerdown', () => {
                    this.switchColorScheme(key);
                });
                this.contentContainer.add([bg, txt]);
            });

            const backBtn = this.add.text(width / 2, height - 150, 'BACK', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            backBtn.on('pointerdown', () => { this.optionsSubView = 'MAIN'; this.renderActiveTab(); });
            this.contentContainer.add(backBtn);
        }
    }

    switchColorScheme(schemeKey) {
        const scheme = COLOR_SCHEMES[schemeKey];
        if (!scheme) return;

        // Update COLORS object
        COLORS.GOLD = scheme.primary;
        COLORS.STR_GOLD = scheme.strPrimary;
        COLORS.ACCENT = scheme.secondary;
        COLORS.STR_ACCENT = scheme.strSecondary;

        // Persist color scheme
        localStorage.setItem('boxing_color_scheme', schemeKey);

        // Force a full re-render
        this.scene.restart();
    }

    renderAssets() {
        const { width, height } = this.scale;
        
        this.contentContainer.add(this.add.text(width / 2, 30, 'PROMOTION ASSETS', {
            fontSize: '32px',
            fontFamily: FONTS.TITLE,
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const promo = promotionManager.promotion;
        this.contentContainer.add(this.add.text(width / 2, 60, `FUNDS: £${promo.cash.toLocaleString()}`, {
            fontSize: '16px',
            fontFamily: FONTS.TITLE,
            color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        // Sub-tabs: Simplified to 3 core management views
        const subTabs = ['STORE', 'VAULT', 'REVENUE'];
        const subTabWidth = (width * 0.9) / subTabs.length;
        
        subTabs.forEach((tab, i) => {
            const x = (width * 0.05) + (i * subTabWidth) + (subTabWidth / 2);
            const isSelected = this.assetSubView === tab;
            const btn = this.add.rectangle(x, 95, subTabWidth - 10, 42, isSelected ? 0x222222 : 0x111111)
                .setInteractive({ useHandCursor: true });
            
            let label = tab;
            if (tab === 'VAULT') label = 'ASSETS';

            const txt = this.add.text(x, 95, label, {
                fontSize: '14px',
                fontFamily: FONTS.TITLE,
                fontWeight: 'bold',
                color: isSelected ? COLORS.STR_ACCENT : '#666666',
                letterSpacing: 1
            }).setOrigin(0.5);
            
            this.contentContainer.add([btn, txt]);
            btn.on('pointerdown', () => {
                this.assetSubView = tab;
                this.renderActiveTab();
            });
        });

        const startY = 130;
        const spacing = 120;
        const cardWidth = width * 0.9;
        const cardHeight = 110;

        if (this.assetSubView === 'STORE') {
            const buyable = PROMOTION_ASSETS.filter(a => !assetManager.isOwned(a.id) && promo.reputation >= a.level);
            
            if (buyable.length === 0) {
                this.contentContainer.add(this.add.text(width / 2, 200, 'NO NEW ASSETS AVAILABLE AT YOUR CURRENT LEVEL.', {
                    fontSize: '14px', fontFamily: FONTS.BODY, color: '#666', align: 'center', wordWrap: { width: width * 0.8 }
                }).setOrigin(0.5));
            } else {
                buyable.forEach((asset, i) => {
                    const y = startY + (i * spacing);
                    const card = this.add.graphics();
                    card.fillStyle(0x1F1F1F, 1);
                    card.fillRoundedRect(width * 0.05, y, cardWidth, cardHeight, 15);
                    this.contentContainer.add(card);

                    this.contentContainer.add(this.add.text(width * 0.1, y + 15, asset.name.toUpperCase(), {
                        fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
                    }));

                    this.contentContainer.add(this.add.text(width * 0.1, y + 45, asset.description, {
                        fontSize: '12px', fontFamily: FONTS.BODY, color: '#AAAAAA', wordWrap: { width: cardWidth * 0.6 }
                    }));

                    const canAfford = promo.cash >= asset.cost;
                    const buyBtnContainer = this.add.container(width * 0.8, y + 55);
                    
                    const btnGfx = this.add.graphics();
                    const normalColor = canAfford ? COLORS.ACCENT : 0x333333;
                    
                    const drawBtn = (color, strokeWidth) => {
                        btnGfx.clear();
                        btnGfx.fillStyle(0x000000, 1);
                        btnGfx.lineStyle(strokeWidth, color, 1);
                        btnGfx.fillRoundedRect(-60, -16, 120, 32, 6);
                        btnGfx.strokeRoundedRect(-60, -16, 120, 32, 6);
                    };
                    drawBtn(normalColor, 1.5);
                    
                    const btnTxt = this.add.text(0, 0, `BUY: £${asset.cost.toLocaleString()}`, {
                        fontSize: '11px', 
                        fontFamily: FONTS.TITLE, 
                        color: canAfford ? COLORS.STR_WHITE : '#666666',
                        fontWeight: 'bold'
                    }).setOrigin(0.5);

                    const btnHit = this.add.rectangle(0, 0, 120, 32, 0x000000, 0)
                        .setInteractive({ useHandCursor: canAfford });

                    buyBtnContainer.add([btnGfx, btnTxt, btnHit]);
                    this.contentContainer.add(buyBtnContainer);

                    if (canAfford) {
                        btnHit.on('pointerover', () => drawBtn(0xFFFFFF, 2));
                        btnHit.on('pointerout', () => drawBtn(normalColor, 1.5));

                        btnHit.on('pointerdown', () => {
                            this.tweens.add({
                                targets: buyBtnContainer,
                                scale: 0.95,
                                duration: 50,
                                yoyo: true,
                                onComplete: () => {
                                    const result = assetManager.buyAsset(asset.id);
                                    if (result.success) {
                                        this.renderActiveTab();
                                    } else {
                                        this.showAssetError(result.message);
                                    }
                                }
                            });
                        });
                    }
                });
            }
        } else if (this.assetSubView === 'VAULT') {
            // VAULT
            const owned = PROMOTION_ASSETS.filter(a => assetManager.isOwned(a.id));
            if (owned.length === 0) {
                this.contentContainer.add(this.add.text(width / 2, 200, 'YOU DO NOT OWN ANY ASSETS YET.', {
                    fontSize: '14px', fontFamily: FONTS.BODY, color: '#666'
                }).setOrigin(0.5));
            } else {
                owned.forEach((asset, i) => {
                    const y = startY + (i * 95);
                    const card = this.add.graphics();
                    card.fillStyle(0x1A1A1A, 1);
                    card.fillRoundedRect(width * 0.05, y, cardWidth, 85, 15);
                    this.contentContainer.add(card);

                    this.contentContainer.add(this.add.text(width * 0.1, y + 15, asset.name.toUpperCase(), {
                        fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
                    }));
                    this.contentContainer.add(this.add.text(width * 0.1, y + 40, asset.description, {
                        fontSize: '11px', fontFamily: FONTS.BODY, color: '#888', wordWrap: { width: cardWidth * 0.8 }
                    }));
                });
            }
        } else {
            // REVENUE BREAKDOWN
            const owned = PROMOTION_ASSETS.filter(a => assetManager.isOwned(a.id));
            const revenueAssets = owned.filter(a => a.type.includes('CASH') || a.type.includes('MERCH') || a.type.includes('TICKET'));
            
            this.contentContainer.add(this.add.text(width * 0.1, startY, 'ACTIVE INCOME STREAMS', {
                fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_ACCENT
            }));

            if (revenueAssets.length === 0) {
                this.contentContainer.add(this.add.text(width / 2, startY + 100, 'NO REVENUE GENERATING ASSETS OWNED.', {
                    fontSize: '14px', fontFamily: FONTS.BODY, color: '#666'
                }).setOrigin(0.5));
            } else {
                revenueAssets.forEach((asset, i) => {
                    const y = startY + 40 + (i * 50);
                    const card = this.add.graphics().fillStyle(0x111111, 1).fillRoundedRect(width * 0.05, y - 20, width * 0.9, 45, 10);
                    this.contentContainer.add(card);

                    this.contentContainer.add(this.add.text(width * 0.1, y, asset.name.toUpperCase(), {
                        fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
                    }).setOrigin(0, 0.5));

                    let valueStr = "ACTIVE";
                    if (asset.type === 'WEEKLY_CASH') valueStr = `+£${asset.amount}/WEEK`;
                    if (asset.type === 'MONTHLY_CASH') valueStr = `+£${asset.amount}/MONTH`;
                    if (asset.type === 'YEARLY_CASH') valueStr = `+£${asset.amount}/YEAR`;
                    if (asset.type.includes('MOD')) valueStr = `+${Math.round((asset.amount - 1) * 100)}% BOOST`;

                    this.contentContainer.add(this.add.text(width * 0.9, y, valueStr, {
                        fontSize: '14px', fontFamily: FONTS.TITLE, color: '#00FFCC'
                    }).setOrigin(1, 0.5));
                });
            }
        }
    }

    showAssetError(msg) {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();
        const popup = this.add.container(width / 2, height / 2);
        
        const bg = this.add.rectangle(0, 0, 320, 160, 0x1A1A1A).setStrokeStyle(2, COLORS.GOLD);
        const txt = this.add.text(0, -20, msg, {
            fontSize: '16px', fontFamily: FONTS.BODY, color: '#FFF', align: 'center', wordWrap: { width: 280 }
        }).setOrigin(0.5);
        
        const closeBtn = this.add.rectangle(0, 40, 120, 35, COLORS.GOLD).setInteractive({ useHandCursor: true });
        const closeTxt = this.add.text(0, 40, 'OK', { fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000' }).setOrigin(0.5);
        
        closeBtn.on('pointerdown', () => {
            overlay.destroy();
            popup.destroy();
        });

        popup.add([bg, txt, closeBtn, closeTxt]);
    }

    renderDashboard() {
        const { width, height } = this.scale;
        
        if (this.dashboardSubView === 'OFFICE') {
            this.renderOffice();
            return;
        }
        if (this.dashboardSubView === 'RANKINGS') {
            this.renderRankings();
            return;
        }
        if (this.dashboardSubView === 'FIGHT_READY') {
            this.renderFightReady();
            return;
        }
        if (this.dashboardSubView === 'FINANCE') {
            this.renderFinance();
            return;
        }
        if (this.dashboardSubView === 'HISTORY') {
            this.renderPromotionHistory();
            return;
        }

        // Check for upcoming fight this week. If so, prioritize the Fight Week view.
        const nextFight = calendarManager.getNextFightEvent();
        if (nextFight && this.dashboardSubView === 'MAIN') {
            this.renderFightWeekDashboard(nextFight);
            return;
        }

        const promo = promotionManager.promotion;

        this.contentContainer.add(this.add.text(width / 2, 35, 'PROMOTER DASHBOARD', {
            fontSize: '32px',
            fontFamily: FONTS.TITLE,
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const currentDateStr = calendarManager.currentDate.toLocaleDateString('en-GB', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        this.contentContainer.add(this.add.text(width / 2, 65, currentDateStr.toUpperCase(), {
            fontSize: '14px',
            fontFamily: FONTS.TITLE,
            color: COLORS.STR_GOLD,
            letterSpacing: 1
        }).setOrigin(0.5));

        // Stats Card
        const card = this.add.graphics();
        card.fillStyle(0x1F1F1F, 1);
        card.fillRoundedRect(width * 0.05, 95, width * 0.9, 140, 15);
        this.contentContainer.add(card);

        const stats = [
            { label: 'AVAILABLE CASH', value: `£${promo.cash.toLocaleString()}` },
            { label: 'LOCATION', value: promo.location.city.toUpperCase() },
            { label: 'CURRENT REPUTATION', value: `LEVEL ${Math.floor(promo.reputation || 1)}` }
        ];

        stats.forEach((s, i) => {
            const y = 130 + (i * 40);
            this.contentContainer.add(this.add.text(width * 0.1, y, s.label, {
                fontSize: '11px',
                fontFamily: FONTS.BODY,
                fontWeight: '900',
                color: '#666666'
            }).setOrigin(0, 0.5));

            this.contentContainer.add(this.add.text(width * 0.9, y, s.value, {
                fontSize: '18px',
                fontFamily: FONTS.TITLE,
                color: COLORS.STR_GOLD
            }).setOrigin(1, 0.5));
        });

        // Menu Options - Large Icon Grid
        const menuItems = [
            { label: 'GLOBAL\nRANKINGS', sub: 'RANKINGS', icon: 'LOGO_CROWN', color: 0x252525 },
            { label: 'PROMOTER\nOFFICE', sub: 'OFFICE', icon: 'LOGO_LION', color: 0x252525 },
            { label: 'FINANCIAL\nREPORT', sub: 'FINANCE', icon: 'LOGO_GLOVE', color: 0x1F1F1F },
            { label: 'HISTORY &\nRECORDS', sub: 'HISTORY', icon: 'LOGO_FIST', color: 0x1F1F1F }
        ];

        const btnSize = width * 0.43;
        const spacing = width * 0.04;

        menuItems.forEach((item, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = width * 0.05 + col * (btnSize + spacing);
            const y = 240 + row * (btnSize * 0.75 + spacing);
            
            const btnBg = this.add.graphics();
            btnBg.fillStyle(item.color, 1);
            btnBg.fillRoundedRect(x, y, btnSize, btnSize * 0.7, 15);
            btnBg.lineStyle(2, 0x333333, 1);
            btnBg.strokeRoundedRect(x, y, btnSize, btnSize * 0.7, 15);
            
            const iconKey = item.icon === 'LOGO_CROWN' ? 'logo-crown' : (item.icon === 'LOGO_LION' ? 'logo-lion' : (item.icon === 'LOGO_GLOVE' ? 'logo-glove' : 'logo-fist'));
            const icon = this.add.image(x + btnSize / 2, y + btnSize * 0.25, iconKey)
                .setDisplaySize(50, 50)
                .setTint(0xFFD700);

            const label = this.add.text(x + btnSize / 2, y + btnSize * 0.52, item.label, {
                fontSize: '14px',
                fontFamily: FONTS.TITLE,
                color: COLORS.STR_WHITE,
                align: 'center',
                lineSpacing: 2
            }).setOrigin(0.5);

            const zone = this.add.rectangle(x + btnSize / 2, y + (btnSize * 0.7) / 2, btnSize, btnSize * 0.7, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                if (item.sub) {
                    this.dashboardSubView = item.sub;
                    this.renderActiveTab();
                }
            });

            this.contentContainer.add([btnBg, icon, label, zone]);
        });

        // Advance Time Button - Moved further down towards navigation
        const nextBtnY = height - 200;
        const check = calendarManager.canAdvanceTime();
        
        let btnText = 'ADVANCE TO NEXT WEEK';
        let btnColor = 0xFFD700;
        let action = () => this.handleAdvanceTime();

        // Check for upcoming fight this week (before checking obligations for button prioritization)
        if (!check.canAdvance) {
            if (check.reason === 'PRESS') {
                btnText = 'START PRESS CONFERENCE';
                btnColor = 0x00D1FF; // Cyan for media
                action = () => {
                    this.selectedFighterId = check.fighterId;
                    this.selectedFighterTab = 'PRESS'; 
                    this.currentPressQuestionIndex = 0; 
                    this.renderActiveTab();
                };
            } else if (check.reason === 'TRAINING' || check.reason === 'PROMOTION') {
                const blockingFighter = fighterManager.getFighter(check.fighterId);
                const fighterName = blockingFighter ? blockingFighter.name.split(' ').pop().toUpperCase() : 'FIGHTER';
                btnText = `OBLIGATION: ${fighterName}`;
                btnColor = 0x00D1FF; // Cyan for prep
                action = () => {
                    this.activeTab = 'PRE-FIGHT';
                    this.preFightFighterId = check.fighterId;
                    this.renderActiveTab();
                };
            }
        } else if (nextFight) {
            // All obligations met, and there is a fight this week
            btnText = 'START FIGHT BROADCAST';
            btnColor = 0xFF4C4C; // Red for fight
        }

        const nextBtn = this.add.graphics();
        nextBtn.fillStyle(btnColor, 1);
        nextBtn.fillRoundedRect(width * 0.1, nextBtnY - 32, width * 0.8, 65, 32);
        
        const nextTxt = this.add.text(width / 2, nextBtnY, btnText, {
            fontSize: '20px',
            fontFamily: FONTS.TITLE,
            color: btnColor === 0xFFD700 || btnColor === 0x00D1FF || btnColor === 0xFFA500 || btnColor === 0xFF69B4 ? '#000000' : '#FFFFFF',
            letterSpacing: 1
        }).setOrigin(0.5);
        
        const zone = this.add.rectangle(width / 2, nextBtnY, width * 0.8, 65, 0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', action);

        this.contentContainer.add([nextBtn, nextTxt, zone]);
    }

    renderFightWeekDashboard(event) {
        const { width, height } = this.scale;
        const fighter = fighterManager.getFighter(event.fighterId);
        const opponent = event.opponent || { name: 'Unknown Opponent' };
        const check = calendarManager.canAdvanceTime();

        this.contentContainer.removeAll(true);
        
        this.contentContainer.add(this.add.text(width / 2, 40, 'FIGHT WEEK', {
            fontSize: '36px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, letterSpacing: 2
        }).setOrigin(0.5));

        const vsCard = this.add.graphics();
        vsCard.fillStyle(0x1A1A1A, 1);
        vsCard.fillRoundedRect(width * 0.05, 80, width * 0.9, 450, 15);
        vsCard.lineStyle(2, COLORS.GOLD, 0.5);
        vsCard.strokeRoundedRect(width * 0.05, 80, width * 0.9, 450, 15);
        this.contentContainer.add(vsCard);

        const titleText = event.titleFight ? `${event.titleKey} WORLD TITLE` : 'NON-TITLE BOUT';
        this.contentContainer.add(this.add.text(width / 2, 110, titleText, {
            fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        this.contentContainer.add(this.add.text(width / 2, 170, fighter.name.toUpperCase(), {
            fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        this.contentContainer.add(this.add.text(width / 2, 230, 'VS', {
            fontSize: '48px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        const opponentName = (opponent.name || 'UNKNOWN').toUpperCase();
        this.contentContainer.add(this.add.text(width / 2, 290, opponentName, {
            fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        // Location & Details
        const promo = promotionManager.promotion;
        const locationStr = `${promo.location.city}, ${promo.location.country}`.toUpperCase();
        this.contentContainer.add(this.add.text(width / 2, 350, locationStr, {
            fontSize: '16px', fontFamily: FONTS.TITLE, color: '#888888'
        }).setOrigin(0.5));

        const rounds = calendarManager.getRoundCount(fighter.reputation, event.titleFight, event.titleKey);
        this.contentContainer.add(this.add.text(width / 2, 380, `${rounds} ROUNDS - ${fighter.weightDivision.toUpperCase()}`, {
            fontSize: '14px', fontFamily: FONTS.TITLE, color: '#666666'
        }).setOrigin(0.5));

        // Start Fight Button
        const startBtnY = height - 200;
        let btnText = 'START FIGHT BROADCAST';
        let btnColor = COLORS.RED;
        let action = () => this.handleAdvanceTime();

        if (!check.canAdvance) {
            if (check.reason === 'PRESS') {
                btnText = 'START PRESS CONFERENCE';
                btnColor = COLORS.ACCENT;
                action = () => {
                    this.selectedFighterId = check.fighterId;
                    this.selectedFighterTab = 'PRESS'; 
                    this.currentPressQuestionIndex = 0; 
                    this.renderActiveTab();
                };
            } else {
                const blockingFighter = fighterManager.getFighter(check.fighterId);
                const fighterName = blockingFighter ? blockingFighter.name.split(' ').pop().toUpperCase() : 'FIGHTER';
                btnText = `OBLIGATION: ${fighterName}`;
                btnColor = COLORS.ACCENT;
                action = () => {
                    this.activeTab = 'PRE-FIGHT';
                    this.preFightFighterId = check.fighterId;
                    this.renderActiveTab();
                };
            }
        }

        const startBtn = this.add.graphics();
        startBtn.fillStyle(btnColor, 1);
        startBtn.fillRoundedRect(width * 0.1, startBtnY - 32, width * 0.8, 65, 32);
        
        const isCyan = btnColor === COLORS.ACCENT;
        const startTxt = this.add.text(width / 2, startBtnY, btnText, {
            fontSize: '18px', fontFamily: FONTS.TITLE, color: isCyan ? '#000000' : COLORS.STR_WHITE, letterSpacing: 1
        }).setOrigin(0.5);
        
        const zone = this.add.rectangle(width / 2, startBtnY, width * 0.8, 65, 0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', action);

        this.contentContainer.add([startBtn, startTxt, zone]);

        // Option to go back to regular dashboard to check other things
        const backBtn = this.add.text(width / 2, height - 120, 'VIEW REGULAR DASHBOARD', {
            fontSize: '12px', fontFamily: FONTS.TITLE, color: '#666666', fontWeight: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => {
            this.dashboardSubView = 'OFFICE'; // Redirect to office to see regular stats
            this.renderActiveTab();
        });
        this.contentContainer.add(backBtn);
    }


    handleAdvanceTime() {
        const check = calendarManager.canAdvanceTime();
        if (!check.canAdvance) {
            this.showStatusModal('ADVANCE LOCKED', check.message, COLORS.RED, check.reason, check.fighterId);
            return;
        }

        this.cameras.main.flash(500, 255, 255, 255);
        const promo = promotionManager.promotion;
        const oldDate = new Date(calendarManager.currentDate);
        
        // 0. Process Weekly Development Transitions
        fighterManager.processWeeklyDevelopment();

        // 1. Weekly Costs
        const officeWeeklyCost = FINANCIAL_DATA.OFFICE_WEEKLY_COST[promo.reputation || 1];
        const stipendTravelReduction = assetManager.getEffectValue('STIPEND_TRAVEL_REDUCTION', 1.0);
        promotionManager.addTransaction('OFFICE', 'WEEKLY OPERATING COSTS', Math.floor(officeWeeklyCost * stipendTravelReduction), 'EXPENSE', oldDate.toISOString());
        
        // Check if there is an arranged fight this week for sponsorship income
        const nextFight = calendarManager.getNextFightEvent();
        const hasFightThisWeek = nextFight && new Date(nextFight.date).getTime() === oldDate.getTime();
        
        if (hasFightThisWeek) {
            // RECURRING SPONSORSHIP INCOME - Only if a fight is arranged/taking place this week
            const baseSponsorship = (promo.reputation || 1) * 2500;
            const totalFighters = fighterManager.fighters.length;
            const fighterBonus = totalFighters * 1000;
            const sponsorshipTotal = baseSponsorship + fighterBonus;
            promotionManager.addTransaction('REVENUE', 'WEEKLY SPONSORSHIP (FIGHT WEEK)', sponsorshipTotal, 'INCOME', oldDate.toISOString());
        }

        fighterManager.fighters.forEach(f => {
            const weeklyCost = FINANCIAL_DATA.WEEKLY_FIGHTER_COST[f.reputation || 1];
            promotionManager.addTransaction('ROSTER', `WEEKLY STIPEND: ${f.name.toUpperCase()}`, Math.floor(weeklyCost * stipendTravelReduction), 'EXPENSE', oldDate.toISOString());
            
            // Sick Pay Placeholder (if recoveryUntil is set, we treat as "injured")
            if (f.recoveryUntil && new Date(f.recoveryUntil) > oldDate) {
                const sickPay = FINANCIAL_DATA.SICK_PAY[f.reputation || 1];
                promotionManager.addTransaction('SICK_PAY', `INJURY COVER: ${f.name.toUpperCase()}`, Math.floor(sickPay * stipendTravelReduction), 'EXPENSE', oldDate.toISOString());
            }
        });

        // 2. Promotional Activities
        this.weeklyPromotions.forEach(p => {
            if (p.fighterId) {
                const fighter = fighterManager.getFighter(p.fighterId);
                if (fighter && fighter.injuries && fighter.injuries.length > 0) {
                    messageManager.addMessage(
                        'ACTIVITY_CANCELLED',
                        'ACTIVITY CANCELLED: ' + fighter.name.toUpperCase(),
                        `${fighter.name.toUpperCase()} was unable to attend the ${p.name} due to their injury.`,
                        { fighterId: fighter.id },
                        calendarManager.currentDate.toISOString()
                    );
                    return; // Skip if injured
                }
                
                // Potential injury during promotion
                if (fighter && fighterManager.triggerInjury(fighter, 'PROMOTION')) {
                    return; // SUSTAINED INJURY, activity failed
                }
            }

            promotionManager.addTransaction('PROMOTION', `ACTIVITY: ${p.name}`, p.cost, 'EXPENSE', oldDate.toISOString());
            
            let successMod = 1.0;
            if (p.fighterId) {
                const fighter = fighterManager.getFighter(p.fighterId);
                if (fighter) {
                    successMod = 0.5 + (fighter.charisma / 100);
                    fighter.charisma = Math.min(100, fighter.charisma + p.charBonus);
                }
            }
            const repGain = Math.floor(p.repGain * successMod);
            promotionManager.promotion.reputation = Math.min(10, promotionManager.promotion.reputation + (repGain / 100));
        });
        this.weeklyPromotions = [];

        // 3. Fighter Training
        fighterManager.fighters.forEach(f => {
            const focus = this.fighterTraining[f.id];
            if (focus) {
                if (f.injuries && f.injuries.length > 0) {
                    messageManager.addMessage(
                        'TRAINING_CANCELLED',
                        'TRAINING CANCELLED: ' + f.name.toUpperCase(),
                        `${f.name.toUpperCase()} was unable to train this week due to their injury.`,
                        { fighterId: f.id },
                        calendarManager.currentDate.toISOString()
                    );
                    return; // Skip if injured
                }

                // Potential injury during training
                if (fighterManager.triggerInjury(f, 'TRAINING')) {
                    return; // SUSTAINED INJURY, training failed
                }

                if (focus === 'INTENSE SPARRING') {
                    f.skills.attack.offenceIQ = Math.min(99, f.skills.attack.offenceIQ + 0.2);
                    f.skills.defence.defenceIQ = Math.min(99, f.skills.defence.defenceIQ + 0.2);
                } else if (focus === 'TECHNICAL DRILLS') {
                    f.skills.attack.technique = Math.min(99, f.skills.attack.technique + 0.3);
                    f.skills.attack.timing = Math.min(99, f.skills.attack.timing + 0.15);
                } else if (focus === 'STRENGTH & POWER') {
                    f.skills.attack.power = Math.min(99, f.skills.attack.power + 0.3);
                } else if (focus === 'STAMINA BLITZ') {
                    f.skills.physical.stamina += 2;
                }
            }
        });

        const events = calendarManager.advanceTime(7);
        instanceManager.checkYearlyInstances();
        let fightReady = null;
        const fightOutcomes = [];

        events.forEach(event => {
            if (event.type === 'FIGHT') {
                const fighter = fighterManager.getFighter(event.fighterId);
                const isPlayerFighter = fighterManager.fighters.some(f => f.id === fighter.id);
                const opponent = event.opponent;
                const rounds = calendarManager.getRoundCount(fighter.reputation, event.titleFight, event.titleKey);
                
                if (!isPlayerFighter) {
                    // AI-ONLY FIGHT: Simulate and apply outcomes silently
                    const oppFighter = fighterManager.getFighter(opponent.id);
                    if (oppFighter) {
                        fighterManager.simulateQuickFight(fighter, oppFighter);
                    }
                    return;
                }

                const result = fightSimulator.simulate(fighter, opponent, rounds, promotionManager.promotion.reputation);
                
                if (!fightReady) fightReady = { result, fighter, opponent, event };
            }
        });

        promotionManager.save();
        fighterManager.save();

        if (fightOutcomes.length > 0 && !fightReady) {
             // Show fight outcomes if not going to broadcast
             fightOutcomes.forEach(o => this.showStatusModal(o.title, o.body, COLORS.GOLD));
        }

        if (fightReady) {
            this.activeFightData = fightReady;
            this.dashboardSubView = 'FIGHT_READY';
            this.renderActiveTab();
        } else {
            this.renderActiveTab();
        }
    }

    renderFightReady() {
        const { width, height } = this.scale;
        const data = this.activeFightData;
        if (!data) {
            this.dashboardSubView = 'MAIN';
            return this.renderDashboard();
        }

        this.contentContainer.removeAll(true);
        
        this.contentContainer.add(this.add.text(width / 2, 60, 'FIGHT NIGHT IS HERE', {
            fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        const vsCard = this.add.graphics();
        vsCard.fillStyle(0x1F1F1F, 1);
        vsCard.fillRoundedRect(width * 0.05, 120, width * 0.9, 200, 15);
        vsCard.lineStyle(2, COLORS.GOLD, 1);
        vsCard.strokeRoundedRect(width * 0.05, 120, width * 0.9, 200, 15);
        this.contentContainer.add(vsCard);

        this.contentContainer.add(this.add.text(width / 2, 160, data.fighter.name.toUpperCase(), { fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));
        this.contentContainer.add(this.add.text(width / 2, 210, 'VS', { fontSize: '40px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const opponentName = (data.opponent?.name || 'UNKNOWN').toUpperCase();
        this.contentContainer.add(this.add.text(width / 2, 260, opponentName, { fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));

        const startBtnY = height - 250;
        const startBtn = this.add.graphics();
        startBtn.fillStyle(0x00FF00, 1);
        startBtn.fillRoundedRect(width * 0.1, startBtnY - 32, width * 0.8, 65, 32);
        const startTxt = this.add.text(width / 2, startBtnY, 'START FIGHT BROADCAST', { fontSize: '20px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
        
        const zone = this.add.rectangle(width / 2, startBtnY, width * 0.8, 65, 0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
            // Clear fight-ready state before transitioning to prevent loop-back on return
            const fightDataToPass = { 
                fightData: data.result, 
                fighter: data.fighter, 
                opponent: data.opponent,
                event: data.event 
            };
            this.activeFightData = null;
            this.dashboardSubView = 'MAIN';
            this.scene.start('FightScene', fightDataToPass);
        });

        this.contentContainer.add([startBtn, startTxt, zone]);
    }


    renderPreFight() {
        const { width, height } = this.scale;

        // If picker is open, render the selection list instead
        if (this.trainingPickerOpen) {
            this.renderTrainingPicker();
            return;
        }
        if (this.pressPickerOpen) {
            this.renderPressPicker();
            return;
        }

        this.contentContainer.add(this.add.text(width / 2, 20, 'PRE-FIGHT CAMP', {
            fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        // 1. Fighter Selection (Top)
        const fightersInCamp = calendarManager.getFightersInCamp();
        
        if (fightersInCamp.length === 0) {
            this.contentContainer.add(this.add.text(width / 2, 100, 'NO FIGHTERS CURRENTLY IN CAMP', {
                fontSize: '14px', fontFamily: FONTS.BODY, color: '#666666'
            }).setOrigin(0.5));
            return;
        }

        if (!this.preFightFighterId || !fightersInCamp.some(f => f.id === this.preFightFighterId)) {
            this.preFightFighterId = fightersInCamp[0].id;
        }

        const selectedFighter = fightersInCamp.find(f => f.id === this.preFightFighterId);

        const selectorY = 65;
        const selectorBg = this.add.graphics();
        selectorBg.fillStyle(0x1F1F1F, 1);
        selectorBg.fillRoundedRect(width * 0.05, selectorY - 25, width * 0.9, 50, 12);
        selectorBg.lineStyle(2, COLORS.GOLD, 1);
        selectorBg.strokeRoundedRect(width * 0.05, selectorY - 25, width * 0.9, 50, 12);
        
        const currentName = selectedFighter.name.toUpperCase();
        const nameTxt = this.add.text(width / 2, selectorY, currentName, {
            fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5);

        this.contentContainer.add([selectorBg, nameTxt]);

        if (fightersInCamp.length > 1) {
            const leftArrow = this.add.text(width * 0.12, selectorY, '◀', { fontSize: '24px', color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            const rightArrow = this.add.text(width * 0.88, selectorY, '▶', { fontSize: '24px', color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            
            const currentIndex = fightersInCamp.findIndex(f => f.id === selectedFighter.id);
            leftArrow.on('pointerdown', () => {
                const newIndex = (currentIndex - 1 + fightersInCamp.length) % fightersInCamp.length;
                this.preFightFighterId = fightersInCamp[newIndex].id;
                this.renderActiveTab();
            });
            rightArrow.on('pointerdown', () => {
                const newIndex = (currentIndex + 1) % fightersInCamp.length;
                this.preFightFighterId = fightersInCamp[newIndex].id;
                this.renderActiveTab();
            });
            this.contentContainer.add([leftArrow, rightArrow]);
        }

        // 2. Fighter Stats Section (Middle)
        const statsY = 135;
        this.contentContainer.add(this.add.text(width * 0.1, statsY - 30, 'FIGHTER CAPABILITIES', {
            fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }));

        const statsBg = this.add.graphics();
        statsBg.fillStyle(0x1A1A1A, 1);
        statsBg.fillRoundedRect(width * 0.05, statsY - 15, width * 0.9, 245, 12);
        this.contentContainer.add(statsBg);

        const statGrid = [
            { label: 'POWER', val: selectedFighter.skills.attack.power },
            { label: 'SPEED', val: selectedFighter.skills.attack.speed },
            { label: 'TIMING', val: selectedFighter.skills.attack.timing },
            { label: 'TECH', val: selectedFighter.skills.attack.technique },
            { label: 'COMBOS', val: selectedFighter.skills.attack.combinations },
            { label: 'O-IQ', val: selectedFighter.skills.attack.offenceIQ },
            { label: 'GUARD', val: selectedFighter.skills.defence.guard },
            { label: 'DODGE', val: selectedFighter.skills.defence.dodge },
            { label: 'COUNTER', val: selectedFighter.skills.defence.counter },
            { label: 'CLINCH', val: selectedFighter.skills.defence.clinch },
            { label: 'VISION', val: selectedFighter.skills.defence.vision },
            { label: 'D-IQ', val: selectedFighter.skills.defence.defenceIQ },
            { label: 'STAMINA', val: selectedFighter.skills.physical.stamina },
            { label: 'HEALTH', val: selectedFighter.skills.physical.health }
        ];

        statGrid.forEach((s, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = width * (0.12 + (col * 0.45));
            const y = statsY + (row * 32);
            
            this.contentContainer.add(this.add.text(x, y, s.label, { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666666', fontWeight: '900' }));
            this.contentContainer.add(this.add.text(x + 75, y, Math.floor(s.val).toString(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0, 0));
        });

        // 3. Preparation Panel (Bottom)
        const prepY = statsY + 270;
        
        if (selectedFighter.developmentTask) {
            const devY = prepY + 40;
            const devBg = this.add.graphics();
            devBg.fillStyle(0x1A1A1A, 1);
            devBg.fillRoundedRect(width * 0.05, devY - 40, width * 0.9, 120, 15);
            devBg.lineStyle(2, COLORS.GOLD, 1);
            devBg.strokeRoundedRect(width * 0.05, devY - 40, width * 0.9, 120, 15);
            
            const devTxt = this.add.text(width / 2, devY, 'FIGHTER IN DEVELOPMENT', {
                fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
            }).setOrigin(0.5);
            
            const taskTxt = this.add.text(width / 2, devY + 30, `TRANSITIONING ${selectedFighter.developmentTask}: ${selectedFighter.developmentWeeksRemaining} WEEKS REMAINING`, {
                fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
            }).setOrigin(0.5);
            
            this.contentContainer.add([devBg, devTxt, taskTxt]);
            return;
        }

        this.contentContainer.add(this.add.text(width * 0.1, prepY - 25, 'WEEKLY PREPARATION', {
            fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }));

        // Training Section
        const regimes = this.getRegimes();
        const maxDrills = assetManager.getEffectValue('TRAINING_DRILLS_COUNT', 1);
        const isTrainingDone = selectedFighter.trainingStats?.weeklyTrainingDone || (selectedFighter.trainingStats?.weeklyTrainingCount >= maxDrills);
        if (!this.selectedRegimeId) this.selectedRegimeId = {};
        const currentRegimeIdx = this.selectedRegimeId[selectedFighter.id] !== undefined ? this.selectedRegimeId[selectedFighter.id] : -1;

        // Training Dropdown Button
        const dropBg = this.add.graphics();
        dropBg.fillStyle(isTrainingDone ? 0x222222 : 0x1A1A1A, 1);
        dropBg.fillRoundedRect(width * 0.05, prepY - 10, width * 0.9, 45, 10);
        dropBg.lineStyle(1, COLORS.GOLD, 1);
        dropBg.strokeRoundedRect(width * 0.05, prepY - 10, width * 0.9, 45, 10);

        const currentLabel = currentRegimeIdx === -1 ? 'SELECT TRAINING DRILL...' : `${regimes[currentRegimeIdx].skill.toUpperCase()}: ${regimes[currentRegimeIdx].name}`;
        const dropTxt = this.add.text(width / 2, prepY + 12, currentLabel, {
            fontSize: '14px', fontFamily: FONTS.TITLE, color: isTrainingDone ? '#666666' : COLORS.STR_WHITE
        }).setOrigin(0.5);

        this.contentContainer.add([dropBg, dropTxt]);

        if (!isTrainingDone) {
            const dropZone = this.add.rectangle(width / 2, prepY + 12, width * 0.9, 45, 0, 0).setInteractive({ useHandCursor: true });
            dropZone.on('pointerdown', () => {
                this.trainingPickerOpen = true;
                this.renderActiveTab();
            });
            this.contentContainer.add(dropZone);
        }

        // Training Execute Button
        const trainExecY = prepY + 55;
        const canTrain = !isTrainingDone && currentRegimeIdx !== -1;
        const trainBtn = this.add.graphics();
        trainBtn.fillStyle(canTrain ? 0xFFD700 : 0x333333, 1);
        trainBtn.fillRoundedRect(width * 0.05, trainExecY - 15, width * 0.9, 45, 10);
        
        const trainTxt = this.add.text(width / 2, trainExecY + 7, isTrainingDone ? 'TRAINING COMPLETED' : 'EXECUTE DRILL', {
            fontSize: '15px', fontFamily: FONTS.TITLE, color: canTrain ? '#000000' : '#888888'
        }).setOrigin(0.5);

        this.contentContainer.add([trainBtn, trainTxt]);

        if (canTrain) {
            const trainZone = this.add.rectangle(width / 2, trainExecY + 7, width * 0.9, 45, 0, 0).setInteractive({ useHandCursor: true });
            trainZone.on('pointerdown', () => {
                const regime = regimes[currentRegimeIdx];
                const result = fighterManager.executeTrainingSession(selectedFighter, regime);
                this.renderActiveTab();
                this.showStatusModal('TRAINING RESULT', result, COLORS.GOLD);
            });
            this.contentContainer.add(trainZone);
        }

        // Promotion Section (Bottom of the Prep Panel)
        const promoExecY = trainExecY + 55;
        const isPromoDone = selectedFighter.promotionStats?.weeklyPromotionDone;
        const isPressDone = selectedFighter.promotionStats?.pressConferenceDone;
        const isPressWeek = calendarManager.isPressWeek(selectedFighter.id);
        
        const promoBtn = this.add.graphics();
        const promoColor = (isPressWeek ? isPressDone : isPromoDone) ? 0x222222 : (isPressWeek ? 0x00D1FF : 0xFFD700);
        promoBtn.fillStyle(promoColor, 1);
        promoBtn.fillRoundedRect(width * 0.05, promoExecY - 15, width * 0.9, 45, 10);
        
        let label = isPromoDone ? 'PROMOTION COMPLETED' : 'EXECUTE PROMOTION';
        if (isPressWeek) {
            label = isPressDone ? 'MEDIA OBLIGATIONS MET' : 'LAUNCH PRESS CONFERENCE';
        }
        
        const promoTxt = this.add.text(width / 2, promoExecY + 7, label, {
            fontSize: '15px', fontFamily: FONTS.TITLE, color: (isPressWeek ? isPressDone : isPromoDone) ? '#666666' : '#000000'
        }).setOrigin(0.5);

        this.contentContainer.add([promoBtn, promoTxt]);

        const canExecutePromo = isPressWeek ? !isPressDone : !isPromoDone;
        if (canExecutePromo) {
            const promoZone = this.add.rectangle(width / 2, promoExecY + 7, width * 0.9, 45, 0, 0).setInteractive({ useHandCursor: true });
            promoZone.on('pointerdown', () => {
                if (isPressWeek) {
                    this.selectedFighterId = selectedFighter.id;
                    this.selectedFighterTab = 'PRESS';
                    this.renderActiveTab();
                } else {
                    const result = fighterManager.executePromotionActivity(selectedFighter);
                    this.renderActiveTab();
                    this.showStatusModal('PROMOTION RESULT', result, COLORS.GOLD);
                }
            });
            this.contentContainer.add(promoZone);
        }
    }

    getRegimes() {
        return [
            { name: 'Amateur Wrestling', skill: 'clinch', group: 'defence' },
            { name: '1,2 Drills', skill: 'combinations', group: 'attack' },
            { name: 'Reaction Test', skill: 'counter', group: 'defence' },
            { name: 'Footwork Drills', skill: 'defenceIQ', group: 'defence' },
            { name: 'Blindfolded Sparring', skill: 'dodge', group: 'defence' },
            { name: '2 vs 1 Sparring', skill: 'guard', group: 'defence' },
            { name: 'Healthy Diet', skill: 'health', group: 'physical' },
            { name: 'Watch Tape', skill: 'offenceIQ', group: 'attack' },
            { name: 'Heavy Bag', skill: 'power', group: 'attack' },
            { name: 'Speed Bag', skill: 'speed', group: 'attack' },
            { name: 'Running Drills', skill: 'stamina', group: 'physical' },
            { name: 'Textbook Drills', skill: 'technique', group: 'attack' },
            { name: 'Padwork', skill: 'timing', group: 'attack' },
            { name: 'Spot the Difference', skill: 'vision', group: 'defence' }
        ].sort((a, b) => a.skill.localeCompare(b.skill));
    }

    renderTrainingPicker() {
        const { width, height } = this.scale;
        const regimes = this.getRegimes();
        const fightersInCamp = calendarManager.getFightersInCamp();
        const selectedFighter = fightersInCamp.find(f => f.id === this.preFightFighterId);

        this.contentContainer.add(this.add.text(width / 2, 20, 'SELECT TRAINING DRILL', {
            fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        const scrollContainer = this.add.container(0, 60);
        this.contentContainer.add(scrollContainer);

        regimes.forEach((regime, i) => {
            const y = i * 45;
            const bg = this.add.graphics();
            bg.fillStyle(0x1F1F1F, 1);
            bg.fillRoundedRect(width * 0.05, y - 20, width * 0.9, 40, 10);
            
            const label = `${regime.skill.toUpperCase()}: ${regime.name}`;
            const txt = this.add.text(width / 2, y, label, {
                fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
            }).setOrigin(0.5);

            const zone = this.add.rectangle(width / 2, y, width * 0.9, 40, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this.selectedRegimeId[selectedFighter.id] = i;
                this.trainingPickerOpen = false;
                this.renderActiveTab();
            });

            scrollContainer.add([bg, txt, zone]);
        });

        const cancelBtnY = regimes.length * 45 + 20;
        const cancelBg = this.add.graphics();
        cancelBg.fillStyle(COLORS.RED, 1);
        cancelBg.fillRoundedRect(width * 0.3, cancelBtnY - 20, width * 0.4, 40, 20);
        const cancelTxt = this.add.text(width / 2, cancelBtnY, 'CANCEL', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5);
        const cancelZone = this.add.rectangle(width / 2, cancelBtnY, width * 0.4, 40, 0, 0).setInteractive({ useHandCursor: true });
        cancelZone.on('pointerdown', () => {
            this.trainingPickerOpen = false;
            this.renderActiveTab();
        });
        scrollContainer.add([cancelBg, cancelTxt, cancelZone]);
    }

    renderRankings() {
        const { width, height } = this.scale;
        
        const backBtn = this.add.text(20, 10, '← DASHBOARD', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.dashboardSubView = 'MAIN'; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        this.contentContainer.add(this.add.text(width / 2, 35, 'RANKINGS', {
            fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        // State initialization
        if (!this.rankingTab) this.rankingTab = 'WORLD';
        if (!this.rankingCountry) this.rankingCountry = 'UK';
        if (!this.rankingDivision) this.rankingDivision = 'Heavyweight';

        // 1. Division Tabs (Top)
        const divSelectorY = 70;
        const tabWidth = 100;
        const totalTabsWidth = WEIGHT_DIVISIONS.length * tabWidth;
        
        const divMaskGraphics = this.make.graphics();
        divMaskGraphics.fillStyle(0xffffff);
        divMaskGraphics.fillRoundedRect(width * 0.05, divSelectorY - 20, width * 0.9, 40, 10);
        const divMask = divMaskGraphics.createGeometryMask();

        const divTabsContainer = this.add.container(0, 0);
        divTabsContainer.setMask(divMask);

        const currentDivIdx = WEIGHT_DIVISIONS.findIndex(d => d.name === this.rankingDivision);
        let targetX = (width / 2) - (currentDivIdx * tabWidth) - (tabWidth / 2);
        const minX = (width * 0.95) - totalTabsWidth;
        const maxX = width * 0.05;
        targetX = Math.min(maxX, Math.max(minX, targetX));
        divTabsContainer.x = targetX;

        WEIGHT_DIVISIONS.forEach((div, i) => {
            const x = (i * tabWidth) + (tabWidth / 2);
            const isSelected = this.rankingDivision === div.name;
            
            const btn = this.add.rectangle(x, divSelectorY, tabWidth - 6, 30, isSelected ? COLORS.GOLD : 0x1A1A1A)
                .setInteractive({ useHandCursor: true });
            if (isSelected) btn.setStrokeStyle(1, 0xFFFFFF);
            
            const txt = this.add.text(x, divSelectorY, div.name.toUpperCase(), { 
                fontSize: isSelected ? '11px' : '9px', 
                fontFamily: FONTS.TITLE, 
                color: isSelected ? '#000' : '#888',
                fontWeight: isSelected ? 'bold' : 'normal'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.rankingDivision = div.name;
                this.renderActiveTab();
            });
            divTabsContainer.add([btn, txt]);
        });
        this.contentContainer.add(divTabsContainer);

        // 2. Category Selection Tabs (Below Divisions)
        const categories = ['WORLD', 'INTER.', 'CONTINENTAL', 'NATIONAL', 'REGIONAL', 'TITLES'];
        const catY = 115;
        const catWidth = (width * 0.9) / categories.length;
        
        categories.forEach((cat, i) => {
            const x = (width * 0.05) + (i * catWidth) + (catWidth / 2);
            const isSelected = this.rankingTab === cat;
            
            const catBg = this.add.rectangle(x, catY, catWidth - 4, 30, isSelected ? 0x222222 : 0x111111)
                .setInteractive({ useHandCursor: true });
            if (isSelected) catBg.setStrokeStyle(1, COLORS.GOLD, 0.5);
            
            const txt = this.add.text(x, catY, cat, { 
                fontSize: '10px', 
                fontFamily: FONTS.TITLE, 
                color: isSelected ? COLORS.STR_GOLD : '#666666' 
            }).setOrigin(0.5);
            
            catBg.on('pointerdown', () => { 
                this.rankingTab = cat; 
                this.renderActiveTab(); 
            });
            this.contentContainer.add([catBg, txt]);
        });

        if (this.rankingTab === 'TITLES') {
            this.renderTitlesView();
            return;
        }

        // 3. Optional Country Toggle
        let listY = 165;
        if (['NATIONAL', 'REGIONAL'].includes(this.rankingTab)) {
            const toggleY = 150;
            listY = 185;
            const ukTxt = this.add.text(width * 0.4, toggleY, 'UK', { fontSize: '14px', fontFamily: FONTS.TITLE, color: this.rankingCountry === 'UK' ? COLORS.STR_GOLD : '#666666' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            const usaTxt = this.add.text(width * 0.6, toggleY, 'USA', { fontSize: '14px', fontFamily: FONTS.TITLE, color: this.rankingCountry === 'USA' ? COLORS.STR_GOLD : '#666666' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            
            ukTxt.on('pointerdown', () => { this.rankingCountry = 'UK'; this.renderActiveTab(); });
            usaTxt.on('pointerdown', () => { this.rankingCountry = 'USA'; this.renderActiveTab(); });
            this.contentContainer.add([ukTxt, usaTxt]);
        }

        // 4. List Rendering
        const allFighters = fighterManager.worldPopulation.concat(fighterManager.fighters);
        let list = allFighters.filter(f => f.weightDivision === this.rankingDivision);
        
        if (this.rankingTab === 'WORLD') {
            list = list.filter(f => f.rankings.unified > 0).sort((a, b) => a.rankings.unified - b.rankings.unified);
        } else if (this.rankingTab === 'INTER.') {
            list = list.filter(f => f.rankings.unified >= 11 && f.rankings.unified <= 50).sort((a, b) => a.rankings.unified - b.rankings.unified);
        } else if (this.rankingTab === 'CONTINENTAL') {
            list = list.filter(f => f.rankings.unified >= 51 && f.rankings.unified <= 100).sort((a, b) => a.rankings.unified - b.rankings.unified);
        } else if (this.rankingTab === 'NATIONAL') {
            list = list.filter(f => f.nationality === this.rankingCountry && f.rankings.unified >= 101 && f.rankings.unified <= 200).sort((a, b) => a.rankings.unified - b.rankings.unified);
        } else if (this.rankingTab === 'REGIONAL') {
            list = list.filter(f => f.nationality === this.rankingCountry && f.rankings.unified >= 201).sort((a, b) => a.rankings.unified - b.rankings.unified);
        }

        const displayList = list.slice(0, 15);
        if (displayList.length === 0) {
            this.contentContainer.add(this.add.text(width / 2, listY + 50, 'NO DATA FOR THIS CATEGORY', {
                fontSize: '14px', fontFamily: FONTS.BODY, color: '#666666'
            }).setOrigin(0.5));
        }

        displayList.forEach((f, i) => {
            const y = listY + (i * 45);
            const frame = this.add.graphics();
            frame.fillStyle(0x1A1A1A, 1);
            frame.fillRoundedRect(width * 0.05, y - 20, width * 0.9, 40, 5);
            
            let rankDisplay = f.rankings.unified;
            if (this.rankingTab === 'NATIONAL' || this.rankingTab === 'REGIONAL') {
                rankDisplay = list.indexOf(f) + 1;
            }
            
            const rankTxt = this.add.text(width * 0.1, y, rankDisplay.toString(), { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
            const nameTxt = this.add.text(width * 0.18, y, f.name.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0, 0.5);
            
            if (f.titlesHeld && f.titlesHeld.length > 0) {
                const primaryTitle = f.titlesHeld[0];
                if (CHAMPIONSHIPS[primaryTitle]) {
                    const beltIcon = this.add.image(nameTxt.x + nameTxt.width + 12, y, primaryTitle).setDisplaySize(32, 20).setOrigin(0, 0.5);
                    this.contentContainer.add(beltIcon);
                }
            }
            
            const recTxt = this.add.text(width * 0.9, y, fighterManager.getRecordString(f.record), { fontSize: '12px', fontFamily: FONTS.BODY, color: '#666666' }).setOrigin(1, 0.5);
            
            const zone = this.add.rectangle(width / 2, y, width * 0.9, 40, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this.selectedFighterTab = 'BIO'; 
                this.selectedFighterId = f.id; 
                this.renderActiveTab(); 
            });
            
            this.contentContainer.add([frame, rankTxt, nameTxt, recTxt, zone]);
        });
    }

    renderTitlesView() {
        const { width, height } = this.scale;
        const listY = 140;
        const titles = Object.keys(CHAMPIONSHIPS);
        const allFighters = fighterManager.worldPopulation.concat(fighterManager.fighters);

        titles.forEach((titleKey, i) => {
            const y = listY + (i * 55);
            const data = CHAMPIONSHIPS[titleKey];
            const champ = allFighters.find(f => (f.titlesHeld || []).includes(titleKey));
            
            const frame = this.add.graphics();
            frame.fillStyle(0x1A1A1A, 1);
            frame.fillRoundedRect(width * 0.05, y - 25, width * 0.9, 50, 10);
            frame.lineStyle(1, Phaser.Display.Color.HexStringToColor(data.color).color, 0.3);
            frame.strokeRoundedRect(width * 0.05, y - 25, width * 0.9, 50, 10);

            const icon = this.add.image(width * 0.12, y, titleKey).setDisplaySize(40, 26);
            
            const titleName = this.add.text(width * 0.2, y - 12, data.name, { 
                fontSize: '14px', fontFamily: FONTS.TITLE, color: data.color 
            });

            let champName = "VACANT";
            let champColor = '#666';
            let defenses = "";

            if (champ) {
                champName = champ.name.toUpperCase();
                champColor = COLORS.STR_WHITE;
                defenses = `${champ.titleDefenses || 0} DEFENSES`;
            }

            const champTxt = this.add.text(width * 0.2, y + 5, champName, { 
                fontSize: '16px', fontFamily: FONTS.TITLE, color: champColor 
            });

            const defTxt = this.add.text(width * 0.9, y, defenses, { 
                fontSize: '10px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD 
            }).setOrigin(1, 0.5);

            this.contentContainer.add([frame, icon, titleName, champTxt, defTxt]);

            if (champ) {
                const zone = this.add.rectangle(width / 2, y, width * 0.9, 50, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => {
                    this.selectedFighterTab = 'BIO';
                    this.selectedFighterId = champ.id;
                    this.renderActiveTab();
                });
                this.contentContainer.add(zone);
            }
        });
    }

    renderMarket() {
        const { width, height } = this.scale;
        this.contentContainer.add(this.add.text(width / 2, 35, 'SCOUTING MARKET', {
            fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const createBtnY = 75;
        const createBtn = this.add.graphics();
        createBtn.fillStyle(0x00D1FF, 1);
        createBtn.fillRoundedRect(width * 0.65, createBtnY - 15, width * 0.3, 30, 15);
        const createTxt = this.add.text(width * 0.8, createBtnY, 'CREATE FIGHTER', { fontSize: '11px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
        const createZone = this.add.rectangle(width * 0.8, createBtnY, width * 0.3, 30, 0, 0).setInteractive({ useHandCursor: true });
        createZone.on('pointerup', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this.creationMode = true;
            this.creationStep = 1;
            this.creationData = {
                name: '', nickname: '', age: 20, nationality: 'UK', weightDivision: this.marketDivision || 'Heavyweight',
                style: 'Outboxer', personality: FIGHTER_PERSONALITIES.NORMAL,
                skills: {
                    attack: { power: 10, speed: 10, timing: 10, technique: 10, combinations: 10, offenceIQ: 10 },
                    defence: { guard: 10, dodge: 10, counter: 10, clinch: 10, vision: 10, defenceIQ: 10 }
                }
            };
            this.renderActiveTab();
        });
        this.contentContainer.add([createBtn, createTxt, createZone]);

        if (!this.marketDivision) this.marketDivision = 'Heavyweight';

        // Division Selector (Enhanced Horizontal Scrollable Tabs)
        const divSelectorY = 110;
        const tabWidth = 100;
        const totalTabsWidth = WEIGHT_DIVISIONS.length * tabWidth;
        
        // Create a masking container for the tabs - accounting for the header offset (80px)
        const maskX = width * 0.05;
        const maskY = divSelectorY + 80 - 20; // 80 is contentContainer.y
        const maskW = width * 0.9;
        const maskH = 40;

        const tabMaskGraphics = this.make.graphics();
        tabMaskGraphics.fillStyle(0xffffff);
        tabMaskGraphics.fillRoundedRect(maskX, maskY, maskW, maskH, 10);
        const tabMask = tabMaskGraphics.createGeometryMask();

        const tabsContainer = this.add.container(0, 0);
        tabsContainer.setMask(tabMask);

        // Calculate limits
        const minX = (width * 0.95) - totalTabsWidth;
        const maxX = width * 0.05;

        // Initialize or validate scroll position
        if (this.marketScrollX === undefined) {
            const currentDivIdx = WEIGHT_DIVISIONS.findIndex(d => d.name === this.marketDivision);
            this.marketScrollX = (width / 2) - (currentDivIdx * tabWidth) - (tabWidth / 2);
        }
        
        this.marketScrollX = Math.min(maxX, Math.max(minX, this.marketScrollX));
        tabsContainer.x = this.marketScrollX;

        WEIGHT_DIVISIONS.forEach((div, i) => {
            const x = (i * tabWidth) + (tabWidth / 2);
            const isSelected = this.marketDivision === div.name;
            
            const btn = this.add.rectangle(x, divSelectorY, tabWidth - 4, 32, isSelected ? COLORS.GOLD : 0x1A1A1A, isSelected ? 1 : 0.5)
                .setInteractive({ useHandCursor: true });
            
            const txt = this.add.text(x, divSelectorY, div.name.toUpperCase(), { 
                fontSize: isSelected ? '11px' : '9px', 
                fontFamily: FONTS.TITLE, 
                color: isSelected ? '#000' : '#888',
                fontWeight: isSelected ? 'bold' : 'normal'
            }).setOrigin(0.5);

            btn.on('pointerup', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.marketDivision = div.name;
                // Gently center the selected tab
                this.marketScrollX = (width / 2) - (i * tabWidth) - (tabWidth / 2);
                this.renderActiveTab();
            });

            tabsContainer.add([btn, txt]);
        });
        
        this.contentContainer.add(tabsContainer);

        // Left/Right Indicators for scrolling (Always visible if scrollable)
        const leftFade = this.add.text(width * 0.05, divSelectorY, '◀', { fontSize: '18px', color: COLORS.STR_GOLD })
            .setOrigin(0, 0.5).setDepth(2).setInteractive({ useHandCursor: true }).setAlpha(tabsContainer.x < maxX ? 1 : 0.2);
        
        leftFade.on('pointerup', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            if (tabsContainer.x < maxX) {
                this.marketScrollX = Math.min(maxX, this.marketScrollX + tabWidth * 2);
                this.renderActiveTab();
            }
        });
        
        const rightFade = this.add.text(width * 0.95, divSelectorY, '▶', { fontSize: '18px', color: COLORS.STR_GOLD })
            .setOrigin(1, 0.5).setDepth(2).setInteractive({ useHandCursor: true }).setAlpha(tabsContainer.x > minX ? 1 : 0.2);
            
        rightFade.on('pointerup', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            if (tabsContainer.x > minX) {
                this.marketScrollX = Math.max(minX, this.marketScrollX - tabWidth * 2);
                this.renderActiveTab();
            }
        });

        this.contentContainer.add([leftFade, rightFade]);

        // Heading for selected division
        const marketStartY = divSelectorY + 60;
        const heading = this.add.text(width / 2, marketStartY - 25, `${this.marketDivision.toUpperCase()} DIVISION`, {
            fontSize: '18px',
            fontFamily: FONTS.TITLE,
            color: COLORS.STR_GOLD,
            letterSpacing: 1
        }).setOrigin(0.5);
        this.contentContainer.add(heading);

        // Market logic: Filter from the persistent marketFighters list
        const marketList = (fighterManager.marketFighters || [])
            .map(id => fighterManager.getFighter(id))
            .filter(f => f && f.weightDivision === this.marketDivision && f.availability === 'FREE');

        marketList.forEach((fa, i) => {
            const y = marketStartY + 20 + (i * 78);
            const frame = this.add.graphics();
            frame.fillStyle(0x1F1F1F, 1);
            frame.fillRoundedRect(width * 0.05, y - 35, width * 0.9, 70, 12);
            
            const nameTxt = this.add.text(width * 0.1, y - 24, fa.name.toUpperCase(), { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
            
            // Champion Icon in Market
            if (fa.titlesHeld && fa.titlesHeld.length > 0) {
                const primaryTitle = fa.titlesHeld[0];
                const beltIcon = this.add.image(nameTxt.x + nameTxt.width + 10, nameTxt.y + 10, primaryTitle).setDisplaySize(20, 12);
                this.contentContainer.add(beltIcon);
            }

            const repTxt = this.add.text(width * 0.1, y - 2, fa.reputationStatus, { fontSize: '10px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD });
            const recTxt = this.add.text(width * 0.1, y + 12, `RECORD: ${fighterManager.getRecordString(fa.record)}`, { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666666' });
            
            const viewBtn = this.add.text(width * 0.9, y, 'VIEW PROFILE', { fontSize: '11px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            viewBtn.on('pointerup', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.selectedFighterTab = 'BIO';
                this.selectedFighterId = fa.id;
                this.renderActiveTab();
            });
            this.contentContainer.add([frame, nameTxt, repTxt, recTxt, viewBtn]);
        });

        if (marketList.length === 0) {
            this.contentContainer.add(this.add.text(width / 2, marketStartY + 100, 'NO NEW FREE AGENTS THIS MONTH', {
                fontSize: '14px', fontFamily: FONTS.BODY, color: '#666666'
            }).setOrigin(0.5));
        }
    }

    renderFighterCreation() {
        const { width, height } = this.scale;
        const data = this.creationData;

        this.contentContainer.add(this.add.text(width / 2, 20, 'FIGHTER CREATION', {
            fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5));

        const backBtn = this.add.text(20, 10, '← CANCEL', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.creationMode = false; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        // Progress Bar
        const steps = ['BIO', 'STYLE', 'SKILLS', 'CONFIRM'];
        const stepWidth = (width * 0.8) / steps.length;
        steps.forEach((step, i) => {
            const x = width * 0.1 + (i * stepWidth) + stepWidth / 2;
            const isCurrent = (this.creationStep === i + 1);
            const isPast = (this.creationStep > i + 1);
            
            const color = isCurrent ? COLORS.GOLD : (isPast ? 0x00FF00 : 0x444444);
            const dot = this.add.circle(x, 60, 5, color);
            const label = this.add.text(x, 75, step, { fontSize: '10px', fontFamily: FONTS.TITLE, color: isCurrent ? COLORS.STR_WHITE : '#666' }).setOrigin(0.5);
            this.contentContainer.add([dot, label]);
        });

        if (this.creationStep === 1) {
            // Bio Step
            const fields = [
                { label: 'NAME', value: data.name || 'TAP TO ENTER', key: 'name' },
                { label: 'NICKNAME', value: data.nickname || 'TAP TO ENTER', key: 'nickname' },
                { label: 'AGE', value: `${data.age} YEARS OLD`, key: 'age' },
                { label: 'NATIONALITY', value: data.nationality, key: 'nationality' },
                { label: 'WEIGHT DIVISION', value: data.weightDivision.toUpperCase(), key: 'weightDivision' }
            ];

            fields.forEach((fieldData, index) => {
                const y = 140 + (index * 70); // Slightly more vertical separation
                const bg = this.add.graphics().fillStyle(0x1A1A1A, 1).fillRoundedRect(width * 0.05, y - 25, width * 0.9, 50, 10);
                this.contentContainer.add(bg);
                this.contentContainer.add(this.add.text(width * 0.1, y - 10, fieldData.label, { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666', fontWeight: 'bold' }));
                this.contentContainer.add(this.add.text(width * 0.1, y + 5, fieldData.value, { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }));
                
                const zone = this.add.rectangle(width / 2, y, width * 0.9, 50, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerup', (pointer, localX, localY, event) => {
                    if (event) event.stopPropagation();
                    this.showCreationFieldEditor(fieldData.key);
                });
                this.contentContainer.add(zone);
            });
        } else if (this.creationStep === 2) {
            // Style & Personality
            const fields = [
                { label: 'BOXING STYLE', value: data.style.toUpperCase(), key: 'style' },
                { label: 'PERSONALITY', value: data.personality.toUpperCase(), key: 'personality' }
            ];

            fields.forEach((fieldData, index) => {
                const y = 150 + (index * 90);
                const bg = this.add.graphics().fillStyle(0x1A1A1A, 1).fillRoundedRect(width * 0.05, y - 35, width * 0.9, 70, 10);
                this.contentContainer.add(bg);
                this.contentContainer.add(this.add.text(width * 0.1, y - 20, fieldData.label, { fontSize: '12px', fontFamily: FONTS.BODY, color: '#666', fontWeight: 'bold' }));
                this.contentContainer.add(this.add.text(width * 0.1, y, fieldData.value, { fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
                
                const zone = this.add.rectangle(width / 2, y, width * 0.9, 70, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerup', (pointer, localX, localY, event) => {
                    if (event) event.stopPropagation();
                    this.showCreationFieldEditor(fieldData.key);
                });
                this.contentContainer.add(zone);
            });
        } else if (this.creationStep === 3) {
            // Skill Allocation
            const totalPoints = 120;
            const spent = Object.values(data.skills.attack).reduce((a, b) => a + b, 0) + Object.values(data.skills.defence).reduce((a, b) => a + b, 0);
            const remaining = totalPoints - spent;

            this.contentContainer.add(this.add.text(width / 2, 100, `POINTS REMAINING: ${remaining}`, { fontSize: '18px', fontFamily: FONTS.TITLE, color: remaining === 0 ? '#00FF00' : (remaining < 0 ? '#FF0000' : COLORS.STR_GOLD) }).setOrigin(0.5));

            const skillGroups = [
                { name: 'ATTACK', skills: data.skills.attack },
                { name: 'DEFENCE', skills: data.skills.defence }
            ];

            let yOffset = 140;
            skillGroups.forEach(group => {
                this.contentContainer.add(this.add.text(width * 0.1, yOffset, group.name, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
                yOffset += 20;
                
                Object.entries(group.skills).forEach(([key, val]) => {
                    const rowY = yOffset;
                    this.contentContainer.add(this.add.text(width * 0.1, rowY, key.toUpperCase(), { fontSize: '12px', fontFamily: FONTS.BODY, color: '#AAA' }));
                    
                    const minus = this.add.text(width * 0.6, rowY, '[-]', { fontSize: '16px', color: '#FF4C4C' }).setInteractive({ useHandCursor: true });
                    const plus = this.add.text(width * 0.85, rowY, '[+]', { fontSize: '16px', color: '#00FF00' }).setInteractive({ useHandCursor: true });
                    const valTxt = this.add.text(width * 0.725, rowY, val.toString(), { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5, 0);
                    
                    minus.on('pointerup', (pointer, localX, localY, event) => {
                        if (event) event.stopPropagation();
                        if (val > 1) {
                            group.skills[key]--;
                            this.renderActiveTab();
                        }
                    });
                    plus.on('pointerup', (pointer, localX, localY, event) => {
                        if (event) event.stopPropagation();
                        if (remaining > 0 && val < 99) {
                            group.skills[key]++;
                            this.renderActiveTab();
                        }
                    });

                    this.contentContainer.add([minus, plus, valTxt]);
                    yOffset += 25;
                });
                yOffset += 10;
            });
        } else if (this.creationStep === 4) {
            // Confirm
            const summary = [
                { label: 'NAME', val: data.name },
                { label: 'DIVISION', val: data.weightDivision },
                { label: 'STYLE', val: data.style },
                { label: 'SKILLS TOTAL', val: '120 POINTS' },
                { label: 'PHYSICALS', val: '????' },
                { label: 'CHARISMA', val: '????' }
            ];

            summary.forEach((s, i) => {
                const y = 120 + (i * 40);
                this.contentContainer.add(this.add.text(width * 0.1, y, s.label, { fontSize: '12px', fontFamily: FONTS.BODY, color: '#666' }));
                this.contentContainer.add(this.add.text(width * 0.9, y, s.val.toUpperCase(), { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
            });

            this.contentContainer.add(this.add.text(width / 2, height * 0.65, 'ONCE CREATED, THIS FIGHTER WILL ENTER FREE AGENCY.', { fontSize: '12px', fontFamily: FONTS.BODY, color: '#888', align: 'center', wordWrap: { width: width * 0.8 } }).setOrigin(0.5));
        }

        // Navigation Buttons
        const navBtnY = Math.max(height - 210, 520); // Moved up and ensured minimum Y to avoid overlap
        const navBtnHeight = 45;
        
        if (this.creationStep < 4) {
            const isFirstStep = this.creationStep === 1;
            const btnX = isFirstStep ? width / 2 : width * 0.725;
            const btnWidth = isFirstStep ? width * 0.8 : width * 0.35;
            
            const nextBtn = this.add.graphics().fillStyle(0x00FF00, 1).fillRoundedRect(btnX - btnWidth/2, navBtnY - navBtnHeight/2, btnWidth, navBtnHeight, 22);
            const nextTxt = this.add.text(btnX, navBtnY, 'CONTINUE', { fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000', fontWeight: 'bold' }).setOrigin(0.5);
            const nextZone = this.add.rectangle(btnX, navBtnY, btnWidth, navBtnHeight, 0, 0).setInteractive({ useHandCursor: true });
            
            nextZone.on('pointerup', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                if (this.creationStep === 1 && !data.name) {
                    this.showStatusModal('NAME REQUIRED', "PLEASE ENTER A NAME FOR YOUR FIGHTER.", COLORS.RED);
                    return;
                }
                this.creationStep++;
                this.renderActiveTab();
            });
            this.contentContainer.add([nextBtn, nextTxt, nextZone]);
        } else {
            // Step 4: Confirm (Side-by-side with Back)
            const btnX = width * 0.725;
            const btnWidth = width * 0.35;
            
            const confirmBtn = this.add.graphics().fillStyle(0x00FF00, 1).fillRoundedRect(btnX - btnWidth/2, navBtnY - navBtnHeight/2, btnWidth, navBtnHeight, 22);
            const confirmTxt = this.add.text(btnX, navBtnY, 'FINISH', { fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000', fontWeight: 'bold' }).setOrigin(0.5);
            const confirmZone = this.add.rectangle(btnX, navBtnY, btnWidth, navBtnHeight, 0, 0).setInteractive({ useHandCursor: true });
            
            confirmZone.on('pointerup', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                const res = fighterManager.createFighter(data);
                if (res.success) {
                    this.creationMode = false;
                    this.showStatusModal('SUCCESS', `${res.fighter.name} has been created and added to the market!`, COLORS.GOLD);
                    this.renderActiveTab();
                } else {
                    this.showStatusModal('LIMIT REACHED', res.message, COLORS.RED);
                }
            });
            this.contentContainer.add([confirmBtn, confirmTxt, confirmZone]);
        }

        if (this.creationStep > 1) {
            const backBtnNav = this.add.graphics().fillStyle(0x444444, 1).fillRoundedRect(width * 0.1, navBtnY - navBtnHeight/2, width * 0.35, navBtnHeight, 22);
            const backTxtNav = this.add.text(width * 0.275, navBtnY, 'BACK', { fontSize: '18px', fontFamily: FONTS.TITLE, color: '#FFF' }).setOrigin(0.5);
            const backZoneNav = this.add.rectangle(width * 0.275, navBtnY, width * 0.35, navBtnHeight, 0, 0).setInteractive({ useHandCursor: true });
            
            backZoneNav.on('pointerup', (pointer, localX, localY, event) => {
                if (event) event.stopPropagation();
                this.creationStep--;
                this.renderActiveTab();
            });
            this.contentContainer.add([backBtnNav, backTxtNav, backZoneNav]);
        }
    }

    showCreationFieldEditor(key) {
        if (this.isEditingField) return;
        this.isEditingField = true;
        this.input.enabled = false; // Lock Phaser input

        const data = this.creationData;
        const { width, height } = this.scale;
        
        const existing = document.getElementById('creation-field-editor');
        if (existing) existing.remove();

        const editor = document.createElement('div');
        editor.id = 'creation-field-editor';
        Object.assign(editor.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.95)', // Darker background for "locked" feel
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '2000',
            fontFamily: '"Montserrat", sans-serif',
            color: '#FFD700',
            backdropFilter: 'blur(20px)'
        });

        // Prevent background clicks from bleeding through
        editor.onmousedown = (e) => e.stopPropagation();
        editor.onmouseup = (e) => e.stopPropagation();
        editor.onclick = (e) => e.stopPropagation();

        const labelMap = {
            'name': 'FIGHTER NAME',
            'nickname': 'NICKNAME',
            'age': 'AGE (18-40)',
            'nationality': 'NATIONALITY',
            'weightDivision': 'WEIGHT DIVISION',
            'style': 'BOXING STYLE',
            'personality': 'PERSONALITY'
        };

        const title = document.createElement('h2');
        title.innerText = `EDIT ${labelMap[key] || key.toUpperCase()}`;
        title.style.marginBottom = '20px';
        title.style.letterSpacing = '2px';
        title.style.fontSize = '24px';
        title.style.fontWeight = '900';

        const errorMsg = document.createElement('p');
        errorMsg.style.color = '#FF4C4C';
        errorMsg.style.fontSize = '14px';
        errorMsg.style.height = '20px';
        errorMsg.style.marginBottom = '10px';
        errorMsg.innerText = '';

        let input;
        if (key === 'nationality') {
            input = document.createElement('select');
            NATIONALITIES.forEach(nat => {
                const opt = document.createElement('option');
                opt.value = nat.code;
                opt.innerText = nat.name;
                if (data.nationality === nat.code) opt.selected = true;
                input.appendChild(opt);
            });
        } else if (key === 'weightDivision') {
            input = document.createElement('select');
            WEIGHT_DIVISIONS.forEach(div => {
                const opt = document.createElement('option');
                opt.value = div.name;
                opt.innerText = div.name.toUpperCase();
                if (data.weightDivision === div.name) opt.selected = true;
                input.appendChild(opt);
            });
        } else if (key === 'style') {
            input = document.createElement('select');
            BOXING_STYLES.forEach(style => {
                const opt = document.createElement('option');
                opt.value = style;
                opt.innerText = style.toUpperCase();
                if (data.style === style) opt.selected = true;
                input.appendChild(opt);
            });
        } else if (key === 'personality') {
            input = document.createElement('select');
            Object.values(FIGHTER_PERSONALITIES).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.innerText = p.toUpperCase();
                if (data.personality === p) opt.selected = true;
                input.appendChild(opt);
            });
        } else {
            input = document.createElement('input');
            input.type = key === 'age' ? 'number' : 'text';
            if (key === 'age') {
                input.min = 18;
                input.max = 40;
            }
            input.value = data[key] || '';
            input.placeholder = labelMap[key];
            input.autocomplete = 'off';
        }

        Object.assign(input.style, {
            width: '80%',
            maxWidth: '400px',
            padding: '16px',
            backgroundColor: '#1A1A1A',
            border: '2px solid #FFD700',
            color: '#FFF',
            fontSize: '20px',
            borderRadius: '12px',
            outline: 'none',
            textAlign: 'center',
            marginBottom: '30px',
            fontWeight: '700'
        });

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '20px';

        const confirmBtn = document.createElement('button');
        confirmBtn.innerText = 'CONFIRM';
        Object.assign(confirmBtn.style, {
            padding: '12px 40px',
            backgroundColor: '#FFD700',
            color: '#000',
            border: 'none',
            borderRadius: '30px',
            fontSize: '16px',
            fontWeight: '900',
            cursor: 'pointer'
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'CANCEL';
        Object.assign(cancelBtn.style, {
            padding: '12px 40px',
            backgroundColor: '#333',
            color: '#FFF',
            border: 'none',
            borderRadius: '30px',
            fontSize: '16px',
            fontWeight: '900',
            cursor: 'pointer'
        });

        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            let val = input.value;
            if (key === 'age') {
                val = parseInt(val);
                if (isNaN(val) || val < 18 || val > 40) {
                    errorMsg.innerText = "AGE MUST BE BETWEEN 18 AND 40.";
                    return;
                }
            }
            if (key === 'name' && !val.trim()) {
                errorMsg.innerText = "PLEASE ENTER A NAME.";
                return;
            }
            
            data[key] = val;
            this.isEditingField = false;
            this.input.enabled = true;
            editor.remove();
            this.renderActiveTab();
        };

        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            this.isEditingField = false;
            this.input.enabled = true;
            editor.remove();
        };

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);

        editor.appendChild(title);
        editor.appendChild(errorMsg);
        editor.appendChild(input);
        editor.appendChild(btnContainer);
        
        document.body.appendChild(editor);
        if (input.tagName === 'INPUT') input.focus();
    }

    renderRoster() {
        const { width } = this.scale;
        this.contentContainer.add(this.add.text(width / 2, 40, 'ROSTER', {
            fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        fighterManager.fighters.forEach((f, i) => {
            const y = 120 + (i * 105);
            
            // Frame elements first
            const frame = this.add.graphics();
            frame.fillStyle(0x1F1F1F, 1);
            frame.fillRoundedRect(width * 0.05, y - 45, width * 0.9, 95, 15);
            frame.lineStyle(1, 0x333333, 1);
            frame.strokeRoundedRect(width * 0.05, y - 45, width * 0.9, 95, 15);
            
            const cardZone = this.add.rectangle(width / 2, y, width * 0.9, 95, 0, 0).setInteractive({ useHandCursor: true });
            cardZone.on('pointerdown', () => { 
                this.selectedFighterTab = 'BIO';
                this.selectedFighterId = f.id; 
                this.renderActiveTab(); 
            });

            // Button elements
            const schedBtn = this.add.graphics();
            schedBtn.fillStyle(0xFFD700, 1);
            schedBtn.fillRoundedRect(width * 0.65, y - 10, width * 0.25, 30, 15);
            
            const schedText = this.add.text(width * 0.775, y + 5, 'SCHEDULE', { fontSize: '11px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
            const schedZone = this.add.rectangle(width * 0.775, y + 5, width * 0.25, 30, 0, 0).setInteractive({ useHandCursor: true });
            schedZone.on('pointerdown', (pointer, x, y, event) => {
                event.stopPropagation();
                this.handleSchedule(f);
            });

            // Text elements
            const displayName = f.nickname ? `${f.name.toUpperCase()} "${f.nickname.toUpperCase()}"` : f.name.toUpperCase();
            const nameText = this.add.text(width * 0.1, y - 25, displayName, { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
            
            // Champion Icons if they have belts
            if (f.titlesHeld && f.titlesHeld.length > 0) {
                f.titlesHeld.forEach((titleKey, tIdx) => {
                    const iconUrl = CHAMPIONSHIPS[titleKey]?.icon;
                    if (iconUrl) {
                        const beltIcon = this.add.image(nameText.x + nameText.width + 10 + (tIdx * 30), nameText.y + 12, titleKey).setDisplaySize(28, 18);
                        this.contentContainer.add(beltIcon);
                    }
                });
            }

            const repText = this.add.text(width * 0.1, y - 5, `${f.weightDivision.toUpperCase()} | RANK #${f.rankings.unified}`, { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD });
            const recordText = this.add.text(width * 0.1, y + 15, `RECORD: ${fighterManager.getRecordString(f.record)}`, { fontSize: '11px', fontFamily: FONTS.TITLE, color: '#888888' });

            // In Camp Shortcut
            const inCamp = calendarManager.getFightersInCamp().some(cf => cf.id === f.id);
            if (inCamp) {
                const campBtn = this.add.graphics();
                const needsAttention = !f.promotionStats?.weeklyPromotionDone || !f.trainingStats?.weeklyTrainingDone;
                campBtn.fillStyle(needsAttention ? 0x00D1FF : 0x222222, 1);
                campBtn.fillRoundedRect(width * 0.65, y + 25, width * 0.25, 30, 15);
                
                const campText = this.add.text(width * 0.775, y + 40, 'PRE-FIGHT', { fontSize: '11px', fontFamily: FONTS.TITLE, color: needsAttention ? '#000000' : '#888888' }).setOrigin(0.5);
                const campZone = this.add.rectangle(width * 0.775, y + 40, width * 0.25, 30, 0, 0).setInteractive({ useHandCursor: true });
                campZone.on('pointerdown', (pointer, x, y, event) => {
                    event.stopPropagation();
                    this.activeTab = 'PRE-FIGHT';
                    this.preFightFighterId = f.id;
                    this.renderActiveTab();
                });
                this.contentContainer.add([campBtn, campText, campZone]);
            }

            // Injury Status
            if (f.injuries && f.injuries.length > 0) {
                const colors = {
                    'INJURED': COLORS.STR_GOLD,
                    'BADLY_INJURED': COLORS.STR_RED,
                    'SEVERELY_INJURED': '#FF00FF' // Bright Purple for severe
                };
                f.injuries.forEach((inj, idx) => {
                    const injuryTxt = this.add.text(width * 0.35, y + 10 + (idx * 15), `${inj.name.toUpperCase()} (${inj.weeksRemaining}w)`, { 
                        fontSize: '10px', fontFamily: FONTS.TITLE, color: colors[inj.severity] || COLORS.STR_RED 
                    });
                    this.contentContainer.add(injuryTxt);
                });
            }

            // Add to container in correct order
            this.contentContainer.add([frame, cardZone, schedBtn, schedText, schedZone, nameText, repText, recordText]);
        });
    }

    renderOpponentSelection(fighter) {
        const { width, height } = this.scale;
        const promoRep = promotionManager.promotion.reputation || 1;
        const opponents = fighterManager.generateOpponentList(fighter, promoRep);

        this.contentContainer.add(this.add.text(width / 2, 30, 'SELECT OPPONENT', {
            fontSize: '28px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const backBtn = this.add.text(20, 10, '← CANCEL', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.opponentSelectionMode = false; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        opponents.forEach((opp, i) => {
            const y = 80 + (i * 60);
            const frame = this.add.graphics();
            frame.fillStyle(0x1A1A1A, 1);
            frame.fillRoundedRect(width * 0.05, y - 25, width * 0.9, 50, 10);
            
            const nameTxt = this.add.text(width * 0.1, y - 10, opp.name.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
            const repTxt = this.add.text(width * 0.1, y + 5, opp.reputationStatus, { fontSize: '10px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD });
            const recTxt = this.add.text(width * 0.45, y + 5, `REC: ${fighterManager.getRecordString(opp.record)}`, { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666666' });
            
            // Interaction zone for the whole frame to view profile
            const profileZone = this.add.rectangle(width * 0.35, y, width * 0.6, 50, 0, 0).setInteractive({ useHandCursor: true });
            profileZone.on('pointerdown', () => {
                this.selectedFighterTab = 'BIO';
                this.selectedFighterId = opp.id;
                this.renderActiveTab();
            });

            // Ensure name is also directly interactive for clarity
            nameTxt.setInteractive({ useHandCursor: true });
            nameTxt.on('pointerdown', () => {
                this.selectedFighterTab = 'BIO';
                this.selectedFighterId = opp.id;
                this.renderActiveTab();
            });

            const btn = this.add.graphics();
            btn.fillStyle(0xFFD700, 1);
            btn.fillRoundedRect(width * 0.7, y - 12, width * 0.2, 24, 12);
            const btnTxt = this.add.text(width * 0.8, y, 'CHOOSE', { fontSize: '10px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
            
            const zone = this.add.rectangle(width * 0.8, y, width * 0.2, 50, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => this.handleNegotiation(fighter, opp));
            
            this.contentContainer.add([frame, nameTxt, repTxt, recTxt, profileZone, btn, btnTxt, zone]);
        });
    }

    handleNegotiation(fighter, opponent) {
        if (fighter.weightDivision !== opponent.weightDivision) {
            this.showStatusModal('INVALID MATCHUP', `${fighter.name} is a ${fighter.weightDivision}, but ${opponent.name} is a ${opponent.weightDivision}. Fighters must be in the same weight division.`, COLORS.RED);
            return;
        }

        const isInternational = fighter.nationality !== opponent.nationality;
        // Opponent selects location if international
        const locationChoice = isInternational ? (Math.random() < 0.8 ? 'AWAY' : 'HOME') : 'HOME';

        // Auto-detect Title Fight: Only if one participant holds a title
        const fighterTitle = fighter.titlesHeld && fighter.titlesHeld.length > 0 ? fighter.titlesHeld[0] : null;
        const opponentTitle = opponent.titlesHeld && opponent.titlesHeld.length > 0 ? opponent.titlesHeld[0] : null;
        const activeTitle = fighterTitle || opponentTitle;
        const rounds = activeTitle ? 12 : calendarManager.getRoundCount(fighter.reputation, false);

        this.negotiationMode = true;
        this.negotiationData = {
            fighter,
            opponent,
            isTitle: !!activeTitle,
            titleKey: activeTitle,
            rematchClause: false,
            date: new Date(calendarManager.currentDate),
            purse: fighterManager.calculateContractDemand(fighter, rounds, 1),
            isInternational,
            location: locationChoice // HOME (Player's country) or AWAY (Opponent's country)
        };
        this.negotiationData.date.setDate(this.negotiationData.date.getDate() + 14); 
        this.renderActiveTab();
    }

    renderNegotiationView() {
        const { width, height } = this.scale;
        const data = this.negotiationData;
        
        this.contentContainer.add(this.add.text(width / 2, 15, 'CONTRACT NEGOTIATION', {
            fontSize: '26px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const backBtn = this.add.text(20, 10, '← BACK', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.negotiationMode = false; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        const promo = promotionManager.promotion;
        const negCost = FINANCIAL_DATA.NEGOTIATION_COST[data.fighter.reputation || 1];

        const fields = [
            { label: 'FIGHTER', value: data.fighter.name.toUpperCase() },
            { label: 'OPPONENT', value: data.opponent.name.toUpperCase() },
            { label: 'EXPECTED PURSE', value: `£${data.purse.toLocaleString()}` },
            { label: 'FIGHT DATE', value: data.date.toLocaleDateString() },
            { label: 'LOCATION', value: data.location === 'HOME' ? promo.location.country.toUpperCase() : data.opponent.nationality.toUpperCase() },
            { label: 'NEGOTIATION FEE', value: `£${negCost.toLocaleString()}` },
            { label: 'TITLE FIGHT', value: data.isTitle ? (data.titleKey || 'YES') : 'NO' }
        ];

        const card = this.add.graphics();
        card.fillStyle(0x1F1F1F, 1);
        card.fillRoundedRect(width * 0.05, 40, width * 0.9, 560, 15);
        this.contentContainer.add(card);

        const fieldStartY = 60;
        fields.forEach((f, i) => {
            const y = fieldStartY + (i * 26);
            this.contentContainer.add(this.add.text(width * 0.1, y, f.label, { fontSize: '9px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }));
            this.contentContainer.add(this.add.text(width * 0.9, y, f.value, { fontSize: '13px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
            
            if (f.label === 'FIGHT DATE' || (f.label === 'LOCATION' && data.isInternational) || f.label === 'EXPECTED PURSE') {
                const zone = this.add.rectangle(width / 2, y + 5, width * 0.9, 22, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => {
                    if (f.label === 'FIGHT DATE') {
                        const d = prompt("Enter Date (YYYY-MM-DD):", data.date.toISOString().split('T')[0]);
                        if (d) {
                            const newDate = new Date(d);
                            if (!isNaN(newDate.getTime())) {
                                data.date = newDate;
                            } else {
                                this.showStatusModal('INVALID DATE', "PLEASE USE YYYY-MM-DD FORMAT.", COLORS.RED);
                            }
                        }
                    } else if (f.label === 'LOCATION') {
                        this.showStatusModal('LOCATION LOCKED', "THE OPPONENT HAS SET THE LOCATION REQUIREMENT FOR THIS INTERNATIONAL BOUT.", COLORS.GOLD);
                    } else if (f.label === 'EXPECTED PURSE') {
                        const rounds = calendarManager.getRoundCount(data.fighter.reputation, data.isTitle, data.titleKey);
                        data.purse = fighterManager.calculateContractDemand(data.fighter, rounds, 1);
                    }
                    this.renderActiveTab();
                });
                this.contentContainer.add(zone);
            }
        });

        // Skills Comparison
        const skillsY = 255;
        this.contentContainer.add(this.add.text(width / 2, skillsY, 'CAPABILITIES COMPARISON', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const colWidth = (width * 0.9) / 2;
        const compareStats = [
            { label: 'POWER', key: 'power', group: 'attack' },
            { label: 'SPEED', key: 'speed', group: 'attack' },
            { label: 'TIMING', key: 'timing', group: 'attack' },
            { label: 'TECH', key: 'technique', group: 'attack' },
            { label: 'COMBOS', key: 'combinations', group: 'attack' },
            { label: 'O-IQ', key: 'offenceIQ', group: 'attack' },
            { label: 'GUARD', key: 'guard', group: 'defence' },
            { label: 'DODGE', key: 'dodge', group: 'defence' },
            { label: 'COUNTER', key: 'counter', group: 'defence' },
            { label: 'CLINCH', key: 'clinch', group: 'defence' },
            { label: 'VISION', key: 'vision', group: 'defence' },
            { label: 'D-IQ', key: 'defenceIQ', group: 'defence' },
            { label: 'HP', key: 'health', group: 'physical' },
            { label: 'STA', key: 'stamina', group: 'physical' },
            { label: 'CHARISMA', key: 'charisma', group: 'none' }
        ];

        // Render Skills in two columns with improved alignment
        compareStats.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const centerX = width * 0.05 + (col * colWidth) + (colWidth / 2);
            const y = skillsY + 30 + (row * 34);
            
            let fVal, oVal;
            if (stat.group === 'none') {
                fVal = data.fighter[stat.key];
                oVal = data.opponent[stat.key];
            } else {
                fVal = data.fighter.skills[stat.group][stat.key];
                oVal = data.opponent.skills[stat.group][stat.key];
            }
            
            // Label (Centered in column)
            this.contentContainer.add(this.add.text(centerX, y, stat.label, { fontSize: '8px', fontFamily: FONTS.BODY, color: '#777', fontWeight: '900' }).setOrigin(0.5));
            
            // Fighter Val (Gold, Left of label)
            this.contentContainer.add(this.add.text(centerX - 40, y, Math.floor(fVal).toString(), { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0.5));
            
            // Opponent Val (Red, Right of label)
            this.contentContainer.add(this.add.text(centerX + 40, y, Math.floor(oVal).toString(), { fontSize: '12px', fontFamily: FONTS.TITLE, color: '#FF4C4C' }).setOrigin(0, 0.5));
        });

        const signBtnY = 565;
        const signBtn = this.add.graphics();
        signBtn.fillStyle(0xFFD700, 1);
        signBtn.fillRoundedRect(width * 0.1, signBtnY - 25, width * 0.8, 50, 25);
        const signTxt = this.add.text(width / 2, signBtnY, 'SIGN AGREEMENT', { fontSize: '18px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
        const signZone = this.add.rectangle(width / 2, signBtnY, width * 0.8, 50, 0, 0).setInteractive({ useHandCursor: true });
        
        signZone.on('pointerdown', () => {
            const totalCost = negCost;
            if (promotionManager.promotion.cash < totalCost) {
                this.showStatusModal('FUNDS ERROR', 'You cannot afford the negotiation fees for this fighter.', COLORS.RED);
                return;
            }
            promotionManager.addTransaction('OFFICE', `NEGOTIATION FEE: ${data.fighter.name.toUpperCase()}`, totalCost, 'EXPENSE');
            
            const result = calendarManager.scheduleFight(data.date, data.fighter, data.isTitle, data.opponent, data.titleKey, data.purse);
            if (result.success) {
                this.negotiationMode = false;
                this.opponentSelectionMode = false;
                this.renderActiveTab();
            } else {
                this.showStatusModal('SCHEDULING ERROR', result.message, COLORS.RED);
            }
        });
        this.contentContainer.add([signBtn, signTxt, signZone]);
    }

    handleSchedule(fighter) {
        if (!fighterManager.isAvailable(fighter)) {
            let reason = 'INJURED/RECOVERING';
            if (fighter.developmentTask) reason = 'UNDERGOING DEVELOPMENT';
            else if (fighter.injuries && fighter.injuries.length > 0) reason = 'INJURED';
            else if (fighter.recoveryUntil && new Date(fighter.recoveryUntil) > calendarManager.currentDate) reason = 'RESTING (POST-FIGHT)';

            this.showStatusModal('SCHEDULE LOCKED', `${fighter.name.toUpperCase()} IS CURRENTLY ${reason}.`, COLORS.RED);
            return;
        }

        // Initial check for 2 weeks in the future (the default fight date)
        const defaultDate = new Date(calendarManager.currentDate);
        defaultDate.setDate(defaultDate.getDate() + 14);
        const check = calendarManager.canScheduleFight(defaultDate, fighter, false);
        
        if (!check.canSchedule) {
            this.showStatusModal('SCHEDULING CONFLICT', check.message, COLORS.RED);
            return;
        }

        this.opponentSelectionMode = true;
        this.schedulingFighter = fighter;
        this.renderActiveTab();
    }

    showStatusModal(title, message, color = COLORS.GOLD, reason = null, fighterId = null) {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.8).setOrigin(0).setInteractive();
        const modal = this.add.container(width * 0.1, height * 0.3);
        
        // Ensure we have a string color for text
        const strColor = color === COLORS.GOLD ? COLORS.STR_GOLD : 
                        (color === COLORS.RED ? COLORS.STR_RED : 
                        (color === COLORS.ACCENT ? COLORS.STR_ACCENT : COLORS.STR_WHITE));

        const bg = this.add.graphics();
        bg.fillStyle(0x1F1F1F, 1);
        bg.fillRoundedRect(0, 0, width * 0.8, 220, 15);
        bg.lineStyle(2, color, 1);
        bg.strokeRoundedRect(0, 0, width * 0.8, 220, 15);
        
        const titleTxt = this.add.text(width * 0.4, 30, title.toUpperCase(), {
            fontSize: '18px', fontFamily: FONTS.TITLE, color: strColor, align: 'center'
        }).setOrigin(0.5);
        
        const msgTxt = this.add.text(width * 0.4, 100, message, {
            fontSize: '14px', fontFamily: FONTS.BODY, color: COLORS.STR_WHITE, align: 'center', wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);
        
        if (reason === 'CONFIRM_RESET') {
            const yesBtn = this.add.graphics().fillStyle(0xCC0000, 1).fillRoundedRect(width * 0.05, 150, width * 0.3, 40, 20);
            const yesTxt = this.add.text(width * 0.2, 170, 'RESET', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#FFF' }).setOrigin(0.5);
            const yesZone = this.add.rectangle(width * 0.2, 170, width * 0.3, 40, 0, 0).setInteractive({ useHandCursor: true });
            
            const noBtn = this.add.graphics().fillStyle(0x444444, 1).fillRoundedRect(width * 0.45, 150, width * 0.3, 40, 20);
            const noTxt = this.add.text(width * 0.6, 170, 'CANCEL', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#FFF' }).setOrigin(0.5);
            const noZone = this.add.rectangle(width * 0.6, 170, width * 0.3, 40, 0, 0).setInteractive({ useHandCursor: true });
            
            yesZone.on('pointerdown', () => {
                saveManager.resetActiveGame();
                this.time.delayedCall(100, () => window.location.reload());
            });

            noZone.on('pointerdown', () => {
                overlay.destroy();
                modal.destroy();
            });
            modal.add([bg, titleTxt, msgTxt, yesBtn, yesTxt, yesZone, noBtn, noTxt, noZone]);
        } else if (reason === 'PROMOTION' || reason === 'TRAINING' || reason === 'PRESS') {
            // Action Button
            const actBtn = this.add.graphics();
            actBtn.fillStyle(0x00D1FF, 1);
            actBtn.fillRoundedRect(width * 0.05, 150, width * 0.35, 40, 20);
            
            let btnLabel = 'PRE-FIGHT';
            let btnAction = () => {
                overlay.destroy();
                modal.destroy();
                this.activeTab = 'PRE-FIGHT';
                if (fighterId) this.preFightFighterId = fighterId;
                this.renderActiveTab();
            };

            if (reason === 'PRESS') {
                btnLabel = 'MEDIA HUB';
                btnAction = () => {
                    overlay.destroy();
                    modal.destroy();
                    this.selectedFighterId = fighterId;
                    this.selectedFighterTab = 'PRESS'; 
                    this.currentPressQuestionIndex = 0; 
                    this.renderActiveTab();
                };
            }

            const actTxt = this.add.text(width * 0.225, 170, btnLabel, { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' }).setOrigin(0.5);
            const actZone = this.add.rectangle(width * 0.225, 170, width * 0.35, 40, 0, 0).setInteractive({ useHandCursor: true });
            actZone.on('pointerdown', btnAction);

            // Cancel/Ok Button
            const okBtn = this.add.graphics();
            okBtn.fillStyle(0x444444, 1);
            okBtn.fillRoundedRect(width * 0.45, 150, width * 0.3, 40, 20);
            const okTxt = this.add.text(width * 0.6, 170, 'CLOSE', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#FFFFFF' }).setOrigin(0.5);
            const okZone = this.add.rectangle(width * 0.6, 170, width * 0.3, 40, 0, 0).setInteractive({ useHandCursor: true });
            okZone.on('pointerdown', () => {
                overlay.destroy();
                modal.destroy();
            });
            modal.add([bg, titleTxt, msgTxt, actBtn, actTxt, actZone, okBtn, okTxt, okZone]);
        } else {
            // Error messages use bright yellow button as requested
            const btnColor = 0xFFFF00; // Bright Yellow
            const btn = this.add.graphics();
            btn.fillStyle(btnColor, 1);
            btn.fillRoundedRect(width * 0.2, 150, width * 0.4, 40, 20);
            const btnTxt = this.add.text(width * 0.4, 170, 'OKAY', { fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' }).setOrigin(0.5);
            const zone = this.add.rectangle(width * 0.4, 170, width * 0.4, 40, 0, 0).setInteractive({ useHandCursor: true });
            
            zone.on('pointerdown', () => {
                overlay.destroy();
                modal.destroy();
            });
            modal.add([bg, titleTxt, msgTxt, btn, btnTxt, zone]);
        }
        
        this.contentContainer.add([overlay, modal]);
    }

    renderMessages() {
        const { width, height } = this.scale;
        this.contentContainer.add(this.add.text(width / 2, 40, 'MESSAGES', { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));
        
        if (!this.messagePage) this.messagePage = 0;
        const messages = messageManager.messages;
        const messagesPerPage = 4;
        const startIdx = this.messagePage * messagesPerPage;
        const pageMessages = messages.slice(startIdx, startIdx + messagesPerPage);

        if (messages.length === 0) {
            this.contentContainer.add(this.add.text(width / 2, 200, 'INBOX EMPTY', { fontSize: '14px', fontFamily: FONTS.BODY, color: '#666666' }).setOrigin(0.5));
        } else {
            pageMessages.forEach((msg, i) => {
                const y = 110 + (i * 105);
                const frameHeight = 95;
                const frame = this.add.graphics();
                frame.fillStyle(msg.read ? 0x1A1A1A : 0x252525, 1);
                frame.fillRoundedRect(width * 0.05, y - 47, width * 0.9, frameHeight, 10);
                frame.lineStyle(1, 0x333333, 1);
                frame.strokeRoundedRect(width * 0.05, y - 47, width * 0.9, frameHeight, 10);
                
                const subject = this.add.text(width * 0.08, y - 35, msg.subject.toUpperCase(), { 
                    fontSize: '15px', 
                    fontFamily: FONTS.TITLE, 
                    color: msg.read ? '#AAAAAA' : COLORS.STR_GOLD,
                    fontWeight: 'bold'
                });
                
                let displayDate = "";
                if (msg.gameDate) {
                    const d = new Date(msg.gameDate);
                    displayDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
                } else {
                    displayDate = new Date(msg.timestamp).toLocaleDateString();
                }

                const timeText = this.add.text(width * 0.92, y - 35, displayDate, { 
                    fontSize: '10px', 
                    fontFamily: FONTS.BODY, 
                    color: '#555555' 
                }).setOrigin(1, 0);
                
                // Replace newlines with spaces for preview to prevent vertical overflow
                const previewText = msg.body.replace(/\n+/g, ' ');
                const preview = previewText.substring(0, 85) + (previewText.length > 85 ? '...' : '');
                
                const bodyText = this.add.text(width * 0.08, y - 5, preview, { 
                    fontSize: '12px', 
                    fontFamily: FONTS.BODY, 
                    color: '#BBBBBB', 
                    wordWrap: { width: width * 0.84 },
                    lineSpacing: 2
                });
                
                const clickZone = this.add.rectangle(width / 2, y, width * 0.9, frameHeight, 0, 0).setInteractive({ useHandCursor: true });
                clickZone.on('pointerdown', () => {
                    this.renderMessagePopout(msg);
                });
                this.contentContainer.add([frame, subject, timeText, bodyText, clickZone]);
            });

            // Pagination Controls
            const paginationY = 110 + (messagesPerPage * 105) + 20;
            const totalPages = Math.ceil(messages.length / messagesPerPage);
            
            if (this.messagePage > 0) {
                const prevBtn = this.add.text(width * 0.25, paginationY, '← PREV', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD })
                    .setOrigin(0.5).setInteractive({ useHandCursor: true });
                prevBtn.on('pointerdown', () => {
                    this.messagePage--;
                    this.renderActiveTab();
                });
                this.contentContainer.add(prevBtn);
            }

            this.contentContainer.add(this.add.text(width * 0.5, paginationY, `PAGE ${this.messagePage + 1} / ${totalPages}`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#888888' }).setOrigin(0.5));

            if (startIdx + messagesPerPage < messages.length) {
                const nextBtn = this.add.text(width * 0.75, paginationY, 'NEXT →', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD })
                    .setOrigin(0.5).setInteractive({ useHandCursor: true });
                nextBtn.on('pointerdown', () => {
                    this.messagePage++;
                    this.renderActiveTab();
                });
                this.contentContainer.add(nextBtn);
            }
        }
    }

    renderMessagePopout(msg) {
        const { width, height } = this.scale;
        
        // Modal Background (darken the screen)
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.85).setOrigin(0).setInteractive();
        
        // Modal Container
        const modal = this.add.container(width * 0.05, height * 0.05);
        
        const card = this.add.graphics();
        card.fillStyle(0x1F1F1F, 1);
        card.fillRoundedRect(0, 0, width * 0.9, height * 0.7, 20);
        card.lineStyle(2, COLORS.GOLD, 1);
        card.strokeRoundedRect(0, 0, width * 0.9, height * 0.7, 20);
        
        const subject = this.add.text(width * 0.45, 40, msg.subject.toUpperCase(), {
            fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, align: 'center', wordWrap: { width: width * 0.8 }
        }).setOrigin(0.5);
        
        let popoutDate = "";
        if (msg.gameDate) {
            const d = new Date(msg.gameDate);
            popoutDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
        } else {
            popoutDate = new Date(msg.timestamp).toLocaleDateString();
        }

        const date = this.add.text(width * 0.45, 80, popoutDate, {
            fontSize: '12px', fontFamily: FONTS.BODY, color: '#666666'
        }).setOrigin(0.5);
        
        const isFinancial = msg.type === 'FINANCIAL_REPORT';
        const bodyText = this.add.text(width * 0.05, 120, msg.body, {
            fontSize: isFinancial ? '13px' : '16px', 
            fontFamily: isFinancial ? 'monospace' : FONTS.BODY, 
            color: COLORS.STR_WHITE, 
            wordWrap: { width: width * 0.8 }, 
            lineSpacing: isFinancial ? 2 : 5
        });

        // Close Button
        const closeBtnY = height * 0.6;
        const closeBtn = this.add.graphics();
        const btnColor = 0xFFFF00; // Bright Yellow
        closeBtn.fillStyle(btnColor, 1);
        closeBtn.fillRoundedRect(width * 0.25, closeBtnY, width * 0.4, 45, 22);
        const closeTxt = this.add.text(width * 0.45, closeBtnY + 22, 'CLOSE', { fontSize: '18px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' }).setOrigin(0.5);
        const closeZone = this.add.rectangle(width * 0.45, closeBtnY + 22, width * 0.4, 45, 0, 0).setInteractive({ useHandCursor: true });
        
        closeZone.on('pointerdown', () => {
            messageManager.markRead(msg.id);
            overlay.destroy();
            modal.destroy();
            this.renderActiveTab();
        });

        // Add Base UI to modal first
        modal.add([card, subject, date, bodyText, closeBtn, closeTxt, closeZone]);

        // Choice Buttons (if any)
        const hasChoices = msg.data && msg.data.choices;
        if (hasChoices) {
            closeBtn.setVisible(false);
            closeTxt.setVisible(false);
            closeZone.disableInteractive();

            const choices = msg.data.choices;
            choices.forEach((choice, i) => {
                const choiceX = (width * 0.05) + (i * (width * 0.45));
                const choiceY = closeBtnY;
                
                const cBtn = this.add.graphics();
                cBtn.fillStyle(choice.color || COLORS.GOLD, 1);
                cBtn.fillRoundedRect(choiceX, choiceY, width * 0.35, 45, 22);
                
                const cTxt = this.add.text(choiceX + (width * 0.35 / 2), choiceY + 22, choice.label.toUpperCase(), { 
                    fontSize: '12px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' 
                }).setOrigin(0.5);
                
                const cZone = this.add.rectangle(choiceX + (width * 0.35 / 2), choiceY + 22, width * 0.35, 45, 0, 0).setInteractive({ useHandCursor: true });
                cZone.on('pointerdown', () => {
                    instanceManager.handleChoice(msg.id, choice.id);
                    overlay.destroy();
                    modal.destroy();
                    this.renderActiveTab();
                });
                modal.add([cBtn, cTxt, cZone]);
            });
        }

        this.contentContainer.add([overlay, modal]);

        if (msg.type === 'CONTRACT_EXPIRY') {
            const actionBtn = this.add.graphics();
            actionBtn.fillStyle(0x00FF00, 1);
            actionBtn.fillRoundedRect(width * 0.2, closeBtnY - 60, width * 0.5, 45, 22);
            const actionTxt = this.add.text(width * 0.45, closeBtnY - 60 + 22, 'GO TO CONTRACT', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
            const actionZone = this.add.rectangle(width * 0.45, closeBtnY - 60 + 22, width * 0.5, 45, 0, 0).setInteractive({ useHandCursor: true });
            actionZone.on('pointerdown', () => {
                messageManager.markRead(msg.id);
                this.selectedFighterId = msg.data.fighterId;
                this.selectedFighterTab = 'CONTRACT';
                this.activeTab = 'ROSTER';
                overlay.destroy();
                modal.destroy();
                this.renderActiveTab();
            });
            modal.add([actionBtn, actionTxt, actionZone]);
        }
    }

    renderFighterProfile(fighterId) {
        const { width, height } = this.scale;
        const f = fighterManager.getFighter(fighterId);
        if (!f) return;
        
        const backBtn = this.add.text(20, 10, '← BACK', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.selectedFighterId = null; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);
        
        // Name Header Container (Centered)
        const nameHeader = this.add.container(width / 2, 40);
        this.contentContainer.add(nameHeader);

        const nameText = this.add.text(0, 0, f.name.toUpperCase(), { 
            fontSize: '24px', 
            fontFamily: FONTS.TITLE, 
            color: COLORS.STR_WHITE,
            wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);
        nameText.updateText(); // Force calculate dimensions
        
        const editIcon = this.add.text(nameText.displayWidth / 2 + 15, 0, '✎', { 
            fontSize: '24px', 
            color: COLORS.STR_GOLD 
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true, padding: 10 });
        
        editIcon.on('pointerdown', () => this.showIdentityEditor(f));
        nameHeader.add([nameText, editIcon]);

        // Nickname Display with always-on Edit Button
        const nickname = f.nickname || "NO NICKNAME";
        const nickText = this.add.text(width / 2, 85, `"${nickname.toUpperCase()}"`, { 
            fontSize: '20px', 
            fontFamily: FONTS.TITLE, 
            color: f.nickname ? COLORS.STR_GOLD : '#444444',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        this.contentContainer.add(nickText);

        const nickEditIcon = this.add.text(nickText.x + (nickText.displayWidth / 2) + 12, 85, '✎', { 
            fontSize: '18px', 
            color: COLORS.STR_GOLD 
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        
        nickEditIcon.on('pointerdown', () => this.showIdentityEditor(f));
        this.contentContainer.add(nickEditIcon);

        // Champion Icon in Profile Header
        if (f.titlesHeld && f.titlesHeld.length > 0) {
            const primaryTitle = f.titlesHeld[0];
            const beltIcon = this.add.image(width * 0.92, 40, primaryTitle).setDisplaySize(44, 30).setOrigin(1, 0.5);
            this.contentContainer.add(beltIcon);
        }

        const subTabs = ['BIO', 'GROWTH', 'DEVELOPMENT', 'CONTRACT', 'HISTORY'];
        const isStable = fighterManager.fighters.some(sf => sf.id === f.id);
        const isPressWeek = calendarManager.isPressWeek(f.id);

        if (isStable && isPressWeek) {
            subTabs.splice(3, 0, 'PRESS'); // Add PRESS tab, maintaining order
        }
        
        const subTabWidth = width / subTabs.length;
        subTabs.forEach((tab, i) => {
            const x = (i * subTabWidth) + (subTabWidth / 2);
            const y = 135;
            const isSelected = this.selectedFighterTab === tab;
            const fontSize = subTabs.length > 5 ? '10px' : (tab === 'DEVELOPMENT' ? '11px' : '12px');
            const txt = this.add.text(x, y, tab, { fontSize: fontSize, fontFamily: FONTS.TITLE, color: isSelected ? COLORS.STR_GOLD : '#666666' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            if (isSelected) this.contentContainer.add(this.add.rectangle(x, y + 15, subTabWidth * 0.4, 2, 0xFFD700));
            txt.on('pointerdown', () => { this.selectedFighterTab = tab; this.renderActiveTab(); });
            this.contentContainer.add(txt);
        });

        const profileContent = this.add.container(0, 165);
        this.contentContainer.add(profileContent);

        if (this.selectedFighterTab === 'BIO') this.renderFighterBio(profileContent, f);
        else if (this.selectedFighterTab === 'GROWTH') this.renderFighterGrowth(profileContent, f);
        else if (this.selectedFighterTab === 'DEVELOPMENT') this.renderFighterDevelopment(profileContent, f);
        else if (this.selectedFighterTab === 'PRESS') this.renderFighterPress(profileContent, f);
        else if (this.selectedFighterTab === 'CONTRACT') this.renderFighterContract(profileContent, f);
        else if (this.selectedFighterTab === 'HISTORY') this.renderFighterHistory(profileContent, f);
    }

    renderFighterDevelopment(container, f) {
        const { width, height } = this.scale;
        const isPlayerFighter = fighterManager.fighters.some(sf => sf.id === f.id);

        if (this.stylePickerOpen) {
            this.renderStylePicker(container, f);
            return;
        }
        if (this.weightPickerOpen) {
            this.renderWeightPicker(container, f);
            return;
        }

        container.add(this.add.text(width / 2, 20, 'CAREER DEVELOPMENT', {
            fontSize: '22px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, letterSpacing: 1
        }).setOrigin(0.5));

        // Development Status Card
        const card = this.add.graphics();
        card.fillStyle(0x1F1F1F, 1);
        card.fillRoundedRect(width * 0.05, 45, width * 0.9, 110, 15);
        container.add(card);

        if (f.developmentTask) {
            container.add(this.add.text(width / 2, 85, 'IN TRANSITION', { fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
            container.add(this.add.text(width / 2, 115, `${f.developmentTask}: ${f.developmentTarget.toUpperCase()}`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));
            container.add(this.add.text(width / 2, 135, `${f.developmentWeeksRemaining} WEEKS REMAINING`, { fontSize: '12px', fontFamily: FONTS.TITLE, color: '#888888' }).setOrigin(0.5));
        } else {
            const stats = [
                { label: 'CURRENT STYLE', val: f.style.toUpperCase() },
                { label: 'CURRENT DIVISION', val: f.weightDivision.toUpperCase() }
            ];

            stats.forEach((s, i) => {
                const y = 75 + (i * 35);
                container.add(this.add.text(width * 0.1, y, s.label, { fontSize: '11px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }));
                container.add(this.add.text(width * 0.9, y, s.val, { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
            });
        }

        if (isPlayerFighter && !f.developmentTask) {
            const hasInjury = f.injuries && f.injuries.length > 0;
            const actions = [
                { 
                    label: 'CHANGE BOXING STYLE', 
                    icon: 'logo-lion', 
                    action: () => { this.stylePickerOpen = true; this.renderActiveTab(); }, 
                    available: !hasInjury 
                },
                { 
                    label: 'CHANGE WEIGHT DIVISION', 
                    icon: 'logo-glove', 
                    action: () => { this.weightPickerOpen = true; this.renderActiveTab(); }, 
                    available: !hasInjury 
                }
            ];

            actions.forEach((a, i) => {
                const y = 175 + (i * 70);
                const btnBg = this.add.graphics();
                btnBg.fillStyle(a.available ? 0x2A2A2A : 0x1A1A1A, 1);
                btnBg.fillRoundedRect(width * 0.05, y, width * 0.9, 60, 12);
                btnBg.lineStyle(1, a.available ? 0x444444 : 0x222222, 1);
                btnBg.strokeRoundedRect(width * 0.05, y, width * 0.9, 60, 12);
                
                const txt = this.add.text(width * 0.15, y + 30, a.label, { fontSize: '16px', fontFamily: FONTS.TITLE, color: a.available ? COLORS.STR_WHITE : '#444' }).setOrigin(0, 0.5);
                
                if (a.available) {
                    const zone = this.add.rectangle(width / 2, y + 30, width * 0.9, 60, 0, 0).setInteractive({ useHandCursor: true });
                    zone.on('pointerdown', a.action);
                    container.add(zone);
                } else if (hasInjury) {
                    const lockTxt = this.add.text(width * 0.9, y + 30, 'LOCKED (INJURED)', { fontSize: '10px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setOrigin(1, 0.5);
                    container.add(lockTxt);
                }
                
                container.add([btnBg, txt]);
            });

            // Note about Intelligence
            const iqTxt = this.add.text(width / 2, 330, 'Career transitions are faster for fighters with high Boxing Intelligence.', {
                fontSize: '11px', fontFamily: FONTS.BODY, color: '#666', align: 'center', wordWrap: { width: width * 0.8 }
            }).setOrigin(0.5);
            container.add(iqTxt);

            // Ranking History Section
            const historyY = 360;
            container.add(this.add.text(width * 0.1, historyY, 'RANKING HISTORY', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
            
            const history = (f.rankingHistory || []).slice(-5).reverse();
            if (history.length === 0) {
                container.add(this.add.text(width / 2, historyY + 40, 'NO HISTORICAL DATA AVAILABLE', { fontSize: '11px', fontFamily: FONTS.BODY, color: '#444' }).setOrigin(0.5));
            } else {
                history.forEach((h, idx) => {
                    const rowY = historyY + 25 + (idx * 25);
                    const date = new Date(h.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                    container.add(this.add.text(width * 0.1, rowY, date.toUpperCase(), { fontSize: '11px', fontFamily: FONTS.BODY, color: '#888' }));
                    container.add(this.add.text(width * 0.9, rowY, `RANK #${h.rank}`, { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
                });
            }

        } else if (isPlayerFighter && f.developmentTask) {
            container.add(this.add.text(width / 2, 300, 'FIGHTER IS FOCUSED ON TRANSITION.\nALL OTHER DEVELOPMENT IS HALTED.', {
                fontSize: '14px', fontFamily: FONTS.BODY, color: '#666666', align: 'center'
            }).setOrigin(0.5));
        }
    }

    renderStylePicker(container, f) {
        const { width, height } = this.scale;
        
        container.add(this.add.text(width / 2, 20, 'SELECT NEW STYLE', { fontSize: '22px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const backBtn = this.add.text(20, 10, '← CANCEL', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.stylePickerOpen = false; this.renderActiveTab(); });
        container.add(backBtn);

        const styles = BOXING_STYLES.filter(s => s !== f.style);
        const IQ = (f.skills.attack.offenceIQ || 0) + (f.skills.defence.defenceIQ || 0);
        
        // Duration Logic: 3-6 months. >100 IQ = 4 months max. >120 IQ = 3 months exactly.
        let minWeeks = 12; // 3 months
        let maxWeeks = 24; // 6 months
        
        if (IQ >= 120) {
            minWeeks = 12;
            maxWeeks = 12;
        } else if (IQ >= 100) {
            minWeeks = 12;
            maxWeeks = 16;
        }

        const weeks = Math.floor(minWeeks + Math.random() * (maxWeeks - minWeeks + 1));

        styles.forEach((style, i) => {
            const y = 60 + (i * 45);
            const bg = this.add.graphics().fillStyle(0x1F1F1F, 1).fillRoundedRect(width * 0.05, y - 20, width * 0.9, 40, 10);
            const txt = this.add.text(width / 2, y, style.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5);
            const zone = this.add.rectangle(width / 2, y, width * 0.9, 40, 0, 0).setInteractive({ useHandCursor: true });
            
            zone.on('pointerdown', () => {
                this.showDevelopmentConfirm(f, 'STYLE', style, weeks);
            });
            
            container.add([bg, txt, zone]);
        });
    }

    renderWeightPicker(container, f) {
        const { width, height } = this.scale;
        container.add(this.add.text(width / 2, 20, 'SELECT WEIGHT DIRECTION', { fontSize: '22px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const backBtn = this.add.text(20, 10, '← CANCEL', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.weightPickerOpen = false; this.renderActiveTab(); });
        container.add(backBtn);

        const currentIdx = WEIGHT_DIVISIONS.findIndex(d => d.name === f.weightDivision);
        const IQ = (f.skills.attack.offenceIQ || 0) + (f.skills.defence.defenceIQ || 0);
        
        // Weight duration: 6-12 months base
        let minWeeks = 24; // 6 months
        let maxWeeks = 48; // 12 months
        
        if (IQ >= 150) { minWeeks = 24; maxWeeks = 24; }
        else if (IQ >= 125) { minWeeks = 24; maxWeeks = 32; }
        else if (IQ >= 100) { minWeeks = 24; maxWeeks = 40; }

        const weeks = Math.floor(minWeeks + Math.random() * (maxWeeks - minWeeks + 1));

        const options = [];
        if (currentIdx < WEIGHT_DIVISIONS.length - 1) options.push({ label: 'MOVE UP', target: WEIGHT_DIVISIONS[currentIdx + 1].name });
        if (currentIdx > 0) options.push({ label: 'MOVE DOWN', target: WEIGHT_DIVISIONS[currentIdx - 1].name });

        options.forEach((opt, i) => {
            const y = 100 + (i * 80);
            const bg = this.add.graphics().fillStyle(0x1F1F1F, 1).fillRoundedRect(width * 0.1, y - 35, width * 0.8, 70, 15);
            const label = this.add.text(width / 2, y - 10, opt.label, { fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
            const target = this.add.text(width / 2, y + 15, opt.target.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5);
            const zone = this.add.rectangle(width / 2, y, width * 0.8, 70, 0, 0).setInteractive({ useHandCursor: true });
            
            zone.on('pointerdown', () => {
                this.showDevelopmentConfirm(f, 'WEIGHT', opt.target, weeks);
            });
            
            container.add([bg, label, target, zone]);
        });
    }

    showDevelopmentConfirm(f, type, target, weeks) {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.95).setOrigin(0).setInteractive();
        const modal = this.add.container(0, 0);
        
        modal.add(this.add.text(width / 2, height * 0.25, 'CONFIRM DEVELOPMENT', { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const body = `TRANSITION: ${type}\nTARGET: ${target.toUpperCase()}\n\nESTIMATED TIME: ${weeks} WEEKS\n\nDURING THIS TIME, THE FIGHTER WILL BE UNAVAILABLE FOR ALL ACTIVITIES.`;
        modal.add(this.add.text(width / 2, height * 0.45, body, { 
            fontSize: '16px', fontFamily: FONTS.BODY, color: COLORS.STR_WHITE, align: 'center', lineSpacing: 8, wordWrap: { width: width * 0.8 } 
        }).setOrigin(0.5));

        const confirmBtn = this.add.graphics().fillStyle(0x00FF00, 1).fillRoundedRect(width * 0.1, height * 0.65, width * 0.8, 55, 27);
        const confirmTxt = this.add.text(width / 2, height * 0.65 + 27, 'START TRANSITION', { fontSize: '20px', fontFamily: FONTS.TITLE, color: '#000' }).setOrigin(0.5);
        const confirmZone = this.add.rectangle(width / 2, height * 0.65 + 27, width * 0.8, 55, 0, 0).setInteractive({ useHandCursor: true });
        
        confirmZone.on('pointerdown', () => {
            fighterManager.startDevelopment(f, type, target, weeks);
            this.stylePickerOpen = false;
            this.weightPickerOpen = false;
            overlay.destroy();
            modal.destroy();
            this.renderActiveTab();
        });

        const cancelBtn = this.add.text(width / 2, height * 0.8, 'CANCEL', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerdown', () => { overlay.destroy(); modal.destroy(); });

        modal.add([confirmBtn, confirmTxt, confirmZone, cancelBtn]);
        this.contentContainer.add([overlay, modal]);
    }

    renderFighterGrowth(container, f) {
        const { width, height } = this.scale;
        const isStable = fighterManager.fighters.some(sf => sf.id === f.id);

        container.add(this.add.text(width / 2, 20, 'FIGHTER GROWTH', {
            fontSize: '22px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, letterSpacing: 1
        }).setOrigin(0.5));

        // Experience Card
        const expCard = this.add.graphics();
        expCard.fillStyle(0x1F1F1F, 1);
        expCard.fillRoundedRect(width * 0.05, 45, width * 0.9, 100, 15);
        container.add(expCard);

        const xpPercent = Math.min(1, (f.xp || 0) / 1000);
        
        container.add(this.add.text(width * 0.1, 70, 'EXPERIENCE (XP)', { fontSize: '11px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }));
        container.add(this.add.text(width * 0.9, 70, `${Math.floor(f.xp || 0)} / 1000`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));

        // XP Bar
        const barX = width * 0.1;
        const barY = 95;
        const barW = width * 0.8;
        const barH = 12;

        const xpBg = this.add.graphics();
        xpBg.fillStyle(0x333333, 1);
        xpBg.fillRoundedRect(barX, barY, barW, barH, 6);
        container.add(xpBg);

        const xpFill = this.add.graphics();
        xpFill.fillStyle(0x00D1FF, 1);
        if (xpPercent > 0) {
            xpFill.fillRoundedRect(barX, barY, barW * xpPercent, barH, 6);
        }
        container.add(xpFill);

        container.add(this.add.text(width * 0.1, 120, 'EXPERIENCE IS GAINED FROM FIGHTS AND USED TO INCREASE REPUTATION.', { fontSize: '9px', fontFamily: FONTS.BODY, color: '#888', wordWrap: { width: width * 0.8 } }));

        // Skill Points Card
        const spY = 160;
        const spCard = this.add.graphics();
        spCard.fillStyle(0x1F1F1F, 1);
        spCard.fillRoundedRect(width * 0.05, spY, width * 0.9, 100, 15);
        container.add(spCard);

        container.add(this.add.text(width * 0.1, spY + 25, 'SKILL POINTS AVAILABLE', { fontSize: '11px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }));
        const pointsStr = (f.skillPoints || 0).toString();
        container.add(this.add.text(width * 0.9, spY + 25, pointsStr, { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0));
        container.add(this.add.text(width * 0.1, spY + 60, 'SKILL POINTS ARE EARNED THROUGH VICTORIES AND USED TO PERMANENTLY UPGRADE BASE SKILLS.', { fontSize: '9px', fontFamily: FONTS.BODY, color: '#888', wordWrap: { width: width * 0.8 } }));

        if (isStable) {
            const canAllocate = f.skillPoints > 0;
            const btnY = 280;
            const btnBg = this.add.graphics();
            btnBg.fillStyle(canAllocate ? 0xFFD700 : 0x2A2A2A, 1);
            btnBg.fillRoundedRect(width * 0.1, btnY, width * 0.8, 50, 25);
            
            if (canAllocate) {
                btnBg.lineStyle(2, 0xFFFFFF, 0.3);
                btnBg.strokeRoundedRect(width * 0.1, btnY, width * 0.8, 50, 25);
            }

            const btnTxt = this.add.text(width / 2, btnY + 25, canAllocate ? 'ALLOCATE SKILL POINTS' : 'NO POINTS TO ALLOCATE', {
                fontSize: '16px', fontFamily: FONTS.TITLE, color: canAllocate ? '#000' : '#666', fontWeight: 'bold'
            }).setOrigin(0.5);
            
            container.add([btnBg, btnTxt]);

            if (canAllocate) {
                const zone = this.add.rectangle(width / 2, btnY + 25, width * 0.8, 50, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => this.showSkillAllocationUI(f));
                container.add(zone);

                // Add a "pulsing" effect to the button if points are available
                this.tweens.add({
                    targets: btnBg,
                    alpha: 0.8,
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });
            }
        }
    }

    showSkillAllocationUI(f) {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.9).setOrigin(0).setInteractive();
        const modal = this.add.container(0, 0);
        
        modal.add(this.add.text(width / 2, 40, 'ALLOCATE SKILL POINTS', { 
            fontSize: '28px', 
            fontFamily: FONTS.TITLE, 
            color: COLORS.STR_GOLD,
            letterSpacing: 2
        }).setOrigin(0.5));
        
        modal.add(this.add.text(width / 2, 75, `AVAILABLE POINTS: ${f.skillPoints}`, { 
            fontSize: '18px', 
            fontFamily: FONTS.TITLE, 
            color: COLORS.STR_WHITE 
        }).setOrigin(0.5));

        const skillKeys = [
            { group: 'attack', key: 'power' }, { group: 'attack', key: 'speed' }, { group: 'attack', key: 'timing' },
            { group: 'attack', key: 'technique' }, { group: 'attack', key: 'combinations' }, { group: 'attack', key: 'offenceIQ' },
            { group: 'defence', key: 'guard' }, { group: 'defence', key: 'dodge' }, { group: 'defence', key: 'counter' },
            { group: 'defence', key: 'clinch' }, { group: 'defence', key: 'vision' }, { group: 'defence', key: 'defenceIQ' }
        ];

        const colWidth = (width * 0.9) / 2;
        const startY = 130;
        const rowHeight = 65;

        skillKeys.forEach((s, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = (width * 0.05) + (col * colWidth);
            const y = startY + (row * rowHeight);
            
            const currentVal = f.skills[s.group][s.key];
            let cost = 1;
            if (currentVal >= 80) cost = 5;
            else if (currentVal >= 70) cost = 2;

            // Skill Box
            const box = this.add.graphics();
            box.fillStyle(0x1A1A1A, 1);
            box.fillRoundedRect(x + 5, y - 25, colWidth - 10, rowHeight - 10, 8);
            box.lineStyle(1, 0x333333, 1);
            box.strokeRoundedRect(x + 5, y - 25, colWidth - 10, rowHeight - 10, 8);
            modal.add(box);

            // Label
            modal.add(this.add.text(x + 15, y - 18, s.key.toUpperCase(), { 
                fontSize: '11px', 
                fontFamily: FONTS.BODY, 
                color: '#888888',
                fontWeight: '900'
            }));

            // Value
            modal.add(this.add.text(x + 15, y + 2, Math.floor(currentVal).toString(), { 
                fontSize: '22px', 
                fontFamily: FONTS.TITLE, 
                color: COLORS.STR_WHITE 
            }).setOrigin(0, 0.5));
            
            const canAfford = f.skillPoints >= cost;
            const btnX = x + colWidth - 55;
            
            // Modern Button
            const btn = this.add.graphics();
            const btnColor = canAfford ? COLORS.ACCENT : 0x333333;
            btn.fillStyle(btnColor, 1);
            btn.fillRoundedRect(btnX, y - 15, 40, 30, 6);
            
            if (canAfford) {
                btn.lineStyle(2, 0xFFFFFF, 0.3);
                btn.strokeRoundedRect(btnX, y - 15, 40, 30, 6);
            }
            modal.add(btn);

            const btnTxt = this.add.text(btnX + 20, y, `+${cost}`, { 
                fontSize: '14px', 
                fontFamily: FONTS.TITLE, 
                color: canAfford ? '#000000' : '#666666',
                fontWeight: '900'
            }).setOrigin(0.5);
            modal.add(btnTxt);

            if (canAfford) {
                const zone = this.add.rectangle(btnX + 20, y, 40, 30, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => {
                    const res = fighterManager.allocateSkillPoint(f.id, s.group, s.key);
                    if (res.success) {
                        // Visual Feedback Effect
                        const floatTxt = this.add.text(btnX + 20, y - 20, `+1`, {
                            fontSize: '24px',
                            fontFamily: FONTS.TITLE,
                            color: '#00FF00',
                            fontWeight: 'bold'
                        }).setOrigin(0.5);

                        this.tweens.add({
                            targets: floatTxt,
                            y: y - 60,
                            alpha: 0,
                            duration: 600,
                            ease: 'Cubic.out',
                            onComplete: () => floatTxt.destroy()
                        });

                        // Flash and Pulse the box
                        const flash = this.add.graphics();
                        flash.fillStyle(0xFFD700, 0.3);
                        flash.fillRoundedRect(x + 5, y - 25, colWidth - 10, rowHeight - 10, 8);
                        modal.add(flash);

                        this.tweens.add({
                            targets: flash,
                            alpha: 0,
                            duration: 400,
                            onComplete: () => {
                                flash.destroy();
                                overlay.destroy();
                                modal.destroy();
                                this.showSkillAllocationUI(f); // Refresh to show new values
                            }
                        });
                    }
                });
                modal.add(zone);
            }
        });

        const closeBtnY = height - 120;
        const closeBtnBg = this.add.graphics();
        closeBtnBg.fillStyle(0x1A1A1A, 1);
        closeBtnBg.fillRoundedRect(width * 0.3, closeBtnY - 20, width * 0.4, 45, 22);
        closeBtnBg.lineStyle(2, COLORS.GOLD, 1);
        closeBtnBg.strokeRoundedRect(width * 0.3, closeBtnY - 20, width * 0.4, 45, 22);
        
        const closeBtnTxt = this.add.text(width / 2, closeBtnY + 2, 'SAVE & EXIT', { 
            fontSize: '18px', 
            fontFamily: FONTS.TITLE, 
            color: COLORS.STR_GOLD,
            letterSpacing: 1
        }).setOrigin(0.5);
        
        const closeZone = this.add.rectangle(width / 2, closeBtnY + 2, width * 0.4, 45, 0, 0).setInteractive({ useHandCursor: true });
        closeZone.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
            this.renderActiveTab();
        });
        
        modal.add([closeBtnBg, closeBtnTxt, closeZone]);
        this.contentContainer.add([overlay, modal]);
    }

    renderFighterPress(container, f) {
        const { width, height } = this.scale;
        const fightEvent = calendarManager.getUpcomingFightEvent(f.id);
        const opponent = fightEvent ? fightEvent.opponent : null;

        // 1. Completion State Check (Top Priority)
        if (f.promotionStats?.pressConferenceDone) {
            const card = this.add.graphics();
            card.fillStyle(0x1A1A1A, 1);
            card.fillRoundedRect(width * 0.05, 0, width * 0.9, 450, 15);
            card.lineStyle(2, 0x00D1FF, 1);
            card.strokeRoundedRect(width * 0.05, 0, width * 0.9, 450, 15);
            container.add(card);

            container.add(this.add.text(width / 2, 80, 'PRESS CONFERENCE COMPLETED', {
                fontSize: '28px', fontFamily: FONTS.TITLE, color: '#00D1FF'
            }).setOrigin(0.5));
            
            container.add(this.add.text(width / 2, 130, 'All media obligations for this bout have been met.', {
                fontSize: '14px', fontFamily: FONTS.BODY, color: '#AAAAAA'
            }).setOrigin(0.5));

            // EXIT BUTTONS
            const btnWidth = width * 0.7;
            const btnX = width * 0.15;
            
            // Exit 1: To Profile
            const btn1Y = 220;
            const btn1Bg = this.add.graphics();
            btn1Bg.fillStyle(0xFFD700, 1);
            btn1Bg.fillRoundedRect(btnX, btn1Y - 25, btnWidth, 50, 25);
            const btn1Txt = this.add.text(width / 2, btn1Y, 'BACK TO FIGHTER BIO', { 
                fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' 
            }).setOrigin(0.5);
            const btn1Zone = this.add.rectangle(width / 2, btn1Y, btnWidth, 50, 0, 0).setInteractive({ useHandCursor: true });
            btn1Zone.on('pointerdown', () => {
                this.selectedFighterTab = 'BIO';
                this.renderActiveTab();
            });
            container.add([btn1Bg, btn1Txt, btn1Zone]);

            // Exit 2: To Dashboard
            const btn2Y = 290;
            const btn2Bg = this.add.graphics();
            btn2Bg.fillStyle(0x00D1FF, 1);
            btn2Bg.fillRoundedRect(btnX, btn2Y - 25, btnWidth, 50, 25);
            const btn2Txt = this.add.text(width / 2, btn2Y, 'RETURN TO DASHBOARD', { 
                fontSize: '16px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' 
            }).setOrigin(0.5);
            const btn2Zone = this.add.rectangle(width / 2, btn2Y, btnWidth, 50, 0, 0).setInteractive({ useHandCursor: true });
            btn2Zone.on('pointerdown', () => {
                this.selectedFighterId = null;
                this.activeTab = 'DASHBOARD';
                this.renderActiveTab();
            });
            container.add([btn2Bg, btn2Txt, btn2Zone]);
            
            return;
        }

        // 2. Active Session logic
        const questions = calendarManager.getPressConferenceQuestions(f);
        if (this.currentPressQuestionIndex === undefined || this.currentPressQuestionIndex === null) {
            this.currentPressQuestionIndex = 0;
        }
        
        const qIndex = this.currentPressQuestionIndex;
        const question = questions[qIndex];

        if (!question) {
            // End of session reached
            f.promotionStats.pressConferenceDone = true;
            f.promotionStats.weeklyPromotionDone = true;
            
            // Send the summary message with stat gains
            fighterManager.sendPressConferenceSummary(f);
            
            fighterManager.save();
            this.currentPressQuestionIndex = 0;
            
            // Cleanly render the completion screen and THEN show the modal
            this.renderActiveTab(); 
            this.showStatusModal('SESSION COMPLETE', 'The press conference has concluded. Your fighter made their statement.', COLORS.ACCENT);
            return;
        }

        const card = this.add.graphics();
        card.fillStyle(0x1A1A1A, 1);
        card.fillRoundedRect(width * 0.05, 0, width * 0.9, height * 0.65, 15);
        container.add(card);

        container.add(this.add.text(width / 2, 30, `QUESTION ${qIndex + 1} OF ${questions.length}`, {
            fontSize: '14px', fontFamily: FONTS.TITLE, color: '#888888'
        }).setOrigin(0.5));

        container.add(this.add.text(width / 2, 80, question.text, {
            fontSize: '20px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, align: 'center', wordWrap: { width: width * 0.8 }
        }).setOrigin(0.5));

        // Options Area
        const personality = f.personality || FIGHTER_PERSONALITIES.NORMAL;
        const options = question.options[personality] || [];

        options.forEach((opt, idx) => {
            const y = 160 + (idx * 85);
            const btnBg = this.add.graphics();
            btnBg.fillStyle(0x333333, 1);
            btnBg.fillRoundedRect(width * 0.1, y - 35, width * 0.8, 70, 10);
            btnBg.lineStyle(2, COLORS.GOLD, 0.5);
            btnBg.strokeRoundedRect(width * 0.1, y - 35, width * 0.8, 70, 10);
            
            const btnTxt = this.add.text(width / 2, y, opt.text, {
                fontSize: '12px', fontFamily: FONTS.BODY, color: COLORS.STR_WHITE, align: 'center', wordWrap: { width: width * 0.7 }
            }).setOrigin(0.5);

            const zone = this.add.rectangle(width / 2, y, width * 0.8, 70, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                const result = fighterManager.executePressConferenceQuestion(f, opponent, question, idx);
                this.showPressResponse(result);
            });

            container.add([btnBg, btnTxt, zone]);
        });
    }

    showPressResponse(result) {
        const { width, height } = this.scale;
        
        // Use depth to ensure it's on top of EVERYTHING including bottom tabs
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.95)
            .setOrigin(0)
            .setInteractive()
            .setDepth(2000);
            
        const modal = this.add.container(0, 0).setDepth(2001);
        
        const f = fighterManager.getFighter(this.selectedFighterId);
        const fightEvent = calendarManager.getUpcomingFightEvent(f.id);
        const opponent = fightEvent ? fightEvent.opponent : { name: 'OPPONENT' };

        // Fighter Quote
        modal.add(this.add.text(width / 2, height * 0.2, f.name.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        modal.add(this.add.text(width / 2, height * 0.28, `"${result.fighterResponse.text}"`, { 
            fontSize: '18px', fontFamily: FONTS.BODY, color: COLORS.STR_WHITE, align: 'center', wordWrap: { width: width * 0.8 }, fontStyle: 'italic'
        }).setOrigin(0.5));

        // Opponent Quote (if exists)
        if (result.opponentResponse) {
            modal.add(this.add.text(width / 2, height * 0.45, (opponent.name || 'OPPONENT').toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#FF4C4C' }).setOrigin(0.5));
            modal.add(this.add.text(width / 2, height * 0.52, `"${result.opponentResponse.text}"`, { 
                fontSize: '18px', fontFamily: FONTS.BODY, color: COLORS.STR_WHITE, align: 'center', wordWrap: { width: width * 0.8 }, fontStyle: 'italic'
            }).setOrigin(0.5));
        }

        // Consequences
        const effects = [];
        if (result.fighterResponse.xp) effects.push(`+${result.fighterResponse.xp} XP`);
        if (result.fighterResponse.reputation) effects.push(`+${result.fighterResponse.reputation} REP`);
        if (result.fighterResponse.tickets) effects.push(`+${result.fighterResponse.tickets} TICKETS`);
        if (result.fighterResponse.viewership) effects.push(`+${result.fighterResponse.viewership}% HYPE`);

        if (effects.length > 0) {
            modal.add(this.add.text(width / 2, height * 0.65, effects.join(' | '), { 
                fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_ACCENT 
            }).setOrigin(0.5));
        }

        const btnY = height * 0.78;
        const nextBtn = this.add.graphics();
        nextBtn.fillStyle(0xFFD700, 1);
        nextBtn.fillRoundedRect(width * 0.25, btnY - 30, width * 0.5, 60, 30);
        
        const nextTxt = this.add.text(width / 2, btnY, 'CONTINUE', { 
            fontSize: '20px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' 
        }).setOrigin(0.5);
        
        const nextZone = this.add.rectangle(width / 2, btnY, width * 0.5, 60, 0, 0).setInteractive({ useHandCursor: true });
        
        nextZone.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
            this.currentPressQuestionIndex++;
            this.renderActiveTab();
        });

        modal.add([nextBtn, nextTxt, nextZone]);
    }

    showIdentityEditor(f) {
        // Remove any existing editor
        const existing = document.getElementById('fighter-identity-editor');
        if (existing) existing.remove();

        const editor = document.createElement('div');
        editor.id = 'fighter-identity-editor';
        Object.assign(editor.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '1000',
            fontFamily: '"Bebas Neue", sans-serif',
            color: '#FFD700',
            backdropFilter: 'blur(10px)'
        });

        const title = document.createElement('h2');
        title.innerText = 'EDIT FIGHTER IDENTITY';
        title.style.marginBottom = '20px';
        title.style.letterSpacing = '2px';

        const createInput = (label, value, isNickname = false) => {
            const container = document.createElement('div');
            container.style.width = '80%';
            container.style.marginBottom = '20px';

            const l = document.createElement('label');
            l.innerText = label;
            l.style.display = 'block';
            l.style.fontSize = '12px';
            l.style.color = '#888';
            l.style.marginBottom = '5px';

            const input = document.createElement('textarea'); // Use textarea for "ridiculous" lengths
            input.value = value;
            input.placeholder = label;
            input.maxLength = 100000; // Ridiculous length
            Object.assign(input.style, {
                width: '100%',
                padding: '12px',
                backgroundColor: '#1A1A1A',
                border: '1px solid #FFD700',
                color: '#FFF',
                fontFamily: '"Inter", sans-serif',
                borderRadius: '8px',
                outline: 'none',
                minHeight: '60px'
            });

            input.oninput = () => {
                if (isNickname) f.nickname = input.value;
                else f.name = input.value;
                fighterManager.save(); // Autosave
            };

            container.appendChild(l);
            container.appendChild(input);
            return container;
        };

        const nameField = createInput('FULL NAME', f.name);
        const nickField = createInput('NICKNAME', f.nickname || "", true);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = 'SAVE & CLOSE';
        Object.assign(closeBtn.style, {
            padding: '12px 40px',
            backgroundColor: '#FFD700',
            color: '#000',
            border: 'none',
            borderRadius: '25px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '20px',
            fontFamily: '"Bebas Neue", sans-serif'
        });

        closeBtn.onclick = () => {
            editor.remove();
            this.renderActiveTab(); // Refresh Phaser UI
        };

        editor.appendChild(title);
        editor.appendChild(nameField);
        editor.appendChild(nickField);
        editor.appendChild(closeBtn);
        document.body.appendChild(editor);
    }

    renderFighterBio(container, f) {
        const { width } = this.scale;
        const age = fighterManager.calculateAge(f.dob);
        
        const nationality = NATIONALITIES.find(n => n.code === f.nationality);
        const nationalityName = nationality ? nationality.name : f.nationality;

        const details = [
            { label: 'STATUS', value: f.reputationStatus }, 
            { label: 'NATIONALITY', value: nationalityName },
            { label: 'DIVISION', value: f.weightDivision }, 
            { label: 'STYLE', value: f.style }, 
            { label: 'RECORD', value: fighterManager.getRecordString(f.record) },
            { label: 'AGE', value: age.toString() },
            { label: 'PERSONALITY', value: f.personality.toUpperCase() },
            { label: 'CHARISMA', value: `${f.charisma}/100` }
        ];

        details.forEach((d, i) => {
            const col = i % 2; const row = Math.floor(i / 2);
            const x = width * (0.05 + (col * 0.45)); const y = row * 40; // Tighter row spacing
            container.add([
                this.add.text(x, y, d.label, { fontSize: '10px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }), 
                this.add.text(x, y + 12, d.value.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE })
            ]);
        });

        // Skills Grid
        const skillGroups = [
            { name: 'OFFENCE', data: f.skills.attack, color: COLORS.STR_GOLD }, 
            { name: 'DEFENCE', data: f.skills.defence, color: COLORS.STR_GOLD }, 
            { name: 'PHYSICAL', data: f.skills.physical, color: COLORS.STR_GOLD }
        ];

        let startY = 160; 
        skillGroups.forEach(group => {
            container.add(this.add.text(width * 0.05, startY, group.name, { fontSize: '12px', fontFamily: FONTS.TITLE, color: group.color }));
            startY += 20;
            
            const entries = Object.entries(group.data);
            entries.forEach(([key, val], i) => {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const x = width * (0.05 + (col * 0.3));
                const y = startY + (row * 35); // Tighter spacing to ensure Physical fits
                
                const label = this.add.text(x, y, key.toUpperCase(), { fontSize: '8px', fontFamily: FONTS.BODY, color: '#666666', fontWeight: '900' });
                const valTxt = this.add.text(x, y + 10, Math.floor(val).toString(), { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
                container.add([label, valTxt]);
                
                if (i === entries.length - 1) startY = y + 40;
            });
        });
    }



    renderFighterContract(container, f) {
        const { width } = this.scale;
        const isStable = fighterManager.fighters.some(sf => sf.id === f.id);
        
        const card = this.add.graphics(); 
        card.fillStyle(0x1F1F1F, 1); 
        card.fillRoundedRect(width * 0.05, 0, width * 0.9, 250, 15); 
        container.add(card);

        const expectedPurse = fighterManager.calculateContractDemand(f, 4, 1);
        const careerRecord = fighterManager.getTotalCareerRecord(f);
        const contractInfo = [
            { label: 'STATUS', value: isStable ? 'CONTRACTED' : 'FREE AGENT' }, 
            { label: 'CAREER TOTAL', value: careerRecord },
            { label: 'FIGHTS REMAINING', value: isStable ? `${f.contract.fightsRemaining}` : 'N/A' }, 
            { label: 'EST. BASE PURSE', value: `£${expectedPurse.toLocaleString()}` }, 
            { label: 'MARKET VALUE', value: f.reputation >= 8 ? 'ELITE' : (f.reputation >= 4 ? 'ESTABLISHED' : 'PROSPECT') }
        ];

        contractInfo.forEach((info, i) => {
            const y = 20 + (i * 40);
            container.add([
                this.add.text(width * 0.1, y, info.label, { fontSize: '11px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }), 
                this.add.text(width * 0.9, y, info.value, { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0)
            ]);
        });

        const btnY = 210;
        const btnBg = this.add.graphics(); 
        btnBg.fillStyle(isStable ? 0xFFD700 : 0x00FF00, 1); 
        btnBg.fillRoundedRect(width * 0.2, btnY, width * 0.6, 35, 17);
        
        const btnTxt = this.add.text(width / 2, btnY + 17, isStable ? 'RENEGOTIATE' : 'OFFER CONTRACT', { fontSize: '14px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5);
        const zone = this.add.rectangle(width / 2, btnY + 17, width * 0.6, 35, 0, 0).setInteractive({ useHandCursor: true });
        
        zone.on('pointerdown', () => {
            this.showContractOfferUI(f, isStable);
        });
        container.add([btnBg, btnTxt, zone]);
    }

    showContractOfferUI(f, isStable) {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.9).setOrigin(0).setInteractive();
        const modal = this.add.container(0, 0);
        
        const promoRep = promotionManager.promotion.reputation || 1;
        
        // Reputation Check for hiring
        if (!isStable && f.reputation > promoRep) {
            this.showStatusModal('OFFER REJECTED', `${f.name.toUpperCase()} is not interested in signing with a Level ${promoRep} promotion. "I'm looking for a bigger platform," says their manager.`, COLORS.RED);
            overlay.destroy();
            return;
        }

        modal.add(this.add.text(width / 2, 60, isStable ? 'RENEGOTIATE CONTRACT' : 'NEW CONTRACT OFFER', { fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        modal.add(this.add.text(width / 2, 90, f.name.toUpperCase(), { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));

        const lengths = [1, 2, 3, 4, 5];
        lengths.forEach((len, i) => {
            const y = 160 + (i * 75);
            const purse = fighterManager.calculateContractDemand(f, 4, len);
            const canAfford = promotionManager.promotion.cash >= purse;

            const bg = this.add.graphics();
            bg.fillStyle(0x1F1F1F, 1);
            bg.fillRoundedRect(width * 0.1, y - 30, width * 0.8, 65, 12);
            bg.lineStyle(2, canAfford ? (isStable ? COLORS.GOLD : 0x00FF00) : 0x444444, 1);
            bg.strokeRoundedRect(width * 0.1, y - 30, width * 0.8, 65, 12);
            modal.add(bg);

            modal.add(this.add.text(width * 0.15, y - 10, `${len} FIGHT${len > 1 ? 'S' : ''} DEAL`, { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }));
            modal.add(this.add.text(width * 0.15, y + 10, `PURSE PER FIGHT: £${purse.toLocaleString()}`, { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));

            const actionTxt = isStable ? 'RENEW' : 'SIGN';
            const btnBg = this.add.graphics();
            btnBg.fillStyle(canAfford ? (isStable ? 0xFFD700 : 0x00FF00) : 0x444444, 1);
            btnBg.fillRoundedRect(width * 0.65, y - 15, width * 0.2, 30, 15);
            modal.add(btnBg);

            modal.add(this.add.text(width * 0.75, y, actionTxt, { fontSize: '12px', fontFamily: FONTS.TITLE, color: '#000000' }).setOrigin(0.5));

            if (canAfford) {
                const zone = this.add.rectangle(width * 0.5, y, width * 0.8, 65, 0, 0).setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => {
                    if (isStable) {
                        fighterManager.renewContract(f.id, len);
                        this.showStatusModal('CONTRACT RENEWED', `${f.name.toUpperCase()} has signed a new ${len}-fight extension.`, COLORS.GOLD);
                    } else {
                        fighterManager.hireFighter(f.id);
                        f.contract.fightsRemaining = len; // Ensure the specific length is applied
                        promotionManager.deductExpenses(purse);
                        this.showStatusModal('CONTRACT SIGNED', `${f.name.toUpperCase()} has joined your stable on a ${len}-fight deal.`, COLORS.GOLD);
                    }
                    overlay.destroy();
                    modal.destroy();
                    this.renderActiveTab();
                });
                modal.add(zone);
            }
        });

        const cancelBtn = this.add.text(width / 2, height - 100, 'CANCEL', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cancelBtn.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
        });
        modal.add(cancelBtn);

        this.contentContainer.add([overlay, modal]);
    }

    renderFighterHistory(container, f) {
        const { width, height } = this.scale;
        
        // 1. Records Summary
        const stats = [
            { label: 'WINS', value: f.record.wins, color: '#00FF00' }, 
            { label: 'LOSSES', value: f.record.losses, color: '#FF0000' }, 
            { label: 'DRAWS', value: f.record.draws, color: '#FFFFFF' }
        ];
        
        stats.forEach((s, i) => {
            const x = width * (0.05 + (i * 0.3));
            const y = 30;
            container.add([
                this.add.text(x, y, s.label, { fontSize: '10px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }), 
                this.add.text(x, y + 15, s.value.toString(), { fontSize: '20px', fontFamily: FONTS.TITLE, color: s.color })
            ]);
        });

        // 2. Recent Fights List
        const listY = 100;
        container.add(this.add.text(width * 0.05, listY, 'RECENT BOUTS', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
        
        const history = (f.fightHistory || []).slice(0, 5); // Show fewer in the "simplified" view
        if (history.length === 0) {
            container.add(this.add.text(width / 2, listY + 50, 'NO BOUTS RECORDED', { fontSize: '12px', fontFamily: FONTS.BODY, color: '#666' }).setOrigin(0.5));
        } else {
            history.forEach((h, i) => {
                const y = listY + 35 + (i * 55);
                const frame = this.add.graphics();
                frame.fillStyle(0x1A1A1A, 1);
                frame.fillRoundedRect(width * 0.05, y - 25, width * 0.9, 50, 8);
                container.add(frame);

                const date = new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const dateTxt = this.add.text(width * 0.08, y - 18, date.toUpperCase(), { fontSize: '9px', color: '#555', fontFamily: FONTS.TITLE });
                const oppTxt = this.add.text(width * 0.08, y, h.opponentName.toUpperCase(), { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
                
                const resultColor = h.won ? '#00FF00' : (h.outcome === 'DRAW' ? '#FFF' : '#FF0000');
                const resultType = h.method === 'KO' ? 'KO' : (h.round < 12 ? 'TKO' : 'DEC');
                const resultLabel = `${h.method} (${resultType})`;
                
                const resultTxt = this.add.text(width * 0.92, y - 5, resultLabel, { fontSize: '16px', fontFamily: FONTS.TITLE, color: resultColor }).setOrigin(1, 0.5);
                const roundTxt = this.add.text(width * 0.92, y + 10, `RD ${h.round}`, { fontSize: '10px', fontFamily: FONTS.TITLE, color: '#666' }).setOrigin(1, 0.5);
                
                container.add([dateTxt, oppTxt, resultTxt, roundTxt]);

                if (h.isTitleFight && h.titleKey) {
                    const titleIcon = this.add.image(width * 0.55, y, h.titleKey).setDisplaySize(28, 18).setOrigin(0.5);
                    container.add(titleIcon);
                }
            });

            // "View Full History" Button
            const fullHistoryBtnY = listY + 35 + (history.length * 55) + 10;
            const fullHistoryBtn = this.add.graphics();
            fullHistoryBtn.fillStyle(0x333333, 1);
            fullHistoryBtn.fillRoundedRect(width * 0.25, fullHistoryBtnY - 20, width * 0.5, 36, 18);
            
            const fullHistoryTxt = this.add.text(width / 2, fullHistoryBtnY - 2, 'VIEW FULL HISTORY', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
            const fullHistoryZone = this.add.rectangle(width / 2, fullHistoryBtnY - 2, width * 0.5, 36, 0, 0).setInteractive({ useHandCursor: true });
            fullHistoryZone.on('pointerdown', () => this.showFullHistoryModal(f));
            
            container.add([fullHistoryBtn, fullHistoryTxt, fullHistoryZone]);
        }

        // 3. Title Victories Section (Bottom anchored)
        const titleY = listY + 80 + (history.length * 55) + (history.length > 0 ? 30 : 0);
        const titleVictories = f.titleVictories || {};
        const hasTitles = Object.values(titleVictories).some(v => v > 0);

        if (hasTitles) {
            container.add(this.add.text(width * 0.05, titleY, 'TITLE ACCOLADES', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
            
            const titleEntries = Object.entries(titleVictories).filter(([k, v]) => v > 0);
            titleEntries.forEach(([key, val], i) => {
                const y = titleY + 30 + (i * 35);
                const titleData = CHAMPIONSHIPS[key];
                if (!titleData) return;

                const icon = this.add.image(width * 0.05, y + 10, titleData.icon).setDisplaySize(30, 20).setOrigin(0, 0.5);
                const name = this.add.text(width * 0.18, y + 10, titleData.name.toUpperCase(), { fontSize: '11px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0, 0.5);
                const count = this.add.text(width * 0.9, y + 10, `x${val}`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(1, 0.5);
                container.add([icon, name, count]);
            });
        }
    }

    showFullHistoryModal(f) {
        const { width, height } = this.scale;
        
        // Modal Background (darken the screen)
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.9).setOrigin(0).setInteractive();
        
        // Modal Container
        const modal = this.add.container(width * 0.05, height * 0.1);
        
        const card = this.add.graphics();
        card.fillStyle(0x111111, 1);
        card.fillRoundedRect(0, 0, width * 0.9, height * 0.75, 20);
        card.lineStyle(2, COLORS.GOLD, 1);
        card.strokeRoundedRect(0, 0, width * 0.9, height * 0.75, 20);
        
        const title = this.add.text(width * 0.45, 30, 'CAREER FIGHT HISTORY', {
            fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD, align: 'center'
        }).setOrigin(0.5);

        const subTitle = this.add.text(width * 0.45, 55, f.name.toUpperCase(), {
            fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE
        }).setOrigin(0.5);
        
        const history = f.fightHistory || [];
        const pageSize = 12;
        let currentPage = 0;
        const totalPages = Math.ceil(history.length / pageSize);

        const listContainer = this.add.container(0, 80);
        
        const renderPage = (page) => {
            listContainer.removeAll(true);
            const start = page * pageSize;
            const end = Math.min(start + pageSize, history.length);
            const pageItems = history.slice(start, end);

            pageItems.forEach((h, i) => {
                const y = i * 42;
                const date = new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
                
                const dateTxt = this.add.text(width * 0.05, y, date, { fontSize: '10px', color: '#555', fontFamily: FONTS.TITLE });
                const oppTxt = this.add.text(width * 0.22, y, h.opponentName.toUpperCase(), { fontSize: '13px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE });
                
                const resultColor = h.won ? '#00FF00' : (h.outcome === 'DRAW' ? '#FFF' : '#FF0000');
                const resultLabel = h.method + (h.round ? ` (R${h.round})` : '');
                const resultTxt = this.add.text(width * 0.85, y, resultLabel, { 
                    fontSize: '13px', fontFamily: FONTS.TITLE, color: resultColor 
                }).setOrigin(1, 0);
                
                listContainer.add([dateTxt, oppTxt, resultTxt]);

                if (h.isTitleFight && h.titleKey) {
                    const titleIcon = this.add.image(width * 0.58, y + 8, CHAMPIONSHIPS[h.titleKey].icon).setDisplaySize(20, 12).setOrigin(0.5);
                    listContainer.add(titleIcon);
                }

                // Separator line
                if (i < pageItems.length - 1) {
                    const line = this.add.graphics();
                    line.lineStyle(1, 0x222222, 1);
                    line.lineBetween(width * 0.05, y + 25, width * 0.85, y + 25);
                    listContainer.add(line);
                }
            });

            // Page Indicator
            if (totalPages > 1) {
                const pageTxt = this.add.text(width * 0.45, pageSize * 42 + 20, `PAGE ${page + 1} / ${totalPages}`, {
                    fontSize: '12px', fontFamily: FONTS.TITLE, color: '#666'
                }).setOrigin(0.5);
                listContainer.add(pageTxt);

                // Arrows
                if (page > 0) {
                    const prevBtn = this.add.text(width * 0.15, pageSize * 42 + 20, '◀ PREV', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    prevBtn.on('pointerdown', () => renderPage(page - 1));
                    listContainer.add(prevBtn);
                }
                if (page < totalPages - 1) {
                    const nextBtn = this.add.text(width * 0.75, pageSize * 42 + 20, 'NEXT ▶', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                    nextBtn.on('pointerdown', () => renderPage(page + 1));
                    listContainer.add(nextBtn);
                }
            }
        };

        renderPage(0);

        // Close Button
        const closeBtnY = height * 0.68;
        
        // Back Button (Alternative to close)
        const backBtn = this.add.text(width * 0.08, 30, '← BACK', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
        });

        const closeBtn = this.add.graphics();
        closeBtn.fillStyle(0xFFFF00, 1); // Bright Yellow
        closeBtn.fillRoundedRect(width * 0.25, closeBtnY, width * 0.4, 45, 22);
        
        const closeTxt = this.add.text(width * 0.45, closeBtnY + 22, 'CLOSE', { 
            fontSize: '18px', fontFamily: FONTS.TITLE, color: '#000000', fontWeight: 'bold' 
        }).setOrigin(0.5);
        
        const closeZone = this.add.rectangle(width * 0.45, closeBtnY + 22, width * 0.4, 45, 0, 0).setInteractive({ useHandCursor: true });
        
        closeZone.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
        });

        modal.add([card, title, subTitle, listContainer, closeBtn, closeTxt, closeZone, backBtn]);
        this.contentContainer.add([overlay, modal]);
    }

    renderOffice() {
        const { width } = this.scale; 
        const promo = promotionManager.promotion;
        
        const backBtn = this.add.text(20, 10, '← DASHBOARD', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.dashboardSubView = 'MAIN'; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        this.contentContainer.add(this.add.text(width / 2, 60, "PROMOTER'S OFFICE", { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));
        
        // Show logo: Use URL as key if available
        const logoKey = promo.logoUrl || promo.logoKey;
        const logoImg = this.add.image(width / 2, 180, logoKey);
        logoImg.setDisplaySize(120, 120);
        this.contentContainer.add(logoImg);

        // Customize Logo Button
        const custBtnY = 260;
        const custBtn = this.add.graphics();
        custBtn.fillStyle(0x333333, 1);
        custBtn.fillRoundedRect(width * 0.25, custBtnY - 15, width * 0.5, 30, 15);
        const custTxt = this.add.text(width / 2, custBtnY, 'CHANGE LOGO', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5);
        const custZone = this.add.rectangle(width / 2, custBtnY, width * 0.5, 30, 0, 0).setInteractive({ useHandCursor: true });
        custZone.on('pointerdown', () => this.showLogoPicker());
        this.contentContainer.add([custBtn, custTxt, custZone]);

        const details = [{ label: 'PROMOTION NAME', value: promo.name }, { label: 'CHIEF PROMOTER', value: promo.promoter }, { label: 'BRAND SLOGAN', value: promo.slogan || 'NO SLOGAN' }];
        details.forEach((d, i) => {
            const y = 330 + (i * 60);
            this.contentContainer.add([this.add.text(width / 2, y, d.label, { fontSize: '12px', fontFamily: FONTS.BODY, fontWeight: '900', color: '#666666' }).setOrigin(0.5), this.add.text(width / 2, y + 25, d.value.toUpperCase(), { fontSize: '22px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE, align: 'center', wordWrap: { width: width * 0.8 } }).setOrigin(0.5)]);
        });

        // Activities Button
        const actBtnY = 510;
        const actBtn = this.add.graphics();
        actBtn.fillStyle(0x333333, 1);
        actBtn.fillRoundedRect(width * 0.1, actBtnY, width * 0.8, 50, 25);
        const actTxt = this.add.text(width / 2, actBtnY + 25, 'PROMOTER ACTIVITIES', { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5);
        const actZone = this.add.rectangle(width / 2, actBtnY + 25, width * 0.8, 50, 0, 0).setInteractive({ useHandCursor: true });
        actZone.on('pointerdown', () => this.showStatusModal('UNDER REVIEW', 'PROMOTER ACTIVITIES ARE CURRENTLY UNDER STRATEGIC REVIEW.', COLORS.GOLD));
        this.contentContainer.add([actBtn, actTxt, actZone]);

        const resetBtn = this.add.graphics(); resetBtn.fillStyle(0x331111, 1); resetBtn.fillRoundedRect(width * 0.1, 580, width * 0.8, 55, 27);
        const resetTxt = this.add.text(width / 2, 607, 'LIQUIDATE PROMOTION', { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED, letterSpacing: 1 }).setOrigin(0.5);
        const zone = this.add.rectangle(width / 2, 607, width * 0.8, 55, 0, 0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => { if (confirm('Delete this promotion?')) { promotionManager.reset(); this.scene.start('SetupScene'); } });
        this.contentContainer.add([resetBtn, resetTxt, zone]);
    }

    showLogoPicker() {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, -80, width, height + 80, 0x000000, 0.9).setOrigin(0).setInteractive();
        const modal = this.add.container(0, 0);
        
        const card = this.add.graphics();
        card.fillStyle(0x111111, 1);
        card.fillRoundedRect(width * 0.05, height * 0.05, width * 0.9, height * 0.8, 20);
        card.lineStyle(2, COLORS.GOLD, 1);
        card.strokeRoundedRect(width * 0.05, height * 0.05, width * 0.9, height * 0.8, 20);
        
        const title = this.add.text(width / 2, height * 0.1, 'CHOOSE BRAND LOGO', {
            fontSize: '24px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD
        }).setOrigin(0.5);

        // Scrollable Logo Grid
        const logoArea = this.add.container(width * 0.1, height * 0.15);
        const cols = 4;
        const logoSpacing = (width * 0.8) / cols;
        const rowHeight = logoSpacing + 10;
        
        const gridContainer = this.add.container(0, 0);
        logoArea.add(gridContainer);

        LOGO_OPTIONS.forEach((opt, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = col * logoSpacing + logoSpacing / 2;
            const y = row * rowHeight + logoSpacing / 2;
            
            const itemBg = this.add.graphics();
            itemBg.fillStyle(0x1F1F1F, 1);
            itemBg.fillRoundedRect(x - logoSpacing / 2.5, y - logoSpacing / 2.5, logoSpacing * 0.8, logoSpacing * 0.8, 10);
            
            const icon = this.add.image(x, y, opt.url).setDisplaySize(50, 50);
            const zone = this.add.rectangle(x, y, logoSpacing * 0.8, logoSpacing * 0.8, 0, 0).setInteractive({ useHandCursor: true });
            
            zone.on('pointerdown', () => {
                promotionManager.setLogo(opt.url);
                overlay.destroy();
                modal.destroy();
                this.renderActiveTab();
            });

            gridContainer.add([itemBg, icon, zone]);
        });

        // Simple scroll logic
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (overlay.active) {
                gridContainer.y -= deltaY;
                const minScroll = -(Math.ceil(LOGO_OPTIONS.length / cols) * rowHeight - (height * 0.6));
                gridContainer.y = Phaser.Math.Clamp(gridContainer.y, minScroll, 0);
            }
        });

        // Close button
        const closeBtn = this.add.text(width / 2, height * 0.8, 'CANCEL', { fontSize: '18px', fontFamily: FONTS.TITLE, color: COLORS.STR_RED }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            overlay.destroy();
            modal.destroy();
        });

        modal.add([card, title, logoArea, closeBtn]);
        this.contentContainer.add([overlay, modal]);
    }

    renderFinance() {
        const { width, height } = this.scale;
        const promo = promotionManager.promotion;
        
        if (!this.financePeriodTab) this.financePeriodTab = 'WEEKLY';

        const backBtn = this.add.text(20, 10, '← DASHBOARD', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.dashboardSubView = 'MAIN'; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        this.contentContainer.add(this.add.text(width / 2, 40, 'FINANCIAL REPORT', { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));

        // Period Selection Tabs
        const periodTabs = ['WEEKLY', 'MONTHLY', 'ANNUAL'];
        const pTabWidth = (width * 0.9) / periodTabs.length;
        periodTabs.forEach((tab, i) => {
            const x = (width * 0.05) + (i * pTabWidth) + (pTabWidth / 2);
            const y = 80;
            const isSelected = this.financePeriodTab === tab;
            const txt = this.add.text(x, y, tab, { 
                fontSize: '14px', 
                fontFamily: FONTS.TITLE, 
                color: isSelected ? COLORS.STR_GOLD : '#666666' 
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            
            txt.on('pointerdown', () => { this.financePeriodTab = tab; this.renderActiveTab(); });
            this.contentContainer.add(txt);
            if (isSelected) {
                this.contentContainer.add(this.add.rectangle(x, y + 15, pTabWidth * 0.4, 2, 0xFFD700));
            }
        });

        // Filter for transactions based on active period
        const now = calendarManager.currentDate;
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        let filteredLedger = [];
        let lastYearTotal = 0;

        if (this.financePeriodTab === 'WEEKLY') {
            const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
            const startOfWeekMs = now.getTime() - ONE_WEEK_MS;
            filteredLedger = (promo.ledger || []).filter(t => {
                const tDate = new Date(t.date).getTime();
                return tDate >= startOfWeekMs && tDate <= now.getTime();
            });
        } else if (this.financePeriodTab === 'MONTHLY') {
            filteredLedger = (promo.ledger || []).filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            });
        } else if (this.financePeriodTab === 'ANNUAL') {
            filteredLedger = (promo.ledger || []).filter(t => new Date(t.date).getFullYear() === currentYear);
            
            // Calculate Last Year Total
            const lastYearLedger = (promo.ledger || []).filter(t => new Date(t.date).getFullYear() === currentYear - 1);
            lastYearLedger.forEach(t => {
                if (t.type === 'INCOME') lastYearTotal += t.amount;
                else lastYearTotal -= t.amount;
            });
        }

        // Group by Category and Type
        const grouped = {};
        filteredLedger.forEach(t => {
            const key = `${t.type}_${t.category}`;
            if (!grouped[key]) {
                grouped[key] = {
                    category: t.category,
                    type: t.type,
                    amount: 0,
                    count: 0
                };
            }
            grouped[key].amount += t.amount;
            grouped[key].count++;
        });

        const groupedList = Object.values(grouped);
        
        // Split into expenses and income
        const expenses = groupedList.filter(t => t.type === 'EXPENSE');
        const income = groupedList.filter(t => t.type === 'INCOME');

        // Sort expenses first, then income
        const sortedGroups = [...expenses, ...income];
        
        const card = this.add.graphics();
        card.fillStyle(0x1F1F1F, 1);
        card.fillRoundedRect(width * 0.05, 110, width * 0.9, height * 0.55, 15);
        this.contentContainer.add(card);

        const periodLabel = this.financePeriodTab === 'WEEKLY' ? 'WEEK' : (this.financePeriodTab === 'MONTHLY' ? 'MONTH' : 'YEAR');
        this.contentContainer.add(this.add.text(width * 0.1, 130, `${periodLabel} SUMMARY BY CATEGORY`, { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
        
        let totalExpenses = 0;
        let totalIncome = 0;

        if (sortedGroups.length === 0) {
            this.contentContainer.add(this.add.text(width / 2, 230, `NO TRANSACTIONS RECORDED THIS ${periodLabel}`, { fontSize: '12px', fontFamily: FONTS.BODY, color: '#666' }).setOrigin(0.5));
        }

        sortedGroups.forEach((t, i) => {
            const y = 170 + (i * 30);
            const color = t.type === 'INCOME' ? '#00FF00' : '#FF0000';
            const prefix = t.type === 'INCOME' ? '+' : '-';
            
            if (t.type === 'INCOME') totalIncome += t.amount;
            else totalExpenses += t.amount;

            // Friendly Category Names
            const labelMap = {
                'OFFICE': 'OFFICE OPERATING COSTS',
                'ROSTER': 'ROSTER STIPENDS & PURSES',
                'SICK_PAY': 'INJURY SICK PAY',
                'PROMOTION': 'PROMOTIONAL ACTIVITIES',
                'REVENUE': 'EVENT REVENUE (GATE/TV/MERCH)',
                'LEGAL_COSTS': 'LEGAL & CONTRACT FEES',
                'CANCELLATION_COSTS': 'BOUT CANCELLATION PENALTIES',
                'TV_PENALTY': 'TV NETWORK PENALTIES'
            };

            const label = labelMap[t.category] || t.category;

            const descText = this.add.text(width * 0.1, y, label, { 
                fontSize: '10px', fontFamily: FONTS.BODY, color: '#AAA' 
            });
            const amountText = this.add.text(width * 0.9, y, `${prefix}£${t.amount.toLocaleString()}`, { 
                fontSize: '12px', fontFamily: FONTS.TITLE, color: color 
            }).setOrigin(1, 0);
            this.contentContainer.add([descText, amountText]);
        });

        // Summary Section at the bottom of the card
        const summaryY = 110 + (height * 0.55) - 120;
        const periodProfit = totalIncome - totalExpenses;
        const profitColor = periodProfit >= 0 ? '#00FF00' : '#FF0000';

        const line = this.add.graphics();
        line.lineStyle(1, 0x333333, 1);
        line.lineBetween(width * 0.1, summaryY - 10, width * 0.9, summaryY - 10);
        this.contentContainer.add(line);

        this.contentContainer.add(this.add.text(width * 0.1, summaryY, `NET ${periodLabel} PROFIT/LOSS`, { fontSize: '11px', fontFamily: FONTS.TITLE, color: '#666' }));
        this.contentContainer.add(this.add.text(width * 0.9, summaryY, `£${periodProfit.toLocaleString()}`, { fontSize: '16px', fontFamily: FONTS.TITLE, color: profitColor }).setOrigin(1, 0));

        if (this.financePeriodTab === 'ANNUAL') {
            const lyColor = lastYearTotal >= 0 ? '#00FF00' : '#FF0000';
            this.contentContainer.add(this.add.text(width * 0.1, summaryY + 30, 'LAST YEAR TOTAL', { fontSize: '11px', fontFamily: FONTS.TITLE, color: '#666' }));
            this.contentContainer.add(this.add.text(width * 0.9, summaryY + 30, `£${lastYearTotal.toLocaleString()}`, { fontSize: '16px', fontFamily: FONTS.TITLE, color: lyColor }).setOrigin(1, 0));
        }

        this.contentContainer.add(this.add.text(width * 0.1, summaryY + 65, 'TOTAL LIQUID CASH', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }));
        this.contentContainer.add(this.add.text(width * 0.9, summaryY + 65, `£${promo.cash.toLocaleString()}`, { fontSize: '22px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(1, 0));
    }

    renderPromotionHistory() {
        const { width, height } = this.scale;
        const promo = promotionManager.promotion;
        const stats = promo.stats || { totalFights: 0, championsProduced: 0, peakMonthlyRevenue: 0, establishedDate: new Date().toISOString() };
        
        const backBtn = this.add.text(20, 10, '← DASHBOARD', { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.dashboardSubView = 'MAIN'; this.renderActiveTab(); });
        this.contentContainer.add(backBtn);

        this.contentContainer.add(this.add.text(width / 2, 40, 'PROMOTION HISTORY', { fontSize: '32px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5));

        const established = new Date(stats.establishedDate);
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        
        const info = [
            { label: 'PROMOTION ESTABLISHED', value: `${monthNames[established.getMonth()]} ${established.getFullYear()}` },
            { label: 'TOTAL FIGHTS HOSTED', value: stats.totalFights.toString() },
            { label: 'WORLD CHAMPIONS PRODUCED', value: stats.championsProduced.toString() },
            { label: 'PEAK MONTHLY REVENUE', value: `£${(stats.peakMonthlyRevenue || 0).toLocaleString()}` }
        ];

        info.forEach((item, i) => {
            const y = 90 + (i * 55);
            this.contentContainer.add([
                this.add.text(width / 2, y, item.label, { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666' }).setOrigin(0.5),
                this.add.text(width / 2, y + 20, item.value, { fontSize: '16px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0.5)
            ]);
        });

        // Recent Results Section
        const resultsY = 320;
        this.contentContainer.add(this.add.text(width / 2, resultsY, 'RECENT FIGHT RESULTS', { fontSize: '14px', fontFamily: FONTS.TITLE, color: COLORS.STR_GOLD }).setOrigin(0.5));
        
        const results = promo.recentResults || [];
        if (results.length === 0) {
            this.contentContainer.add(this.add.text(width / 2, resultsY + 40, 'NO BOUTS RECORDED YET', { fontSize: '12px', fontFamily: FONTS.BODY, color: '#444' }).setOrigin(0.5));
        } else {
            results.forEach((res, i) => {
                const y = resultsY + 35 + (i * 45);
                const bg = this.add.graphics();
                bg.fillStyle(0x1a1a1a, 0.8);
                bg.fillRoundedRect(width * 0.1, y - 20, width * 0.8, 40, 5);
                
                const titleText = res.titleKey ? ` [${res.titleKey}]` : "";
                const resultColor = res.outcome === 'WIN' ? '#00FF00' : (res.outcome === 'DRAW' ? '#FFFF00' : '#FF0000');
                
                const fighterText = this.add.text(width * 0.15, y, res.fighterName.split(' ').pop().toUpperCase(), { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0, 0.5);
                const vsText = this.add.text(width * 0.4, y, 'VS', { fontSize: '10px', fontFamily: FONTS.BODY, color: '#666' }).setOrigin(0.5);
                const opponentText = this.add.text(width * 0.45, y, res.opponentName.split(' ').pop().toUpperCase(), { fontSize: '12px', fontFamily: FONTS.TITLE, color: COLORS.STR_WHITE }).setOrigin(0, 0.5);
                const outcomeText = this.add.text(width * 0.85, y, res.outcome.replace('_', ' '), { fontSize: '10px', fontFamily: FONTS.TITLE, color: resultColor }).setOrigin(1, 0.5);
                
                this.contentContainer.add([bg, fighterText, vsText, opponentText, outcomeText]);
            });
        }
    }
}