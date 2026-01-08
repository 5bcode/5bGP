# FlipTo5B RuneLite Plugin

This folder contains the source code for the RuneLite integration.

## How to Build

1. Clone the [RuneLite Plugin Example](https://github.com/runelite/example-plugin) repository.
2. Open it in IntelliJ IDEA.
3. Replace the `ExamplePlugin.java` and `ExampleConfig.java` with the files in this folder (`FlipTo5BPlugin.java` and `FlipTo5BConfig.java`).
4. Update your `build.gradle` to include `com.google.code.gson` if not already present (it usually is in RuneLite).
5. Build the project using Gradle (`./gradlew build`).
6. Sideload the plugin into RuneLite (requires Developer Mode or local plugin loading).

## Setup

1. Go to your FlipTo5B Web App -> Tools.
2. Generate an API Key.
3. In RuneLite settings, find "FlipTo5B Sync".
4. Paste the API Key.
5. Trading on the GE will now automatically sync to your dashboard!