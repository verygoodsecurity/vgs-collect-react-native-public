// src/screens/HomeScreen.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from './App';

type NavProp = StackNavigationProp<RootStackParamList, 'Home'>;

const useCases: { title: string; screen: keyof RootStackParamList }[] = [
  { title: 'Collect Card Data',      screen: 'CollectCardData' },
  { title: 'Create Card with Card Management API', screen: 'CreateCard' },
  { title: 'Tokenize Data', screen: 'TokenizeData' }
];

export default function HomeScreen({ navigation }: { navigation: NavProp }) {
  return (
    <View style={styles.container}>
      {useCases.map(({ title, screen }) => (
        <TouchableOpacity
          key={screen}
          style={styles.cell}
          onPress={() => navigation.navigate(screen)}
        >
          <Text style={styles.cellText}>{title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white' },
  cell: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  cellText: {
    fontSize: 16,
    fontWeight: '500',
  },
});