import { PROMOTION_ASSETS } from '../constants.js';
import { promotionManager } from './PromotionManager.js';
import { messageManager } from './MessageManager.js';
import { calendarManager } from './CalendarManager.js';
import { fighterManager } from './FighterManager.js';

class AssetManager {
    constructor() {
        this.ownedAssets = []; // Array of asset IDs
        this.lastPurchaseDate = null; // ISO string of last purchase
        this.lastBoostedFighters = {}; // { assetId: fighterId }
    }

    initialize() {
        this.load();
    }

    isOwned(assetId) {
        return this.ownedAssets.includes(assetId);
    }

    canBuyThisMonth() {
        if (!this.lastPurchaseDate) return true;
        const last = new Date(this.lastPurchaseDate);
        const current = new Date(calendarManager.currentDate);
        return last.getMonth() !== current.getMonth() || last.getFullYear() !== current.getFullYear();
    }

    buyAsset(assetId) {
        const asset = PROMOTION_ASSETS.find(a => a.id === assetId);
        if (!asset) return { success: false, message: "Asset not found." };

        if (this.isOwned(assetId)) return { success: false, message: "You already own this asset." };

        if (!this.canBuyThisMonth()) {
            return { success: false, message: "Assets can only be bought once a month." };
        }

        if (promotionManager.promotion.cash < asset.cost) {
            return { success: false, message: "Insufficient funds." };
        }

        if (promotionManager.promotion.reputation < asset.level) {
            return { success: false, message: `Your promotion needs to be level ${asset.level} to buy this.` };
        }

        // Complete purchase
        promotionManager.addTransaction('PROMOTION_ASSET', `ASSET: ${asset.name}`, asset.cost, 'EXPENSE');
        this.ownedAssets.push(assetId);
        this.lastPurchaseDate = calendarManager.currentDate.toISOString();
        this.save();

        messageManager.addMessage(
            'ASSET_PURCHASE',
            'ASSET ACQUIRED!',
            `You have purchased the ${asset.name}. ${asset.description}`,
            null,
            calendarManager.currentDate.toISOString()
        );

        return { success: true };
    }

    getEffectValue(type, defaultValue = 1.0) {
        const matchingAssets = PROMOTION_ASSETS.filter(a => this.ownedAssets.includes(a.id) && a.type === type);
        if (matchingAssets.length === 0) return defaultValue;

        // For multipliers, we usually multiply. For flat values, we sum.
        if (type.includes('MOD') || type.includes('REDUCTION')) {
            return matchingAssets.reduce((acc, a) => acc * a.amount, 1.0);
        } else if (type.includes('COUNT') || type.includes('OVERRIDE')) {
            // Take the highest for overrides/counts
            return Math.max(...matchingAssets.map(a => a.amount));
        } else {
            // Sum for flat additions
            return matchingAssets.reduce((acc, a) => acc + a.amount, 0);
        }
    }

    /**
     * Backward compatibility method for the legacy staff/facility system
     * Maps new unique assets to the expected old effect names.
     */
    getAllEffects() {
        return {
            recoveryBoost: 1 / this.getEffectValue('RECOVERY_TIME_REDUCTION', 1.0),
            cutRecoveryMod: 1 / this.getEffectValue('RECOVERY_TIME_REDUCTION', 1.0), 
            xpBoost: 1.0, 
            prXpBoost: 1.0,
            charismaGainMod: 1.0,
            ticketMod: this.getEffectValue('PERMANENT_TICKET_MOD', 1.0),
            merchMod: this.getEffectValue('PERMANENT_MERCH_MOD', 1.0),
            tvMaxMod: this.getEffectValue('TV_MAX_MOD', 1.0),
            recoveryTimeReduction: this.getEffectValue('RECOVERY_TIME_REDUCTION', 1.0),
            winRepBoost: this.getEffectValue('WIN_REP_BOOST', 0)
        };
    }

    applyMonthlyEffects() {
        const monthlyAssets = PROMOTION_ASSETS.filter(a => this.ownedAssets.includes(a.id) && a.type.startsWith('MONTHLY_'));
        
        monthlyAssets.forEach(asset => {
            if (asset.type === 'MONTHLY_CASH') {
                promotionManager.addTransaction('PROMOTION_ASSET', `REVENUE: ${asset.name}`, asset.amount, 'INCOME', calendarManager.currentDate.toISOString());
            } else if (asset.type === 'MONTHLY_ALL_FIGHTERS_REP') {
                fighterManager.fighters.forEach(f => {
                    f.reputation = Math.min(10, f.reputation + asset.amount);
                    fighterManager.updateFighterMetadata(f);
                });
            } else if (asset.type === 'MONTHLY_RANDOM_FIGHTER_HP') {
                this.applyFighterStatBoost(asset, 'health', asset.amount);
            }
        });
    }

