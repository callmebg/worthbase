/// <reference types="jest" />

// Enable React act() environment for React 19
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Full react-native mock (no jest.requireActual to avoid ESM issues) ───
jest.mock('react-native', () => {
  const React = jest.requireActual('react');

  // Create a mock component that renders as a host element
  const makeComponent = (name: string) => {
    const comp = React.forwardRef((props: any, ref: any) =>
      React.createElement(name, { ...props, ref })
    );
    (comp as any).displayName = name;
    return comp;
  };

  const View = makeComponent('View');
  const Text = makeComponent('Text');
  const TextInput = makeComponent('TextInput');
  const TouchableOpacity = makeComponent('TouchableOpacity');
  const TouchableHighlight = makeComponent('TouchableHighlight');
  const TouchableWithoutFeedback = makeComponent('TouchableWithoutFeedback');
  const Pressable = makeComponent('Pressable');
  const Image = makeComponent('Image');
  const ScrollView = makeComponent('ScrollView');
  const SafeAreaView = makeComponent('SafeAreaView');
  const KeyboardAvoidingView = makeComponent('KeyboardAvoidingView');
  const FlatList = ({ data, renderItem, keyExtractor }: any) => {
    return React.createElement(
      View,
      null,
      data ? data.map((item: any, index: number) =>
        React.cloneElement(renderItem({ item, index }), {
          key: keyExtractor ? keyExtractor(item) : String(index),
        })
      ) : null
    );
  };
  const SectionList = FlatList;
  const Modal = ({ children, visible }: any) =>
    visible ? React.createElement(View, null, children) : null;

  const StyleSheet = {
    create: (styles: any) => styles,
    flatten: (styles: any) => (Array.isArray(styles) ? Object.assign({}, ...styles) : styles),
    compose: (a: any, b: any) => [a, b],
  };

  const Dimensions = {
    get: jest.fn(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };

  const Platform = {
    OS: 'ios',
    select: (obj: any) => obj.ios ?? obj.default,
    Version: 16,
  };

  const Animated = {
    View: makeComponent('Animated.View'),
    Text: makeComponent('Animated.Text'),
    Image: makeComponent('Animated.Image'),
    Value: class {
      _value = 0;
      constructor(v: number) { this._value = v; }
      setValue(v: number) { this._value = v; }
    },
    timing: jest.fn(() => ({ start: jest.fn((cb?: any) => cb && cb()) })),
    spring: jest.fn(() => ({ start: jest.fn((cb?: any) => cb && cb()) })),
    decay: jest.fn(() => ({ start: jest.fn((cb?: any) => cb && cb()) })),
    loop: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn((cb?: any) => cb && cb()) })),
    parallel: jest.fn(() => ({ start: jest.fn((cb?: any) => cb && cb()) })),
  };

  const Vibration = {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  };

  const AppState = {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  };

  const Alert = {
    alert: jest.fn(),
  };

  const Switch = makeComponent('Switch');
  const Share = { share: jest.fn() };
  const ActivityIndicator = makeComponent('ActivityIndicator');

  return {
    View, Text, TextInput, TouchableOpacity, TouchableHighlight,
    TouchableWithoutFeedback, Pressable, Image, ScrollView, SafeAreaView,
    KeyboardAvoidingView, FlatList, SectionList, Modal, Switch, ActivityIndicator,
    StyleSheet, Dimensions, Platform, Animated, Vibration, AppState, Alert, Share,
    // Re-export common hooks/APIs
    useWindowDimensions: () => ({ width: 375, height: 812 }),
    useColorScheme: () => 'light',
    Easing: { bezier: jest.fn(), linear: jest.fn(), ease: jest.fn() },
  };
});

// ─── Mock react-native-chart-kit ───
jest.mock('react-native-chart-kit', () => {
  const React = jest.requireActual('react');
  return {
    LineChart: () => React.createElement('View', { testID: 'line-chart' }),
    BarChart: () => React.createElement('View', { testID: 'bar-chart' }),
    PieChart: () => React.createElement('View', { testID: 'pie-chart' }),
  };
});

