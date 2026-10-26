# BFL Fitness — Mobile Application

Production-ready React Native + TypeScript mobile application for the BFL Fitness platform, built with **Expo SDK 57**.

This mobile app connects directly to the **SAME** Firebase backend as the web app (`bfl-project-ef584`), sharing the identical Firestore collections, Storage buckets, and security rules without duplicating databases.

---

## 📱 Features

### 1. Authentication & Session Persistence
- **Sign In, Sign Up, & Password Reset** with Firebase Authentication.
- Native session persistence via `@react-native-async-storage/async-storage`.
- Real-time profile synchronization and role detection (`client`, `coach`, `admin`).

### 2. Client Dashboard (`HomeScreen`)
- Athlete greeting with personalized initials avatar.
- **Subscription Status Banner** alerting clients if payment is `past_due`, `expired`, `cancelled`, or `pending_coach_approval`.
- **Today's Focus Workout** card with exercise count, duration, and one-tap launch.
- Daily macro summary (Calories, Protein, Carbs, Fats).
- Quick actions for Weekly Check-In and Coach Messaging.

### 3. Training & Workouts (`WorkoutsScreen` & `WorkoutDetailScreen`)
- Filter sessions by **All**, **Upcoming**, and **Completed**.
- Complete workout protocols with target muscle groups and equipment tags.
- Interactive set-by-set tracker (target vs. actual weight & reps, set completion checkmarks).
- Built-in **Rest Timer** with live countdown between sets.
- Session completion modal: 1–5 star intensity rating, duration, and coach feedback notes.

### 4. Nutrition Strategy (`NutritionScreen`)
- Daily calorie target with macro distribution visualizer (Protein, Carbs, Fats percentage split).
- Interactive **Hydration Tracker** with quick `+250ml` and `+500ml` logging buttons.
- Coach protocol guidelines and daily meal notes.
- Recommended supplementation checklist.

### 5. Progress & Transformation Photos (`ProgressScreen`)
- Weight progression tracking (start vs. current with delta kg).
- **Log Daily Measurements** modal (weight, waist cm, chest cm).
- **Transformation Photo Gallery** with horizontal preview.
- Direct camera/gallery upload using `expo-image-picker` with storage upload to Firebase Storage `progress_photos/{userId}/`.

### 6. Weekly Check-In Protocol (`CheckInScreen`)
- Check-in week number, bodyweight, and waist measurement.
- Subjective scale ratings (1–5) for energy, stress, and hunger.
- Diet & workout adherence rating (1–10).
- **Direct Multi-Angle Photo Upload**:
  - Front, side, and back photo pickers with local thumbnail preview and remove capability.
  - Automatically uploads to Firebase Storage `checkin-photos/{userId}/{timestamp}_{angle}.jpg`.
  - Saves the resulting download URLs to the client's `checkins` Firestore document.

### 7. Direct Coach Messaging (`ChatScreen`)
- Real-time two-way messaging between athlete and coach.
- Synchronized with the Firestore `messages` collection.
- Responsive message bubbles with timestamps and auto-scroll.

### 8. Athlete Account & Membership (`ProfileScreen`)
- Athlete profile details and assigned Head Coach.
- Membership tier and subscription status badge.
- App preferences and sign-out confirmation.

---

## 🛠️ Architecture & Tech Stack

- **Framework**: Expo SDK 57 (React Native 0.86, React 19)
- **Language**: TypeScript (Strict Mode)
- **Navigation**: React Navigation 7 (Native Stack + Bottom Tabs)
- **Backend**: Firebase JS SDK (Auth, Firestore, Storage)
- **Storage Persistence**: `@react-native-async-storage/async-storage`
- **Media**: `expo-image-picker`
- **UI & Icons**: `@expo/vector-icons` (Ionicons), `expo-linear-gradient`
- **Design System**: BFL brand palette (Vibrant Red `#DC2626`, neutral surfaces, premium typography)

---

## 🚀 Running the App

Inside `d:/BFL_fitness/bfl-mobile`:

```bash
# Start Expo development server
npm start
# or: npx expo start

# Run on iOS simulator (Mac required)
npm run ios

# Run on Android emulator / connected device
npm run android

# Run in Web browser preview
npm run web
```

### Testing on a Physical Phone:
1. Install **Expo Go** from the iOS App Store or Google Play Store.
2. Run `npm start` in this directory.
3. Scan the QR code displayed in the terminal with your phone's camera (iOS) or Expo Go app (Android).
