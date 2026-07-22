import NetInfo from "@react-native-community/netinfo";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import NoInternetScreen from "@/screens/main/onboarding/NoInternetScreen";
import { ToastProvider } from "./src/components/common/Toast";
import RootNavigator from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef"; 

SplashScreen.preventAutoHideAsync();

// ── TanStack QueryClient ──────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests twice before showing an error
      retry: 2,
      // Refetch on window focus is disabled for mobile (no "focus" concept)
      refetchOnWindowFocus: false,
      // Keep cached data fresh for 3 minutes by default
      staleTime: 3 * 60 * 1_000,
    },
    mutations: {
      // Don't retry mutations — side effects shouldn't be duplicated
      retry: 0,
    },
  },
});

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  const [fontsLoaded, fontError] = useFonts({
    "HelveticaNeue-CondensedBold": require("./assets/fonts/HelveticaNeue-CondensedBold.otf"),
    "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected reflects the network adapter (e.g. attached to a
      // Wi-Fi router); isInternetReachable additionally checks that the
      // connection actually reaches the internet. Treat either as offline,
      // but don't flip to the offline screen on isInternetReachable's
      // transient `null` ("still checking") state.
      const offline =
        state.isConnected === false || state.isInternetReachable === false;
      setIsConnected(!offline);
    });
    return unsubscribe;
  }, []);

  if (!fontsLoaded && !fontError) return null;

  if (isConnected === false) {
    return (
      <NoInternetScreen
        onRetry={() =>
          NetInfo.fetch().then((s) =>
            setIsConnected(!(s.isConnected === false || s.isInternetReachable === false)),
          )
        }
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ToastProvider>
            <NavigationContainer ref={navigationRef}>
              <View style={{ flex: 1 }} onLayout={onLayout}>
                <RootNavigator />
              </View>
            </NavigationContainer>
          </ToastProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}


