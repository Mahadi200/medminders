declare module 'react-native' {
  import * as React from 'react';

  export interface StyleSheetNamedStyles {
    [key: string]: any;
  }

  export const StyleSheet: {
    create<T extends StyleSheetNamedStyles>(styles: T): T;
  };

  export const View: React.FC<any>;
  export const Text: React.FC<any>;
  export const SafeAreaView: React.FC<any>;
  export const ScrollView: React.FC<any>;
  export const TouchableOpacity: React.FC<any>;
  export const Alert: {
    alert(title: string, message?: string, buttons?: any[]): void;
  };
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
  };
  export default AsyncStorage;
}