// ─── Mock react-native-svg ───
jest.mock('react-native-svg', () => {
  const React = jest.requireActual('react');
  const makeMock = (name: string) => ({ children }: { children?: React.ReactNode }) =>
    React.createElement(name, null, children);
  return {
    Svg: makeMock('Svg'), Path: makeMock('Path'), Circle: makeMock('Circle'),
    Rect: makeMock('Rect'), G: makeMock('G'), Text: makeMock('Text'),
    Line: makeMock('Line'), Polyline: makeMock('Polyline'),
    Defs: makeMock('Defs'), ClipPath: makeMock('ClipPath'),
    LinearGradient: makeMock('LinearGradient'), Stop: makeMock('Stop'),
  };
});

// ─── Mock expo-file-system ───
const mockFiles = new Map<string, string>();
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(async (path: string) => ({ exists: mockFiles.has(path) || [...mockFiles.keys()].some(k => k.startsWith(path)) })),
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async (path: string, content: string) => { mockFiles.set(path, content); }),
  readAsStringAsync: jest.fn(async (path: string) => mockFiles.get(path) ?? ''),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFiles.get(from) ?? '';
    mockFiles.set(to, content);
  }),
  deleteAsync: jest.fn(async (path: string) => { mockFiles.delete(path); }),
  readDirectoryAsync: jest.fn(async (dirPath: string) => {
    const files: string[] = [];
    for (const key of mockFiles.keys()) {
      if (key.startsWith(dirPath)) files.push(key.substring(dirPath.length));
    }
    return files;
  }),
  EncodingType: { UTF8: 'utf8' },
}));

// expo-file-system/legacy — same API, used by export/import/backup services
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn(async (path: string) => ({ exists: mockFiles.has(path) || [...mockFiles.keys()].some(k => k.startsWith(path)) })),
  makeDirectoryAsync: jest.fn(async () => {}),
  writeAsStringAsync: jest.fn(async (path: string, content: string) => { mockFiles.set(path, content); }),
  readAsStringAsync: jest.fn(async (path: string) => mockFiles.get(path) ?? ''),
  copyAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    const content = mockFiles.get(from) ?? '';
    mockFiles.set(to, content);
  }),
  deleteAsync: jest.fn(async (path: string) => { mockFiles.delete(path); }),
  readDirectoryAsync: jest.fn(async (dirPath: string) => {
    const files: string[] = [];
    for (const key of mockFiles.keys()) {
      if (key.startsWith(dirPath)) files.push(key.substring(dirPath.length));
    }
    return files;
  }),
  EncodingType: { UTF8: 'utf8' },
}));

// ─── Mock expo-sqlite ───
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  SQLiteDatabase: jest.fn(),
}));

// ─── Mock expo-crypto (SHA-256 hashing) ───
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algo: string, data: string) => {
    // Deterministic mock hash for testing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const chr = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `mock-sha256-${Math.abs(hash).toString(16).padStart(8, '0')}`;
  }),
}));

// ─── Mock expo-secure-store ───
const secureStoreData = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => secureStoreData.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { secureStoreData.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { secureStoreData.delete(key); }),
}));

// ─── Mock expo-local-authentication ───
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [2]), // FACIAL_RECOGNITION
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

// ─── Mock expo-sharing ───
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

