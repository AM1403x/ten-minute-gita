# Maestro E2E Testing for React Native / Expo Apps

## What is Maestro?
Maestro is a mobile E2E testing framework. You write tests in YAML, run them against an iOS Simulator or Android Emulator. Maestro Studio is the desktop GUI for writing and running tests.

## Quick Start
1. Install: `brew install maestro` (or `curl -Ls "https://get.maestro.mobile.dev" | bash`)
2. Have your app running on a simulator
3. Open Maestro Studio: `maestro studio`
4. Create a test YAML file and run it

## YAML Syntax Essentials

```yaml
appId: com.your.bundleid
---
- launchApp
- tapOn: "Button Text"
- assertVisible: "Some Text"
```

### Critical Rules
- **NO leading spaces** before top-level list items (causes parse errors)
- **Text selectors are REGEX** matching the ENTIRE element text — always use `.*` wildcards for partial matching
- Nested properties use 4-space indentation under the parent command

### Common Commands

```yaml
# Launch app (without clearing state for Expo dev builds)
- launchApp

# Wait for animations/transitions to settle
- waitForAnimationToEnd
- waitForAnimationToEnd:
    timeout: 15000

# Tap by text (regex — use .* for partial match)
- tapOn: ".*Button Text.*"

# Tap by testID (maps to React Native testID prop)
- tapOn:
    id: "my-test-id"

# Tap by screen coordinates (percentage-based)
- tapOn:
    point: "50%,70%"

# Assert element is visible
- assertVisible: ".*some text.*"

# Wait for element to appear with timeout
- extendedWaitUntil:
    visible: ".*Loading Complete.*"
    timeout: 10000

# Wait for element by testID
- extendedWaitUntil:
    visible:
        id: "my-element"
    timeout: 10000

# Scroll until element is visible
- scrollUntilVisible:
    element: ".*Target Text.*"
    direction: DOWN
```

### Timing Defaults
- `tapOn` waits ~10s for element to appear before failing
- `assertVisible` waits ~7s by default
- `extendedWaitUntil` requires explicit `timeout` parameter
- Always add `waitForAnimationToEnd` between navigation steps

## React Native Selector Mapping

| React Native Prop | Maestro Selector | Example |
|---|---|---|
| `accessibilityLabel` | `text` (default) | `tapOn: "Label Text"` |
| `testID` | `id` | `tapOn: { id: "test-id" }` |
| Visible text content | `text` (default) | `tapOn: "Visible Text"` |

## THE #1 ISSUE: React Native `<Modal>` is Invisible

**React Native's `<Modal>` component renders in a separate native window. Maestro CANNOT see, tap, or interact with ANY element inside a `<Modal>`.** This includes:
- Text inside the modal
- Buttons inside the modal
- testID props on elements inside the modal
- accessibilityLabel on elements inside the modal

This affects: onboarding flows, bottom sheets, auth prompts, confirmation dialogs, share sheets — anything using `<Modal>` from 'react-native'.

### How to Identify This Problem
- `tapOn` fails with "Element not found" even though the element is clearly visible on screen
- Maestro's View Hierarchy inspector (Inspect Screen) shows NO elements from the modal
- Adding `testID` doesn't help
- Adding `accessibilityLabel` doesn't help

### Workarounds (ranked by reliability)

#### 1. Bypass via AsyncStorage (Best for skipping flows)
Write directly to the simulator's AsyncStorage to pre-set state that skips the modal entirely.

**iOS Simulator AsyncStorage path:**
```
~/Library/Developer/CoreSimulator/Devices/{DEVICE_UUID}/data/Containers/Data/Application/{APP_UUID}/Library/Application Support/{BUNDLE_ID}/RCTAsyncLocalStorage_V1/manifest.json
```

Find the device UUID: `xcrun simctl list devices booted`
Find the app UUID: `find ~/Library/Developer/CoreSimulator/Devices/{DEVICE_UUID}/data/Containers/Data/Application -name "manifest.json" -path "*RCTAsyncLocalStorage*" 2>/dev/null`

Write a JSON file with the keys you need pre-set. Example:
```json
{
  "@onboarding_complete": "true",
  "@app_state": "{\"hasSeenWelcome\":true}"
}
```

#### 2. Coordinate Tapping (Best for dismissing modals)
If the modal has a backdrop `Pressable` or a dismiss button at a known position:
```yaml
- tapOn:
    point: "50%,20%"
```
- Coordinates are percentages of screen dimensions
- This CAN reach inside React Native Modals in some cases
- Works best for full-screen backdrop dismiss (tap anywhere on dark overlay)
- Fragile: coordinates change across device sizes

