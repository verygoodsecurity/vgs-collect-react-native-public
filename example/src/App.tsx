// App.tsx
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './HomeScreen';
import CollectCardData from './use-cases/CollectCardData';
import CreateCard from './use-cases/CreateCard';
import TokenizeData from './use-cases/TokenizeData';

export type RootStackParamList = {
  Home: undefined;
  CollectCardData: undefined;
  CreateCard: undefined;
  TokenizeData: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Home' }}
          />
          <Stack.Screen
            name="CollectCardData"
            component={CollectCardData}
            options={{ title: 'Collect card data' }}
          />
          <Stack.Screen
            name="CreateCard"
            component={CreateCard}
            options={{ title: 'Create Card' }}
          />
          <Stack.Screen
            name="TokenizeData"
            component={TokenizeData}
            options={{ title: 'Tokenize Data' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}