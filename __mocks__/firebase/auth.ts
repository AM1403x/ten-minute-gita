export const initializeAuth = jest.fn(() => ({
  currentUser: null,
}));

export const getReactNativePersistence = jest.fn(() => ({}));

export const getAuth = jest.fn(() => ({
  currentUser: null,
}));

export const onAuthStateChanged = jest.fn((_auth: unknown, cb: (user: null) => void) => {
  cb(null);
  return jest.fn(); // unsubscribe
});

export const signInWithCredential = jest.fn(() => Promise.resolve({ user: { uid: 'test-uid', displayName: null } }));

export const GoogleAuthProvider = {
  credential: jest.fn(() => ({})),
};

export const OAuthProvider = jest.fn().mockImplementation(() => ({
  credential: jest.fn(() => ({})),
}));

export const signInWithEmailAndPassword = jest.fn(() => Promise.resolve({ user: { uid: 'test-uid', displayName: null } }));

export const createUserWithEmailAndPassword = jest.fn(() => Promise.resolve({ user: { uid: 'test-uid', displayName: null } }));

export const sendPasswordResetEmail = jest.fn(() => Promise.resolve());

const signOut = jest.fn(() => Promise.resolve());
export { signOut };

export const updateProfile = jest.fn(() => Promise.resolve());
