class MessageManager {
    constructor() {
        this.messages = [];
        this.hasNew = false;
        this.load();
    }

    addMessage(type, subject, body, data = null, gameDate = null) {
        const newMessage = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type, // 'FIGHT_AGREED', 'FIGHT_RESULT', 'CONTRACT_EXPIRY'
            subject,
            body,
            data, // { fighterId, result, rounds, etc. }
            timestamp: new Date().toISOString(),
            gameDate: gameDate,
            read: false
        };
        this.messages.unshift(newMessage);
        this.hasNew = true;

        // Pruning messages to keep memory usage low: 20 pages max (4 messages per page)
        const MAX_MESSAGES = 80;
        if (this.messages.length > MAX_MESSAGES) {
            this.messages = this.messages.slice(0, MAX_MESSAGES);
        }

        this.save();
    }

    markRead(id) {
        const msg = this.messages.find(m => m.id === id);
        if (msg) msg.read = true;
        this.checkNew();
        this.save();
    }

    checkNew() {
        this.hasNew = this.messages.some(m => !m.read);
    }

    save() {
        localStorage.setItem('boxing_messages_data', JSON.stringify({
            messages: this.messages,
            hasNew: this.hasNew
        }));
    }

    load() {
        const saved = localStorage.getItem('boxing_messages_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.messages = data.messages || [];
            this.hasNew = data.hasNew || false;

            // Pruning legacy data: 20 pages max (4 messages per page)
            const MAX_MESSAGES = 80;
            if (this.messages.length > MAX_MESSAGES) {
                this.messages = this.messages.slice(0, MAX_MESSAGES);
                this.save();
            }
        }
    }

    deleteMessage(id) {
        this.messages = this.messages.filter(m => m.id !== id);
        this.checkNew();
        this.save();
    }
}

export const messageManager = new MessageManager();
