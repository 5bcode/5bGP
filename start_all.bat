@echo off
echo Starting Website...
start "Website" cmd /k "pnpm run dev"

echo Starting RuneLite Plugin...
cd flip-to-5b-plugin
start "RuneLite Plugin" cmd /k "gradlew runClient"

echo All services started!
