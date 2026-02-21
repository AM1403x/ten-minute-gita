export const getFirestore = jest.fn(() => ({}));

export const doc = jest.fn(() => ({}));

export const getDoc = jest.fn(() =>
  Promise.resolve({
    exists: () => false,
    data: () => null,
  })
);

export const setDoc = jest.fn(() => Promise.resolve());

export const updateDoc = jest.fn(() => Promise.resolve());

export const serverTimestamp = jest.fn(() => new Date());

export const arrayUnion = jest.fn((val: unknown) => val);

export const runTransaction = jest.fn((_db: unknown, updateFunction: unknown) => {
  const fn = updateFunction as (tx: { get: jest.Mock; update: jest.Mock }) => unknown;
  return Promise.resolve(
    fn({
      get: jest.fn(),
      update: jest.fn(),
    })
  );
});
