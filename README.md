
# 🃏 Cartoon Snap

A lightning-fast, real-time multiplayer card game built with **Node.js** and **Socket.io**. Two players connect via WebSockets and race to spot matching cards in a test of reflexes. 

Engineered from the ground up for zero-latency gameplay, this project utilizes advanced asset pipelines, data-packed WebSockets, and optimistic UI rendering.

## 🚀 Engineering Achievements & Metrics

* **Elite Performance Score:** Achieved a **95/100 Google Lighthouse Performance Score** by architecting a zero-dependency Vanilla JavaScript Single Page Application (SPA) with lazy-loaded DOM modals.
* **Custom Asset Pipeline:** Built a recursive Node.js image-processing engine using `sharp`. Converted over 300MB of raw PNG assets into lightweight `WebP` format, reducing the total visual network payload by **~90%**.
* **Network & Bandwidth Optimization:** * Integrated server-side **Brotli (`br`) compression**, reducing initial HTML/CSS/JS text payloads by **~75%**.
  * **Socket Data Packing:** Refactored the real-time networking layer to replace heavy JSON objects with a custom array-based protocol, reducing WebSocket bandwidth consumption by **~70%**.
* **Client-Side Prediction (Lag Compensation):** Implemented optimistic UI rendering to instantly update the local DOM on user interaction before server validation, completely eliminating perceived network latency for users on slow connections.
* **Silent Preloading:** Engineered a background caching utility that forces the browser to silently download all compressed game assets into local memory during the landing page phase, ensuring instant Time-to-Interactive (TTI) when the game begins.

## 🛠️ Tech Stack

* **Backend Environment:** Node.js, Express.js
* **Real-Time Engine:** Socket.io
* **Asset Processing:** Sharp (Node Image Processing)
* **Middleware:** Compression (Brotli/Gzip)
* **Frontend UI/UX:** Pure Vanilla JavaScript, HTML5, CSS3 (No heavy frontend frameworks)

## 🎮 Core Game Features

* **Real-Time State Synchronization:** Instant turn updates and state management between disparate clients.
* **Custom Themed Decks:** Supports dynamic asset loading for multiple deck themes (Pixar, Ghibli, Sketch, Standard).
* **Reflex Mechanics:** Server-side "Snap" validation handling race conditions (first to click wins) with penalty logic for false snaps.
* **SPA Modal Architecture:** Clean, instant UI navigation without page reloads for game settings, instructions, and feedback.

## 📦 How to Run Locally

1. **Clone the repository**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/cartoon-snap.git](https://github.com/YOUR_USERNAME/cartoon-snap.git)
   cd cartoon-snap
    ```

2. **Install Dependencies**
```bash
npm install
```


3. **Asset Pipeline (Optional)**
*If you are adding new raw images to the `raw_cards` folder, run the compression script before starting the server:*
```bash
node compress.js
node cleanup.js 
```


4. **Start the Server**
```bash
npm start
```


5. **Play!**
* Open `http://localhost:3000` in two different browser tabs.
* The server automatically handles matchmaking and assigns players to a live room.



## 🔮 Future Roadmap (v2)

* [ ] Persistent Lobby System (Create/Join specific private rooms via unique codes)
* [ ] Database Integration (MongoDB) for tracking global leaderboards and user win/loss ratios.
* [ ] WebRTC Voice Chat integration for real-time trash-talking.
