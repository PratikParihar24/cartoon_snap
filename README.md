# 🃏 Cartoon Snap

A real-time multiplayer card game built with **Node.js** and **Socket.io**. Two players connect via WebSockets and race to spot matching cards in a test of reflexes.

## 🚀 Features
* **Real-Time Multiplayer:** Instant state synchronization between clients using Socket.io.
* **Game Logic:** Full 52-card deck management, shuffling, and dealing logic.
* **Reflex Mechanics:** "Snap" detection system handling race conditions (first to click wins).
* **Turn-Based Flow:** Enforced turn management with real-time interrupts.
* **Win/Loss States:** Automatic detection of empty hands and victory conditions.

## 🛠️ Tech Stack
* **Backend:** Node.js, Express
* **Real-Time Communication:** Socket.io
* **Frontend:** Vanilla JavaScript, HTML5, CSS3

## 📦 How to Run Locally

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/cartoon-snap.git](https://github.com/YOUR_USERNAME/cartoon-snap.git)
    cd cartoon-snap
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start the Server**
    ```bash
    npm run dev
    ```

4.  **Play!**
    * Open `http://localhost:3000` in two different browser tabs.
    * The game handles connection and matchmaking automatically.

## 🔮 Future Roadmap (v2)
* [ ] Lobby System (Create/Join Rooms with Codes)
* [ ] Mobile Responsiveness (Touch events)
* [ ] Persistent User Stats (Database integration)
* [ ] Sound Effects & Animations

---
*Created by PRATIK*