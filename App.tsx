import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { auth } from './firebase.config';

// Screens
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import LeaderboardScreen from './screens/LeaderBoardScreen';
import LinkPartnerScreen from './screens/LinkPartnerScreen';
import PremiumScreen from './screens/PremiumScreen';
import ReportScreen from './screens/ReportScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return null; // Or a loading screen component
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#16213e',
            },
            headerTintColor: '#e94560',
            headerTitleStyle: {
              fontWeight: 'bold',
              color: '#fff',
            },
          }}
        >
          {!user ? (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Report"
                component={ReportScreen}
                options={({ route }) => ({
                  title: route.params.type === 'trigger' ? '😤 Report Mistake' : '✨ Log Good Deed',
                })}
              />
              <Stack.Screen
                name="Leaderboard"
                component={LeaderboardScreen}
                options={{ title: '📊 Weekly Leaderboard' }}
              />
              <Stack.Screen
                name="Premium"
                component={PremiumScreen}
                options={{ title: '⭐ Premium' }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: '⚙️ Settings' }}
              />
              <Stack.Screen
                name="LinkPartner"
                component={LinkPartnerScreen}
                options={{ title: '💑 Link Partner' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}