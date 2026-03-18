import { INITIAL_CASH } from '../constants.js';

class PromotionManager {
    constructor() {
        this.promotion = {
            name: '',
            promoter: '',
            slogan: '',
            logoKey: '',
            logoUrl: '', // Direct URL for flexibility
            location: { city: '', country: '' },
            cash: INITIAL_CASH,
            reputation: 1, // Start with low reputation
            setupComplete: false,
            ledger: [], // { date, category, description, amount, type: 'INCOME' | 'EXPENSE' }
            stats: {
                totalFights: 0,
                championsProduced: 0,
                peakMonthlyRevenue: 0,
                establishedDate: new Date().toISOString()
            },
            recentResults: [] // { date, fighterName, opponentName, outcome, titleKey }
        };
    }

    recordFightResult(fighterName, opponentName, outcome, titleKey = null) {
        const result = {
            date: new Date().toISOString(),
            fighterName,
            opponentName,
            outcome,
            titleKey
        };
        this.promotion.recentResults.unshift(result);
        if (this.promotion.recentResults.length > 5) {
            this.promotion.recentResults.pop();
        }
        this.promotion.stats.totalFights++;
        this.save();
    }

    recordChampionProduced() {
        this.promotion.stats.championsProduced++;
        this.save();
    }

    setLogo(url) {
        this.promotion.logoUrl = url;
        this.save();
    }

    setPromotion(data) {
        this.promotion = { ...this.promotion, ...data, setupComplete: true };
        this.save();
    }

    addTransaction(category, description, amount, type, date = null) {
        if (amount === 0) return;
        const transaction = {
            date: date || new Date().toISOString(),
            category,
            description,
            amount,
            type,
            weekTimestamp: new Date(date || new Date()).getTime()
        };
        this.promotion.ledger.push(transaction);
        if (type === 'INCOME') {
            this.promotion.cash += amount;
            this.updatePeakRevenue(amount, date);
        } else {
            this.promotion.cash -= amount;
        }
        this.save();
    }

    getReport(startDate, endDate) {
        const periodLedger = this.promotion.ledger.filter(t => {
            const d = new Date(t.date);
            return d >= startDate && d <= endDate;
        });

        const income = periodLedger.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
        const expenses = periodLedger.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

        // Group by category for detail
        const categories = {};
        periodLedger.forEach(t => {
            if (!categories[t.category]) categories[t.category] = 0;
            categories[t.category] += (t.type === 'INCOME' ? t.amount : -t.amount);
        });

        return {
            income,
            expenses,
            profit: income - expenses,
            categories
        };
    }

    updatePeakRevenue(amount, date) {
        if (!this.promotion.stats) this.promotion.stats = { totalFights: 0, championsProduced: 0, peakMonthlyRevenue: 0, establishedDate: new Date().toISOString() };
        
        const d = date ? new Date(date) : new Date();
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        
        const monthlyRevenue = this.promotion.ledger
            .filter(t => t.type === 'INCOME')
            .filter(t => {
                const td = new Date(t.date);
                return `${td.getFullYear()}-${td.getMonth()}` === monthKey;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        if (monthlyRevenue > (this.promotion.stats.peakMonthlyRevenue || 0)) {
            this.promotion.stats.peakMonthlyRevenue = monthlyRevenue;
        }
    }

    addLegalCosts(description, amount) {
        this.addTransaction('LEGAL_COSTS', description, amount, 'EXPENSE');
    }

    addCancellationCosts(description, amount) {
        this.addTransaction('CANCELLATION_COSTS', description, amount, 'EXPENSE');
    }

    addSponsorshipCosts(description, amount) {
        // Placeholder as requested
        this.addTransaction('SPONSORSHIP_COSTS', description, amount, 'EXPENSE');
    }

    addTVPenalty(description, amount) {
        this.addTransaction('TV_PENALTY', description, amount, 'EXPENSE');
    }

    deductExpenses(amount) {
        // Fallback for generic legacy calls
        this.addTransaction('MISC', 'GENERAL EXPENSE', amount, 'EXPENSE');
    }

    addRevenue(amount) {
        // Fallback for generic legacy calls
        this.addTransaction('MISC', 'GENERAL REVENUE', amount, 'INCOME');
    }

    save() {
        localStorage.setItem('boxing_promotion_data', JSON.stringify(this.promotion));
    }

    load() {
        const saved = localStorage.getItem('boxing_promotion_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.promotion = { ...this.promotion, ...data };
            if (!this.promotion.ledger) this.promotion.ledger = [];
            return true;
        }
        return false;
    }

    reset() {
        localStorage.removeItem('boxing_promotion_data');
        this.promotion = {
            name: '',
            promoter: '',
            slogan: '',
            logoKey: '',
            logoUrl: '', 
            location: { city: '', country: '' },
            cash: INITIAL_CASH,
            reputation: 1,
            setupComplete: false,
            ledger: [],
            stats: {
                totalFights: 0,
                championsProduced: 0,
                peakMonthlyRevenue: 0,
                establishedDate: new Date().toISOString()
            },
            recentResults: [] 
        };
    }
}

export const promotionManager = new PromotionManager();