    applyYearlyEffects() {
        const yearlyAssets = PROMOTION_ASSETS.filter(a => this.ownedAssets.includes(a.id) && a.type.startsWith('YEARLY_'));
        
        yearlyAssets.forEach(asset => {
            let messageBody = "";
            if (asset.type === 'YEARLY_CASH') {
                promotionManager.addTransaction('PROMOTION_ASSET', `YEARLY REVENUE: ${asset.name}`, asset.amount, 'INCOME', calendarManager.currentDate.toISOString());
                messageBody = `The ${asset.name} has generated £${asset.amount.toLocaleString()} in revenue.`;
            } else if (asset.type === 'YEARLY_PROMOTER_REP') {
                promotionManager.addReputation(asset.amount);
                messageBody = `The ${asset.name} has increased your promotion reputation by ${asset.amount}.`;
            } else if (asset.type === 'YEARLY_ALL_FIGHTERS_CHARISMA') {
                fighterManager.fighters.forEach(f => {
                    f.charisma = Math.min(100, f.charisma + asset.amount);
                });
                messageBody = `The ${asset.name} has increased the charisma of all your fighters by ${asset.amount}.`;
            } else if (asset.type === 'YEARLY_RANDOM_FIGHTER_STAMINA') {
                this.applyFighterStatBoost(asset, 'stamina', asset.amount);
                return; // message handled in applyFighterStatBoost
            } else if (asset.type === 'YEARLY_RANDOM_FIGHTER_IQ') {
                this.applyFighterStatBoost(asset, 'offenceIQ', asset.amount, 'attack');
                return; // message handled in applyFighterStatBoost
            }

            if (messageBody) {
                messageManager.addMessage(
                    'ASSET_YEARLY_BOOST',
                    'YEARLY ASSET REWARD',
                    messageBody,
                    null,
                    calendarManager.currentDate.toISOString()
                );
            }
        });
    }

    applyFighterStatBoost(asset, statName, amount, group = 'physical') {
        const lastFighterId = this.lastBoostedFighters[asset.id];
        
        // Find candidates: not the last one boosted, and not at max stats
        let candidates = fighterManager.fighters.filter(f => {
            if (f.id === lastFighterId) return false;
            
            const currentVal = group === 'physical' ? f.skills.physical[statName] : f.skills[group][statName];
            // HP/Stamina can go higher (let's say 10,000 as a soft cap), skills are capped at 99
            const cap = group === 'physical' ? 10000 : 99;
            return currentVal < cap;
        });

        if (candidates.length === 0) {
            // No other candidate, try to fallback to the last fighter if they aren't capped
            const lastFighter = fighterManager.fighters.find(f => f.id === lastFighterId);
            const cap = group === 'physical' ? 10000 : 99;
            const isCapped = lastFighter ? (group === 'physical' ? lastFighter.skills.physical[statName] >= cap : lastFighter.skills[group][statName] >= cap) : true;
            
            if (fighterManager.fighters.length <= 1 || isCapped) {
                // Send skip message if it's the first time for this asset or we explicitly failed
                const skipKey = `skip_msg_${asset.id}`;
                if (!localStorage.getItem(skipKey)) {
                    messageManager.addMessage(
                        'ASSET_BOOST_SKIPPED',
                        'BOOST UNAVAILABLE',
                        `You were unable to receive your ${asset.name} boost as you only have 1 fighter currently signed or your fighters have reached the maximum skill.`,
                        null,
                        calendarManager.currentDate.toISOString()
                    );
                    localStorage.setItem(skipKey, 'true');
                }
                return;
            } else {
                // We have other fighters but they are capped? Actually candidates check handles that.
                // If candidates is empty and we have multiple fighters, they must be capped.
                return;
            }
        }

        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        if (group === 'physical') {
            selected.skills.physical[statName] += amount;
        } else {
            selected.skills[group][statName] = Math.min(99, selected.skills[group][statName] + amount);
        }
        
        this.lastBoostedFighters[asset.id] = selected.id;
        this.save();

        messageManager.addMessage(
            'ASSET_FIGHTER_BOOST',
            `${asset.name.toUpperCase()} BOOST`,
            `${selected.name} has received a boost of ${amount} ${statName.toUpperCase()} from your ${asset.name}.`,
            { fighterId: selected.id },
            calendarManager.currentDate.toISOString()
        );
    }

    save() {
        localStorage.setItem('boxing_owned_assets', JSON.stringify(this.ownedAssets));
        localStorage.setItem('boxing_asset_purchase_date', this.lastPurchaseDate);
        localStorage.setItem('boxing_last_boosted_fighters', JSON.stringify(this.lastBoostedFighters));
    }

    load() {
        const savedAssets = localStorage.getItem('boxing_owned_assets');
        if (savedAssets) this.ownedAssets = JSON.parse(savedAssets);
        
        this.lastPurchaseDate = localStorage.getItem('boxing_asset_purchase_date');
        
        const savedBoosts = localStorage.getItem('boxing_last_boosted_fighters');
        if (savedBoosts) this.lastBoostedFighters = JSON.parse(savedBoosts);
    }
}

export const assetManager = new AssetManager();