// ─── Mock react-native-paper ───
jest.mock('react-native-paper', () => {
  const React = jest.requireActual('react');
  const defaultTheme = {
    colors: {
      primary: '#6C5CE7', onPrimary: '#fff', primaryContainer: '#E8E5FD',
      onPrimaryContainer: '#2D3436', secondary: '#636E72', onSecondary: '#fff',
      error: '#E17055', onError: '#fff', background: '#f5f5f5', onBackground: '#2D3436',
      surface: '#fff', onSurface: '#2D3436', surfaceVariant: '#f0f0f0',
      onSurfaceVariant: '#636E72', outline: '#dfe6e9', outlineVariant: '#B2BEC3',
      tertiary: '#B2BEC3', success: '#00B894', warning: '#FDCB6E', info: '#74B9FF',
      primaryLight: '#A29BFE', primaryHex: '#6C5CE7',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: { sm: 8, md: 12, lg: 16, xl: 20 },
  };
  return {
    useTheme: () => defaultTheme,
    PaperProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Button: ({ children, onPress }: any) => React.createElement('Pressable', { onPress }, children),
    Card: Object.assign(
      ({ children, onPress }: any) => React.createElement('View', { onPress }, children),
      { Content: ({ children }: any) => React.createElement('View', null, children) },
    ),
    TextInput: (props: any) => React.createElement('TextInput', props),
    Chip: ({ children, onPress }: any) => React.createElement('Pressable', { onPress }, children),
    FAB: ({ onPress }: any) => React.createElement('Pressable', { onPress }),
    List: { Item: ({ title, onPress }: any) => React.createElement('Pressable', { onPress }, React.createElement('Text', null, title)) },
    Text: ({ children }: any) => React.createElement('Text', null, children),
    Switch: (props: any) => React.createElement('Switch', props),
    MD3LightTheme: {}, MD3DarkTheme: {},
  };
});

// ─── Mock react-native-worklets ───
jest.mock('react-native-worklets', () => ({
  wrap: (fn: any) => fn,
  runOnJS: (fn: any) => fn,
  runOnUI: (fn: any) => fn,
  makeMutable: (v: any) => ({ value: v }),
  useSharedValue: (v: any) => ({ value: v }),
}));

// ─── Mock react-native-reanimated ───
jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const View = React.forwardRef((props: any, ref: any) =>
    React.createElement('Animated.View', { ...props, ref })
  );
  const AnimatedMock = {
    View,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => (typeof fn === 'function' ? fn() : {}),
    withTiming: (v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
    withSpring: (v: any) => v,
    Easing: { linear: jest.fn(), bezier: jest.fn() },
  };
  return {
    __esModule: true,
    default: AnimatedMock,
    ...AnimatedMock,
  };
});

// ─── Mock react-native-gesture-handler ───
jest.mock('react-native-gesture-handler', () => {
  const React = jest.requireActual('react');
  const noop = () => ({});
  const gestureMock = {
    onUpdate: noop, onEnd: noop, onBegin: noop, onStart: noop,
    minDistance: noop, minPointers: noop, enabled: noop,
  };
  // Handler components that accept refs and render children
  const makeHandler = (name: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(name, { ref }, children)
    );
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    PanGestureHandler: makeHandler('PanGestureHandler'),
    PinchGestureHandler: makeHandler('PinchGestureHandler'),
    TapGestureHandler: makeHandler('TapGestureHandler'),
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => gestureMock,
      Pinch: () => gestureMock,
      Tap: () => gestureMock,
      Simultaneous: (...gestures: any[]) => gestures[0],
      Race: (...gestures: any[]) => gestures[0],
      Exclusive: (...gestures: any[]) => gestures[0],
    },
    State: { UNDETERMINED: 0, BEGAN: 2, ACTIVE: 4, END: 5, FAILED: 6, CANCELLED: 3 },
  };
});


// ─── Mock @gorhom/bottom-sheet ───
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual('react');
  const BottomSheet = React.forwardRef(({ children }: any, ref: any) =>
    React.createElement('View', { ref }, children)
  );
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: any) => React.createElement('ScrollView', null, children),
    BottomSheetTextInput: (props: any) => React.createElement('TextInput', props),
  };
});

// ─── Mock lucide-react-native ───
jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const handler: ProxyHandler<any> = {
    get: (_target: any, prop: string) => {
      if (prop === '__esModule') return true;
      return (props: any) => React.createElement('Icon', { name: prop, ...props });
    },
  };
  return new Proxy({}, handler);
});

// ─── Mock react-native-safe-area-context ───
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ─── Mock expo-router ───
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn((cb: any) => cb()),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// ─── Silence console.warn for known RN test warnings ───
const originalWarn = console.warn;
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
    if (typeof args[0] === 'string') {
      if (args[0].includes('Animated: `useNativeDriver`')) return;
      if (args[0].includes('react-test-renderer is deprecated')) return;
    }
    originalWarn.call(console, ...args);
  });
});

// ─── Silence console.error for known non-critical errors ───
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    if (typeof args[0] === 'string') {
      if (args[0].includes('react-test-renderer is deprecated')) return;
      if (args[0].includes('not configured to support act')) return;
      if (args[0].includes('not wrapped in act')) return;
    }
    originalError.call(console, ...args);
  });
});
