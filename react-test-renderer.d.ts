declare module 'react-test-renderer' {
  // Keep tests type-safe at the project level without pulling extra typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TestRenderer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const act: any;
  export default TestRenderer;
}