#### 3. Modify App Code (Best long-term)
Replace `<Modal>` with a `position: absolute` `<View>` overlay + add `accessibilityViewIsModal={true}`:

```tsx
// Instead of:
<Modal visible={show}><Content /></Modal>

// Use:
{show && (
  <View style={styles.overlay} accessibilityViewIsModal={true}>
    <Content />
  </View>
)}
```

`accessibilityViewIsModal={true}` tells iOS accessibility to hide elements behind this view, so Maestro only sees the overlay content (not the underlying screen elements that confuse targeting).

Also add `testID` props to interactive elements for reliable targeting:
```tsx
<Pressable testID="dismiss-button" onPress={onDismiss}>
```

Then in YAML:
```yaml
- extendedWaitUntil:
    visible:
        id: "dismiss-button"
    timeout: 10000
- tapOn:
    id: "dismiss-button"
```

## Expo-Specific Issues

### `clearState: true` Breaks Expo Dev Builds
```yaml
# DON'T do this with Expo dev builds:
- launchApp:
    clearState: true   # Wipes dev server connection!
```
This clears AsyncStorage INCLUDING Expo's dev server URL, causing the Expo launcher to appear instead of your app. Use AsyncStorage pre-seeding instead to control initial state.

### `clearKeychain: true` is Safe
Clearing keychain doesn't affect Expo's dev server connection.

## Absolute-Positioned Overlays (Non-Modal)

For overlays that use `position: absolute` instead of `<Modal>`:

**Problem:** Without `accessibilityViewIsModal`, Maestro sees BOTH the overlay AND underlying screen elements, causing element targeting confusion.

**Solution:** Add `accessibilityViewIsModal={true}` to the overlay container:
```tsx
<View style={styles.overlay} accessibilityViewIsModal={true}>
```

Then use `testID` + `id` selector for reliable tapping:
```yaml
- extendedWaitUntil:
    visible:
        id: "overlay-button"
    timeout: 10000
- tapOn:
    id: "overlay-button"
```

## Recommended Test Structure

```yaml
appId: com.your.bundleid
---
# 1. Launch (no clearState for Expo)
- launchApp
- waitForAnimationToEnd:
    timeout: 15000

# 2. Interact with elements (use regex wildcards)
- tapOn: ".*Button Text.*"
- waitForAnimationToEnd

# 3. Handle overlays (use testID if possible)
- extendedWaitUntil:
    visible:
        id: "overlay-action"
    timeout: 10000
- tapOn:
    id: "overlay-action"
- waitForAnimationToEnd

# 4. Dismiss RN Modals (coordinate tap on backdrop)
- tapOn:
    point: "50%,20%"
- waitForAnimationToEnd

# 5. Assert final state
- assertVisible: ".*Expected Text.*"
```

## Debugging Tips

1. **Use "Inspect Screen" in Maestro Studio** (Cmd+I) to see the view hierarchy — if an element doesn't appear here, Maestro can't interact with it
2. **Check if element is inside a `<Modal>`** — this is the #1 cause of "Element not found" errors when the element is clearly visible on screen
3. **Add `waitForAnimationToEnd`** between every navigation step — most timing failures are solved by this
4. **Use `extendedWaitUntil` before `tapOn`** for elements that appear after async operations
5. **Coordinate tapping is a last resort** — it works but is fragile across device sizes. Always prefer text or testID selectors.
6. **Regex text matching**: Always wrap in `.*` wildcards. `tapOn: "Submit"` matches only if the ENTIRE element text is "Submit". `tapOn: ".*Submit.*"` matches any element containing "Submit".

## Pre-Test State Setup Pattern

For reliable, repeatable tests, pre-seed AsyncStorage before running:

1. Create a JSON manifest with desired initial state
2. Copy it to the simulator's AsyncStorage path
3. Then `launchApp` (without `clearState`)

This lets you:
- Skip onboarding/FTUE flows
- Set up specific progress states
- Avoid auth gates
- Test specific scenarios without manual navigation

## Known Limitations Summary

| Issue | Severity | Workaround |
|---|---|---|
| RN `<Modal>` invisible | Critical | AsyncStorage bypass, coordinate tap, or replace Modal with View |
| `clearState` breaks Expo | High | Don't use it; pre-seed AsyncStorage instead |
| Coordinate taps are fragile | Medium | Use testID + id selector when possible |
| Overlay element confusion | Medium | Add `accessibilityViewIsModal={true}` |
| Tab bar text sometimes not found | Low | Use `.*` regex wildcards + extra wait |
