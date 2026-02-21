export const AppleAuthenticationScope = {
  FULL_NAME: 0,
  EMAIL: 1,
};

export async function signInAsync() {
  return {
    identityToken: 'mock-apple-token',
    fullName: { givenName: 'Test', familyName: 'User' },
  };
}
