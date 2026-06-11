# ChKE Śpiewnik - Local Development Guide

This application is a full-stack web app built with React, Vite, and an Express.js backend (running via `server.ts`).

## Prerequisites

- **Node.js**: Version 18 or higher is recommended.
- **npm**: Comes with Node.js (you can also use `yarn` or `pnpm`).

## Running the App Locally

Follow these steps to run the application in development mode on your local machine:

1. **Install Dependencies**
   Open your terminal in the project root folder and run:
   ```bash
   npm install
   ```

2. **Start the Development Server**
   Since the app uses a custom Express backend to scrape/cache the songs and serve the React application via Vite middleware, run the following command to start everything:
   ```bash
   npm run dev
   ```

3. **Open the Application**
   Once the server starts, it will be available on port 3000. Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

## Features & Navigation

- **Main Song List**: Available at the root `http://localhost:3000/`
- **Admin Panel**: The settings button has been hidden, but the admin panel can still be accessed directly by navigating to [http://localhost:3000/admin](http://localhost:3000/admin). Here you can manage song visibility, edit titles/lyrics, and add custom songbook URLs.

## Building for Production

If you want to test the compiled production version locally:

1. **Build the Application**
   This command compiles the React frontend (to `dist/`) and bundles the Express server (to `dist/server.cjs`):
   ```bash
   npm run build
   ```

2. **Start the Production Server**
   ```bash
   npm start
   ```
   The app will run in production mode on [http://localhost:3000](http://localhost:3000).

## Testing Offline Mode (PWA)

To safely test the Progressive Web App's offline capabilities:
1. It is recommended to run the production build (`npm run build` then `npm start`) as service workers update more predictably.
2. Open the site in Google Chrome or another Chromium browser.
3. Open **Developer Tools** (F12) -> Go to the **Network** tab.
4. Select the **Offline** profile from the throttling dropdown.
5. Reload the page to confirm that the UI and cached songs appear without an active internet connection.
