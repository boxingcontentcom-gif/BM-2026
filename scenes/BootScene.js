import Phaser from 'phaser';
import { ASSETS, LOGO_OPTIONS, CHAMPIONSHIPS } from '../constants.js';
import { promotionManager } from '../entities/PromotionManager.js';
import { calendarManager } from '../entities/CalendarManager.js';
import { fighterManager } from '../entities/FighterManager.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const { width, height } = this.cameras.main;
        const progressText = this.add.text(width / 2, height / 2, 'LOADING...', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressText.setText('LOADING: ' + Math.floor(value * 100) + '%');
        });

        this.load.on('complete', () => {
            progressText.destroy();
        });

        this.load.image('background', ASSETS.BACKGROUND);
        
        // Load all available logos from LOGO_OPTIONS using their URL as the key
        LOGO_OPTIONS.forEach(opt => {
            this.load.image(opt.url, opt.url);
        });

        // Fallback keys for legacy support if needed
        this.load.image('logo-lion', ASSETS.LOGO_LION);
        this.load.image('logo-glove', ASSETS.LOGO_GLOVE);
        this.load.image('logo-crown', ASSETS.LOGO_CROWN);
        this.load.image('logo-fist', ASSETS.LOGO_FIST);
        this.load.image('logo-gear', 'https://rosebud.ai/assets/logo-gear.webp?KEq0');
        
        // Load Championship Belts
        Object.keys(CHAMPIONSHIPS).forEach(key => {
            this.load.image(key, CHAMPIONSHIPS[key].icon);
        });

        // Legacy/Fallback keys for belts
        this.load.image('TITLE_WORLD', ASSETS.TITLE_WORLD);
        this.load.image('TITLE_INTERCONTINENTAL', ASSETS.TITLE_INTERCONTINENTAL);
        this.load.image('TITLE_CONTINENTAL', ASSETS.TITLE_CONTINENTAL);
        this.load.image('TITLE_NATIONAL', ASSETS.TITLE_NATIONAL);
        this.load.image('TITLE_REGIONAL', ASSETS.TITLE_REGIONAL);
        this.load.image('TITLE_LOCAL', ASSETS.TITLE_LOCAL);
    }

    async create() {
        promotionManager.load();
        calendarManager.load();
        
        // Safety Check: If world population is bloated from previous update, force a reset
        // to "generate a new game" as requested and restore stability.
        const worldPop = localStorage.getItem('boxing_world_population');
        if (worldPop) {
            try {
                const parsed = JSON.parse(worldPop);
                if (parsed.length > 2000) {
                    console.warn('Bloated population detected. Performing emergency reset...');
                    localStorage.clear(); // Wipe everything to ensure a fresh start
                    window.location.reload();
                    return;
                }
            } catch (e) {
                localStorage.clear();
                window.location.reload();
                return;
            }
        }

        fighterManager.initialize();
        
        // Ensure fonts are loaded before starting the game to prevent "enlarged" fallback font issue
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        if (promotionManager.promotion.setupComplete) {
            this.scene.start('ManagementScene');
        } else {
            this.scene.start('SetupScene');
        }
    }
}
