import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { appleAuth } from "@invertase/react-native-apple-authentication";

// Call once at app startup (e.g. in App.tsx)
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    // The WEB client ID from Google Cloud Console — not the iOS/Android one.
    // This is what lets your backend verify the idToken server-side.
    webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
    offlineAccess: false,
  });
}

export interface SocialCredential {
  provider: "google" | "apple";
  id_token: string;
  full_name?: string;
}

export async function signInWithGoogle(): Promise<SocialCredential> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo:any = await GoogleSignin.signIn();
  const tokens = await GoogleSignin.getTokens();

  if (!tokens.idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  return {
    provider: "google",
    id_token: tokens.idToken,
    full_name: userInfo.user.name ?? undefined,
  };
}

export async function signInWithApple(): Promise<SocialCredential> {
  if (Platform.OS !== "ios") {
    throw new Error("Sign in with Apple is only available on iOS.");
  }

  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  if (!response.identityToken) {
    throw new Error("Apple sign-in did not return an identity token.");
  }

  // Apple only sends fullName on the FIRST authorization ever — capture it now,
  // it won't be sent again on subsequent logins.
  const fullName = response.fullName
    ? [response.fullName.givenName, response.fullName.familyName]
        .filter(Boolean)
        .join(" ")
        .trim()
    : undefined;

  return {
    provider: "apple",
    id_token: response.identityToken,
    full_name: fullName || undefined,
  };
}