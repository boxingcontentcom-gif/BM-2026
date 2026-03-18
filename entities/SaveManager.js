import { promotionManager } from './PromotionManager.js';
import { fighterManager } from './FighterManager.js';
import { calendarManager } from './CalendarManager.js';
import { assetManager } from './GymManager.js';
import { messageManager } from './MessageManager.js';

class SaveManager {
    constructor() {
        this.slots = [1, 2, 3];
    }

    getSaveMetadata(slot) {
        const meta = localStorage.getItem(`boxing_save_meta_${slot}`);
        return meta ? JSON.parse(meta) : null;
    }

    saveGame(slot) {
        try {
            const timestamp = new Date().toISOString();
            const promoName = promotionManager.promotion.name || 'New Promotion';
            
            const saveData = {
                promotion: promotionManager.promotion,
                fighters: fighterManager.fighters,
                worldPopulation: fighterManager.worldPopulation,
                marketFighters: fighterManager.marketFighters,
                calendar: {
                    currentDate: calendarManager.currentDate.toISOString(),
                    scheduledEvents: calendarManager.scheduledEvents
                },
                assets: {
                    ownedAssets: assetManager.ownedAssets,
                    lastPurchaseDate: assetManager.lastPurchaseDate,
                    lastBoostedFighters: assetManager.lastBoostedFighters
                },
                messages: messageManager.messages
            };

            localStorage.setItem(`boxing_save_slot_${slot}`, JSON.stringify(saveData));
            localStorage.setItem(`boxing_save_meta_${slot}`, JSON.stringify({
                name: promoName,
                date: timestamp,
                reputation: promotionManager.promotion.reputation
            }));

            return { success: true };
        } catch (e) {
            console.error('Save failed:', e);
            return { success: false, message: e.name === 'QuotaExceededError' ? 'STORAGE FULL' : 'SAVE ERROR' };
        }
    }

    loadGame(slot) {
        const rawData = localStorage.getItem(`boxing_save_slot_${slot}`);
        if (!rawData) return false;

        const data = JSON.parse(rawData);

        // Update Managers
        promotionManager.promotion = data.promotion;
        fighterManager.fighters = data.fighters;
        fighterManager.worldPopulation = data.worldPopulation;
        fighterManager.marketFighters = data.marketFighters;
        
        calendarManager.currentDate = new Date(data.calendar.currentDate);
        calendarManager.scheduledEvents = data.calendar.scheduledEvents.map(e => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end)
        }));

        assetManager.ownedAssets = data.assets.ownedAssets;
        assetManager.lastPurchaseDate = data.assets.lastPurchaseDate;
        assetManager.lastBoostedFighters = data.assets.lastBoostedFighters;

        messageManager.messages = data.messages;

        // Persist the loaded state as the "active" state in standard keys
        promotionManager.save();
        fighterManager.save();
        calendarManager.save();
        assetManager.save();
        messageManager.save();

        return true;
    }

    deleteSave(slot) {
        localStorage.removeItem(`boxing_save_slot_${slot}`);
        localStorage.removeItem(`boxing_save_meta_${slot}`);
    }

    resetActiveGame() {
        // 1. Clear all managers in-memory
        if (promotionManager && promotionManager.reset) promotionManager.reset();
        if (fighterManager) {
            fighterManager.fighters = [];
            fighterManager.worldPopulation = [];
            fighterManager.marketFighters = [];
            fighterManager.isInitialized = false;
        }
        if (calendarManager) {
            calendarManager.currentDate = new Date('2026-01-01');
            calendarManager.scheduledEvents = [];
        }
        if (assetManager) {
            assetManager.ownedAssets = [];
            assetManager.lastPurchaseDate = null;
        }
        if (messageManager) {
            messageManager.messages = [];
            messageManager.hasNew = false;
        }

        // 2. Clear LocalStorage definitively for non-save-slot keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('boxing_') && !key.startsWith('boxing_save_')) {
                keysToRemove.push(key);
            }
        }
        
        // Migration and utility keys
        const extraKeys = [
            'manual_brand_deal_credit',
            'fighter_stats_redistributed_v2',
            'fighter_contract_start_reset',
            'boxing_names_scrubbed_v3',
            'boxing_color_scheme'
        ];
        
        extraKeys.forEach(key => {
            if (!keysToRemove.includes(key)) keysToRemove.push(key);
        });

        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('Reset active game completed. Redirecting...');
    }
}

export const saveManager = new SaveManager();
