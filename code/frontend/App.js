import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import IdeaScreen from './src/screens/IdeaScreen';
import PostSquareScreen from './src/screens/PostSquareScreen';
import CompanyScreen from './src/screens/CompanyScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import LoginScreen from './src/screens/LoginScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { navigationRef } from './src/navigation/navigationRef';
import { useWebSocketRoot, useWebSocket } from './src/hooks/useWebSocket';

const Stack = createNativeStackNavigator();

function AppContent() {
  // 建立全局 WS 连接
  useWebSocketRoot();

  // 监听通知消息
  useWebSocket((msg) => {
    if (msg.type === 'notification') {
      Alert.alert(msg.title || '通知', msg.body || '');
    }
  });

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="全民创业" component={HomeScreen} />
      <Stack.Screen name="想法增强" component={IdeaScreen} />
      <Stack.Screen name="创业广场" component={PostSquareScreen} />
      <Stack.Screen name="临时公司" component={CompanyScreen} />
      <Stack.Screen name="对话历史" component={HistoryScreen} />
      <Stack.Screen name="登录" component={LoginScreen} />
      <Stack.Screen name="设置" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
