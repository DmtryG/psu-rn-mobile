# Practical Assignment for the Course “Application Development Technologies for Mobile Platforms”

<img src="images/promo.png" />

A React Native mobile application with an interactive map that allows users to add markers and attach images to them.

## Features
* Interactive map with the ability to add markers
* Long press to add a new marker
* Adding images to markers from the gallery
* Deleting attached images
* Displaying the user’s current location
* Real-time GPS tracking
* Local notifications when approaching markers
* Persistent data storage using SQLite

## Building the project
### 1. Clone the repo
```bash
git clone https://github.com/DmtryG/psu-rn-mobile.git
```

### 2. Install dependencies
In the same folder that contains the `psu-rn-mobile`, run this command:
```bash
npm install
```

### 3. Run the application
```bash
# start in development mode
npm start

# run on iOS
npm run ios
```