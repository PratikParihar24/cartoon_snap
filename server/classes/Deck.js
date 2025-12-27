// server/classes/Deck.js

class Deck {
    constructor() {
        this.cards = [];
        this.initDeck();
    }

    initDeck() {
        // The Full 52-Card Roster
        const characters = [
            "Doraemon", "Jiyaan", "Nobita", "Sizuka", "Sunio", 
            "Ninja Hattori", "Oggy", "Jack", "Tom", "Jerry", 
            "Himawari", "Cinderella", "Shinchan"
        ];
        
        const styles = ["Ghibli", "Sketch", "Pixar", "Standard"];

        for (let style of styles) {
            for (let char of characters) {
                this.cards.push({
                    character: char,
                    style: style,
                    id: `${style}_${char}`
                });
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        const mid = Math.ceil(this.cards.length / 2);
        const player1Hand = this.cards.slice(0, mid);
        const player2Hand = this.cards.slice(mid);
        
        return { player1Hand, player2Hand };
    }
}

module.exports = Deck;