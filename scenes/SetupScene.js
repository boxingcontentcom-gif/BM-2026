import Phaser from 'phaser';
import { promotionManager } from '../entities/PromotionManager.js';
import { COLORS, LOCATIONS, LOGO_OPTIONS } from '../constants.js';

export default class SetupScene extends Phaser.Scene {
    constructor() {
        super('SetupScene');
        this.step = 0;
        this.formData = {
            name: '',
            promoter: '',
            slogan: '',
            logoUrl: LOGO_OPTIONS[0].url,
            location: LOCATIONS[0],
            databaseSeed: 1
        };
    }

    create() {
        const { width, height } = this.scale;
        
        // Background
        const bg = this.add.image(width / 2, height / 2, 'background');
        bg.setDisplaySize(width, height);
        bg.setAlpha(0.6);

        // Overlay for better contrast
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);

        // Title
        this.title = this.add.text(width / 2, 80, 'ESTABLISH PROMOTION', {
            fontSize: '28px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: COLORS.STR_GOLD,
            letterSpacing: 2
        }).setOrigin(0.5);

        this.container = this.add.container(0, 0);
        this.showStep();
    }

    clearContainer() {
        this.container.removeAll(true);
        // Clear any existing DOM elements
        const existingInputs = document.querySelectorAll('.setup-input');
        existingInputs.forEach(el => el.remove());
    }

    showStep() {
        this.clearContainer();
        const { width, height } = this.scale;

        switch(this.step) {
            case 0: this.renderIdentityStep(); break;
            case 1: this.renderBrandingStep(); break;
            case 2: this.renderSeedStep(); break;
            case 3: this.renderLocationStep(); break;
            case 4: this.renderReviewStep(); break;
        }

        // Navigation buttons
        if (this.step < 4) {
            this.createButton(width / 2, height - 100, 'NEXT STEP', () => this.nextStep());
        } else {
            this.createButton(width / 2, height - 100, 'START EMPIRE', () => this.finishSetup());
        }

        if (this.step > 0) {
            this.createButton(width / 2, height - 160, 'BACK', () => this.prevStep(), true);
        }
    }

    createButton(x, y, label, callback, isSecondary = false) {
        const color = isSecondary ? 0x2A2A2A : 0xFFD700;
        const textColor = isSecondary ? '#FFFFFF' : '#000000';
        
        const btn = this.add.container(x, y);
        // Modern rounded button using a Graphics object
        const rect = this.add.graphics();
        rect.fillStyle(color, 1);
        rect.fillRoundedRect(-120, -25, 240, 50, 25);
        
        const text = this.add.text(0, 0, label, {
            fontSize: '16px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: textColor
        }).setOrigin(0.5);

        // Interaction zone
        const zone = this.add.rectangle(0, 0, 240, 50, 0x000000, 0).setInteractive({ useHandCursor: true });

        btn.add([rect, text, zone]);
        this.container.add(btn);

        zone.on('pointerdown', () => {
            this.tweens.add({
                targets: btn,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });
    }

    createHTMLInput(id, placeholder, value, topPercent) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = id;
        input.placeholder = placeholder;
        input.value = value;
        input.className = 'setup-input';
        
        const style = {
            position: 'absolute',
            left: '50%',
            top: `${topPercent}%`,
            transform: 'translate(-50%, -50%)',
            width: '85%',
            maxWidth: '400px',
            padding: '16px 20px',
            fontSize: '18px',
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: '700',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '2px solid rgba(255, 215, 0, 0.3)',
            color: '#FFFFFF',
            textAlign: 'center',
            borderRadius: '12px',
            outline: 'none',
            zIndex: '10',
            backdropFilter: 'blur(10px)'
        };
        
        Object.assign(input.style, style);
        document.body.appendChild(input);
        
        input.oninput = (e) => {
            this.formData[id] = e.target.value;
        };
        
        return input;
    }

    renderIdentityStep() {
        const { width, height } = this.scale;
        
        this.container.add(this.add.text(width / 2, 160, 'IDENTITY', {
            fontSize: '20px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        this.createHTMLInput('name', 'PROMOTION NAME', this.formData.name, 35);
        this.createHTMLInput('promoter', 'PROMOTER NAME', this.formData.promoter, 50);
    }

    renderBrandingStep() {
        const { width, height } = this.scale;
        
        this.container.add(this.add.text(width / 2, 160, 'BRANDING', {
            fontSize: '20px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        this.createHTMLInput('slogan', 'SLOGAN (OPTIONAL)', this.formData.slogan, 30);

        // Logo Selection
        this.container.add(this.add.text(width / 2, 420, 'SELECT BRAND LOGO', {
            fontSize: '14px',
            fontFamily: 'Montserrat',
            fontWeight: '700',
            color: COLORS.STR_GOLD,
            letterSpacing: 2
        }).setOrigin(0.5));

        // Display the first 4 logos as options in setup
        const logos = LOGO_OPTIONS.slice(0, 4);
        const spacing = 100;
        const startX = (width - (spacing * (logos.length - 1))) / 2;

        logos.forEach((opt, index) => {
            const x = startX + (index * spacing);
            const y = 520;
            
            const isSelected = this.formData.logoUrl === opt.url;
            const logoFrame = this.add.graphics();
            logoFrame.lineStyle(isSelected ? 3 : 1, isSelected ? 0xFFD700 : 0x444444);
            logoFrame.fillStyle(0x222222, 0.5);
            logoFrame.strokeRoundedRect(x - 40, y - 40, 80, 80, 12);
            logoFrame.fillRoundedRect(x - 40, y - 40, 80, 80, 12);
            
            const logoImg = this.add.image(x, y, opt.url).setDisplaySize(60, 60).setInteractive({ useHandCursor: true });
            
            logoImg.on('pointerdown', () => {
                this.formData.logoUrl = opt.url;
                this.showStep();
            });

            this.container.add([logoFrame, logoImg]);
        });
    }

    renderSeedStep() {
        const { width, height } = this.scale;
        
        this.container.add(this.add.text(width / 2, 160, 'SELECT DATABASE SEED', {
            fontSize: '20px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const seeds = [
            { id: 1, name: 'SEED 1' },
            { id: 2, name: 'SEED 2' },
            { id: 3, name: 'SEED 3' },
            { id: 4, name: 'SEED 4' },
            { id: 5, name: 'SEED 5' }
        ];

        seeds.forEach((seed, index) => {
            const y = 240 + (index * 65);
            const isSelected = this.formData.databaseSeed === seed.id;
            
            const btnFrame = this.add.graphics();
            btnFrame.lineStyle(isSelected ? 2 : 1, isSelected ? 0xFFD700 : 0x333333);
            btnFrame.fillStyle(isSelected ? 0xFFD700 : 0x000000, isSelected ? 0.1 : 0.4);
            btnFrame.strokeRoundedRect(width * 0.1, y - 25, width * 0.8, 50, 10);
            btnFrame.fillRoundedRect(width * 0.1, y - 25, width * 0.8, 50, 10);

            const txt = this.add.text(width / 2, y, seed.name, {
                fontSize: '16px',
                fontFamily: 'Montserrat',
                fontWeight: '900',
                color: isSelected ? COLORS.STR_GOLD : COLORS.STR_WHITE
            }).setOrigin(0.5);

            const zone = this.add.rectangle(width / 2, y, width * 0.8, 50, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this.formData.databaseSeed = seed.id;
                this.showStep();
            });

            this.container.add([btnFrame, txt, zone]);
        });
    }

    renderLocationStep() {
        const { width, height } = this.scale;
        
        this.container.add(this.add.text(width / 2, 160, 'HEADQUARTERS', {
            fontSize: '20px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        LOCATIONS.forEach((loc, index) => {
            const y = 260 + (index * 70);
            const isSelected = this.formData.location.city === loc.city;
            
            const btnFrame = this.add.graphics();
            btnFrame.lineStyle(isSelected ? 2 : 1, isSelected ? 0xFFD700 : 0x333333);
            btnFrame.fillStyle(isSelected ? 0xFFD700 : 0x000000, isSelected ? 0.1 : 0.4);
            btnFrame.strokeRoundedRect(width * 0.1, y - 30, width * 0.8, 60, 15);
            btnFrame.fillRoundedRect(width * 0.1, y - 30, width * 0.8, 60, 15);

            const txt = this.add.text(width / 2, y, `${loc.city.toUpperCase()}, ${loc.country.toUpperCase()}`, {
                fontSize: '16px',
                fontFamily: 'Montserrat',
                fontWeight: isSelected ? '900' : '700',
                color: isSelected ? COLORS.STR_GOLD : COLORS.STR_WHITE
            }).setOrigin(0.5);

            const zone = this.add.rectangle(width / 2, y, width * 0.8, 60, 0, 0).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', () => {
                this.formData.location = loc;
                this.showStep();
            });

            this.container.add([btnFrame, txt, zone]);
        });
    }

    renderReviewStep() {
        const { width, height } = this.scale;
        
        this.container.add(this.add.text(width / 2, 140, 'FINAL REVIEW', {
            fontSize: '22px',
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: COLORS.STR_WHITE
        }).setOrigin(0.5));

        const card = this.add.graphics();
        card.fillStyle(0x222222, 0.6);
        card.fillRoundedRect(width * 0.05, 180, width * 0.9, 360, 20);
        this.container.add(card);

        const logoPreview = this.add.image(width / 2, 260, this.formData.logoUrl).setDisplaySize(120, 120);
        this.container.add(logoPreview);

        const reviewText = [
            { label: 'PROMOTION', value: this.formData.name },
            { label: 'PROMOTER', value: this.formData.promoter },
            { label: 'SLOGAN', value: this.formData.slogan || 'NO SLOGAN' },
            { label: 'SEED', value: `DATABASE SEED ${this.formData.databaseSeed}` },
            { label: 'HQ', value: `${this.formData.location.city}, ${this.formData.location.country}` },
            { label: 'STARTING CAPITAL', value: '£100,000' }
        ];

        reviewText.forEach((t, i) => {
            const y = 350 + (i * 35);
            const labelText = this.add.text(width * 0.1, y, t.label, {
                fontSize: '12px',
                fontFamily: 'Montserrat',
                fontWeight: '900',
                color: 'rgba(255, 255, 255, 0.5)'
            }).setOrigin(0, 0.5);

            const valueText = this.add.text(width * 0.9, y, t.value.toUpperCase(), {
                fontSize: '14px',
                fontFamily: 'Montserrat',
                fontWeight: '700',
                color: COLORS.STR_GOLD,
                align: 'right'
            }).setOrigin(1, 0.5);

            this.container.add([labelText, valueText]);
        });
    }

    nextStep() {
        // Validation
        if (this.step === 0 && (!this.formData.name || !this.formData.promoter)) {
            this.showError('Please enter both promotion and promoter names.');
            return;
        }
        
        this.step++;
        this.showStep();
    }

    showError(msg) {
        if (this.errorText) this.errorText.destroy();
        const { width, height } = this.scale;
        this.errorText = this.add.text(width / 2, height - 220, msg, {
            fontSize: '14px',
            fontFamily: 'Montserrat',
            color: '#FF4C4C',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        this.time.delayedCall(3000, () => {
            if (this.errorText) this.errorText.destroy();
        });
    }

    prevStep() {
        this.step--;
        this.showStep();
    }

    finishSetup() {
        const logoData = { ...this.formData };
        // Ensure we use the correct field names for the promotion manager
        logoData.logoKey = logoData.logoUrl; 
        
        promotionManager.setPromotion(logoData);
        
        // Pass the selected seed to fighterManager
        import('../entities/FighterManager.js').then(module => {
            const fighterManager = module.fighterManager;
            fighterManager.databaseSeed = this.formData.databaseSeed;
            this.clearContainer();
            this.scene.start('ManagementScene');
        });
    }
}
