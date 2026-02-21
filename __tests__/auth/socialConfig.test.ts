jest.mock('@react-native-google-signin/google-signin');
jest.mock('firebase/app');
jest.mock('firebase/auth');
jest.mock('firebase/firestore');

import { GoogleSignin } from '@react-native-google-signin/google-signin';

describe('Auth social config', () => {
  it('configures Google Sign-In with the correct client IDs', () => {
    // Import triggers module-level GoogleSignin.configure(...)
    require('@/contexts/AuthContext');

    expect(GoogleSignin.configure).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.configure).toHaveBeenCalledWith(expect.objectContaining({
      iosClientId: '874503441995-k7aoaoq3h96pfj4qtfo81e62pahr6lpg.apps.googleusercontent.com',
      // OAuth "Web client" id (client_type: 3 in google-services.json)
      webClientId: '874503441995-2mgu0aqmmpq2g0n4lsplsu48l8674urm.apps.googleusercontent.com',
    }));
  });
});

