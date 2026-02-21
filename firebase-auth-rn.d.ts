// Firebase JS SDK exposes React Native persistence helpers via the @firebase/auth
// React Native bundle. The public `firebase/auth` typings don't currently include
// this export, so we add a local type shim.
export {};

declare module '@firebase/auth' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function getReactNativePersistence(storage: any): any;
}
