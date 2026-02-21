import appJson from '../../app.json';

describe('Expo config', () => {
  it('configures Android googleServicesFile', () => {
    expect(appJson.expo.android.googleServicesFile).toBe('./google-services.json');
  });

  it('does not include the unused fixFirebaseHeaders plugin', () => {
    const plugins = appJson.expo.plugins || [];
    const names = plugins.map((p: any) => (Array.isArray(p) ? p[0] : p));
    expect(names).not.toContain('./plugins/fixFirebaseHeaders');
  });
});

