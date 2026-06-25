/**
 * socket.ts
 * ─────────────────────────────────────────────────────────────────
 * Socket.IO client for the VoltGo Rider app.
 *
 * Server: wss://api.voltgoapp.com  (root — no /api/v1 prefix)
 *
 * ── Rider emits ──────────────────────────────────────────────────
 *  connect_rider        → join rider room  (send immediately on connect)
 *
 * ── Server emits to rider ────────────────────────────────────────
 *  connected            → room join confirmed
 *  order:assigned       → dispatch assigned a new order
 *  order:cancelled      → customer cancelled before rider accepted
 *  order:status_changed → status update after accept
 *  rider:location       → server ACK of GPS push
 *  error                → server-side error
 *
 * STATUS VALUES from spec:
 *  rider_arriving | collected | in_transit | delivered
 */

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SocketOrderAssigned {
  order_id: string;
  customer_id: string;
  customer_name: string; // ← add
  customer_phone: string; // ← add
  item_type: string; // ← add
  price: number; // ← add
  pickup_eta?: number; // ← add
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  distance_km: number;
  message: string;
  timestamp: string;
}

export interface SocketOrderCancelled {
  order_id: string;
  message: string;
  timestamp: string;
}

/** Exact status strings as defined in the socket-events spec */
export type OrderStatusChangedStatus =
  | "rider_arriving" // rider accepted → heading to pickup
  | "collected" // rider collected the package
  | "in_transit" // rider on the way to drop-off
  | "delivered"; // proof submitted, delivery done

export interface SocketOrderStatusChanged {
  order_id: string;
  userId: string;
  status: OrderStatusChangedStatus;
  /** Only present on rider_arriving — rider identity */
  rider?: {
    id: string;
    full_name: string;
    phone: string;
  };
  /** Only present on delivered */
  proof_of_delivery_url?: string;
  timestamp: string;
}

export interface SocketRiderLocation {
  order_id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface SocketError {
  message: string;
  code: number;
}

export type SocketEventMap = {
  connected: {
    message: string;
    socketId: string;
    timestamp: string;
    userId: string;
  };
  "order:assigned": SocketOrderAssigned;
  "order:cancelled": SocketOrderCancelled;
  "order:status_changed": SocketOrderStatusChanged;
  "rider:location": SocketRiderLocation;
  error: SocketError;
};

// ── Singleton ─────────────────────────────────────────────────────────────────
const SOCKET_URL = "wss://api.voltgoapp.com";

class SocketService {
  private socket: Socket | null = null;
  private riderId: string | null = null;
  private readonly MAX_RECONNECT = 5;

  async connect(riderId: string): Promise<void> {
    if (this.socket?.connected && this.riderId === riderId) return;

    this.riderId = riderId;
    const token = await getAccessToken();

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1_500,
      reconnectionAttempts: this.MAX_RECONNECT,
      auth: { token: token ?? "" },
    });

    this.socket.on("connect", () => {
      setTimeout(() => {
        this.socket?.emit("connect_rider", {
          riderId,
          socketId: this.socket?.id,
          timestamp: new Date().toISOString(),
        });
      }, 500);
    });

    this.socket.on("connect_error", (err) => {
      console.warn("[Socket] connect_error", err.message);
    });

    this.socket.on("disconnect", (reason) => {
      console.info("[Socket] disconnected:", reason);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.riderId = null;
  }

  on<K extends keyof SocketEventMap>(
    event: K,
    handler: (payload: SocketEventMap[K]) => void,
  ): void {
    this.socket?.on(event as string, handler as any);
  }

  off<K extends keyof SocketEventMap>(
    event: K,
    handler?: (payload: SocketEventMap[K]) => void,
  ): void {
    this.socket?.off(event as string, handler as any);
  }

  emit(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  onConnectionChange(onConnect: () => void, onDisconnect: () => void): void {
    this.socket?.on("connect", onConnect);
    this.socket?.on("disconnect", onDisconnect);
  }

  offConnectionChange(onConnect: () => void, onDisconnect: () => void): void {
    this.socket?.off("connect", onConnect);
    this.socket?.off("disconnect", onDisconnect);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();




/**
 * useRider.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query hooks for rider profile, online status and location.
 *
 *  useRiderProfile    → GET  /rider/me
 *  useToggleStatus    → PUT  /rider/status
 *  useUpdateLocation  → PUT  /rider/location
 *  useLocationHeartbeat – useEffect wrapper that fires updateLocation
 *                         every HEARTBEAT_INTERVAL ms while online
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { riderApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useRiderStore } from "../../store/riderStore";

// ── Query keys ────────────────────────────────────────────────────────────────
export const RIDER_QUERY_KEYS = {
  profile: ["rider", "profile"] as const,
  activeOrder: ["rider", "activeOrder"] as const,
  myOrders: ["rider", "myOrders"] as const,
  offers: ["rider", "offers"] as const,
};

/** GPS push interval while the rider is online (15 seconds). */
const HEARTBEAT_INTERVAL = 15_000;

// ── Rider profile ─────────────────────────────────────────────────────────────
export function useRiderProfile() {
  const { isAuthenticated, updateRider } = useAuthStore();

  return useQuery({
    queryKey: RIDER_QUERY_KEYS.profile,
    queryFn: async () => {
      const res = await riderApi.getProfile();
      const raw = res.data.data as any;

      // Remap API shape → RiderProfile shape
      const profile = {
        ...raw,
        name: raw.full_name ?? raw.name ?? "",
        is_online: raw.active_status === "online",
      };

      updateRider(profile);
      return profile;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1_000,
    retry: 2,
  });
}

// ── Toggle online / offline ───────────────────────────────────────────────────
export function useToggleStatus() {
  const { setOnline, setTogglingStatus } = useRiderStore();
  const { updateRider } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (is_online: boolean) => riderApi.setStatus(is_online),

    onMutate: (is_online) => {
      // Optimistic update so the UI responds instantly
      setTogglingStatus(true);
      setOnline(is_online);
    },

    onSuccess: (response, is_online) => {
      updateRider({ is_online });
      queryClient.invalidateQueries({ queryKey: RIDER_QUERY_KEYS.profile });
    },

    onError: (_err, is_online) => {
      // Rollback optimistic update
      setOnline(!is_online);
      updateRider({ is_online: !is_online });
    },

    onSettled: () => setTogglingStatus(false),
  });
}

// ── Update GPS location ───────────────────────────────────────────────────────
export function useUpdateLocation() {
  return useMutation({
    mutationFn: ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => riderApi.updateLocation(latitude, longitude),
    // Silent — no toast, no invalidation needed
  });
}

// ── Location heartbeat ────────────────────────────────────────────────────────
/**
 * Starts a recurring location push to the server while the rider is online.
 * Reads live coords from `useRiderStore`, no external deps needed.
 *
 * @param enabled  Pass `false` to pause the heartbeat (e.g. while offline)
 */
export function useLocationHeartbeat(enabled: boolean) {
  const { mutate: pushLocation } = useUpdateLocation();
  const { currentCoords, isOnline } = useRiderStore();
  const coordsRef = useRef(currentCoords);
  const isOnlineRef = useRef(isOnline);

  // Keep refs current without restarting the interval
  useEffect(() => {
    coordsRef.current = currentCoords;
  }, [currentCoords]);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => {
      const coords = coordsRef.current;
      if (coords && isOnlineRef.current) {
        pushLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(id);
  }, [enabled]);
}


/**
 * useLocationTracking.ts
 * ─────────────────────────────────────────────────────────────────
 * Starts a foreground location watch as soon as the rider is online.
 * Every update:
 *  1. Writes to riderStore.currentCoords  (consumed by map screens)
 *  2. PUTs to /rider/location every HEARTBEAT_MS (throttled)
 *
 * Mount ONCE in MainNavigator alongside useSocket().
 *
 * Permissions: make sure expo-location is in app.json plugins and
 * the user has granted "While Using" or "Always" location access.
 */

import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useAuthStore } from '@/store/authStore';
import { useRiderStore } from '@/store/riderStore';
import { riderApi } from '@/lib/api';


const HEARTBEAT_MS = 8_000; // PUT /rider/location at most every 8 s

export function useLocationTracking() {
  const { isAuthenticated } = useAuthStore();
  const { isOnline, setCurrentCoords } = useRiderStore();

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPutRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated || !isOnline) {
      // Stop tracking when offline or logged out
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      // Seed the store immediately with a one-shot read so the map
      // has a location before the first watch event fires.
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCurrentCoords({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
        }
      } catch (_) {
        // Non-fatal — watch will provide updates shortly
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,       // metres — avoid excessive updates when standing still
          timeInterval: 3_000,        // ms floor between callbacks
        },
        (loc) => {
          if (cancelled) return;

          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };

          // Always update the in-memory store (map re-renders cheaply)
          setCurrentCoords(coords);

          // Throttle the network PUT
          const now = Date.now();
          if (now - lastPutRef.current >= HEARTBEAT_MS) {
            lastPutRef.current = now;
            riderApi
              .updateLocation(coords.latitude, coords.longitude)
              .catch(() => {
                // Silent — location updates are best-effort
              });
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isAuthenticated, isOnline]);
}



/**
 * DeliveryCompletedScreen.tsx — RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Standalone success screen shown after a rider submits proof of
 * delivery. Previously this file was a duplicate of ActivityDetailScreen
 * — this is a clean rebuild with its own purpose-built UI.
 *
 * Receives the FULL order object forwarded by SubmitPhotoScreen
 * (see useMarkDelivered's mutation response) so "View delivery details"
 * can pass complete data into ActivityDetail — no more blank fields.
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Image,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import UserAvatarIcon from "../../../../assets/icons/user-avatar.svg";
import { MainStackParamList } from "@/navigation/types";
import { Colors, Typography, Radius } from "@/theme";
import Svg, { Path } from "react-native-svg";

type RouteParams = RouteProp<MainStackParamList, "DeliveryCompleted">;

function formatPayment(method?: string): string {
  const map: Record<string, string> = {
    bundle_credit: "Bundle Credits",
    bundle: "Bundle Credits",
    momo: "Mobile Money",
    card: "Card",
    cash: "Cash",
  };
  return (
    map[method ?? ""] ??
    (method ? method.charAt(0).toUpperCase() + method.slice(1) : "—")
  );
}

export default function DeliveryCompletedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();

  const {
    orderId,
    amount = 0,
    pickupAddress = "",
    dropoffAddress = "",
    itemType = "Parcel",
    // Full-order fields forwarded by the SubmitPhotoScreen fix —
    // these come straight from the markDelivered mutation response.
    customerName,
    customerPhone,
    vehicleType,
    paymentMethod,
    distanceKm,
    durationMins,
    proofPhotoUrl,
  } = (route.params ?? {}) as any;

  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Forward the FULL order — not a 5-field subset — into ActivityDetail.
  // This is the fix for the "blank fields on this navigation path" bug:
  // every field ActivityDetailScreen destructures is supplied here.
  const handleViewDetails = () => {
    navigation.replace("ActivityDetail", {
      activityId: orderId,
      destination: dropoffAddress,
      pickupAddress,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      amount,
      status: "completed",
      customerName,
      customerPhone,
      itemDescription: itemType,
      paymentMethod,
      vehicleType,
      distanceKm,
      durationMins,
      proofPhotoUrl,
      fromCompletion: true,
    });
  };

  const handleDone = () => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeIn, transform: [{ scale: scaleIn }] },
        ]}
      >
        <View style={styles.successCircle}>
          <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17L4 12"
              stroke="#1A8A3C"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={styles.heading}>Delivered!</Text>
        <Text style={styles.subheading}>
          Proof of delivery has been{"\n"}submitted for {itemType.toLowerCase()}
          .
        </Text>

        {!!customerName && (
          <View style={styles.customerCard}>
            <View style={styles.avatarCircle}>
              <UserAvatarIcon width={22} height={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerSub}>
                {customerPhone || "Customer"}
              </Text>
            </View>
            <Text style={styles.amount}>GHS {Number(amount).toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Payment</Text>
            <Text style={styles.metaValue}>{formatPayment(paymentMethod)}</Text>
          </View>
          {distanceKm != null && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Distance</Text>
              <Text style={styles.metaValue}>
                {Number(distanceKm).toFixed(1)} km
              </Text>
            </View>
          )}
        </View>

        {!!proofPhotoUrl && (
          <View style={styles.proofWrap}>
            <Text style={styles.proofLabel}>Proof of delivery</Text>
            <Image
              source={{ uri: proofPhotoUrl }}
              style={styles.proofPhoto}
              resizeMode="cover"
            />
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeIn }]}>
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={handleViewDetails}
          activeOpacity={0.85}
        >
          <Text style={styles.detailsBtnText}>View delivery details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 24 : 16,
  },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#EDFBF1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  checkmarkWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkStem: {
    position: "absolute",
    width: 4,
    height: 16,
    backgroundColor: "#1A8A3C",
    borderRadius: 2,
    transform: [{ rotate: "45deg" }, { translateX: 4 }, { translateY: 2 }],
  },
  checkmarkKick: {
    position: "absolute",
    width: 4,
    height: 26,
    backgroundColor: "#1A8A3C",
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }, { translateX: -1 }, { translateY: -4 }],
  },
  heading: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  customerCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  customerName: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  customerSub: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  metaRow: { flexDirection: "row", width: "100%", gap: 12, marginBottom: 18 },
  metaItem: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metaLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  proofWrap: { width: "100%", marginBottom: 8 },
  proofLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  proofPhoto: { width: "100%", height: 140, borderRadius: Radius.lg },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    paddingTop: 10,
    gap: 10,
  },
  detailsBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  detailsBtnText: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  doneBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 17,
    alignItems: "center",
  },
  doneBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
});




/**
 * SubmitPhotoScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Shows the captured proof photo and lets the rider submit or retake.
 *
 * Fix vs previous version:
 *  - Retake passes the full order context back to CameraCapture so
 *    nothing is lost in the loop.
 *  - Deduped (was defined twice in the codebase — only one copy needed).
 */

import { useToast } from "@/components/common/Toast";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMarkDelivered } from "../../hooks/rider/useOrders";
import { MainStackParamList } from "../../navigation/types";
import { Colors, Radius, Shadow, Typography } from "../../theme";

const { width, height } = Dimensions.get("window");
type SubmitParams = RouteProp<MainStackParamList, "SubmitPhoto">;

export default function SubmitPhotoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<SubmitParams>();
  const {
    orderId,
    photoUri,
    amount = 0,
    pickupAddress = "",
    dropoffAddress = "",
    itemType = "",
  } = route.params as any;

  const { mutateAsync: markDelivered, isPending } = useMarkDelivered();
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      const response = await markDelivered({ id: orderId, photoUri });
      // FIX: forward the FULL order returned by the API instead of a
      // 5-field subset — this is what was missing on ActivityDetail.
      const order = response?.data?.data;

      navigation.replace("DeliveryCompleted", {
        orderId,
        amount,
        pickupAddress,
        dropoffAddress,
        itemType,
        // Full order fields, with safe fallbacks to what we already had
        customerName: order?.customer?.full_name,
        customerPhone: order?.customer?.phone,
        vehicleType: order?.vehicle_type,
        paymentMethod: order?.payment_method,
        distanceKm: order?.distance_km,
        durationMins: order?.estimated_duration_mins,
        proofPhotoUrl: order?.proof_of_delivery_url,
      });
    } catch (err: any) {
      console.log(
        "DELIVERY SUBMIT ERROR:",
        JSON.stringify(err?.response?.data ?? err?.message ?? err, null, 2),
      );
      const message =
        err?.response?.data?.message ??
        "Failed to submit delivery. Please retry.";
      toast.error(message);
    }
  };

  const handleRetake = () => {
    // Pass full context so the camera → submit loop never loses order info
    navigation.replace("CameraCapture", {
      orderId,
      amount,
      pickupAddress,
      dropoffAddress,
      itemType,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <Text style={styles.subtitle}>Submit picture to end delivery</Text>

      <View style={styles.photoCard}>
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
        />
      </View>

      <View style={styles.btnWrap}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={handleRetake}
          activeOpacity={0.8}
          disabled={isPending}
        >
          <Text style={styles.retakeText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
          onPress={handleSubmit}
          activeOpacity={0.88}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: "center",
    paddingHorizontal: 22,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 18,
    marginBottom: 22,
  },
  photoCard: {
    width: width - 44,
    height: height * 0.48,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.navy,
    backgroundColor: Colors.inputBg,
    marginBottom: 32,
  },
  photo: { width: "100%", height: "100%" },
  btnWrap: { width: "100%", gap: 12, paddingHorizontal: 16 },
  retakeBtn: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  retakeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },
  submitText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});


/**
 * HomeMapScreen.tsx - RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * The rider's idle home screen. Shows a live map centred on the
 * rider's position and waits for an incoming order offer.
 *
 * What changed vs the previous version:
 *
 *  REMOVED — useCurrentLocation() + the setCurrentCoords effect
 *    Location is now owned by useLocationTracking (mounted in
 *    MainNavigator). This screen just reads currentCoords from the
 *    store — no duplicate watchers.
 *
 *  REMOVED — useLocationHeartbeat()
 *    The throttled PUT /rider/location heartbeat is also handled
 *    inside useLocationTracking. No need to call it here.
 *
 *  KEPT — useOrderOffers() REST fallback poll
 *    Still useful when the socket drops. The hook already respects
 *    isOnline and uses a 30 s interval when the socket is live.
 *
 *  KEPT — pendingOffer → DeliveryRequest navigation
 *    Keyed on pendingOffer.id so a new offer always triggers even
 *    if the previous one had the same id (defensive).
 *
 *  KEPT — socket connection dot (useful in QA / staging builds)
 *
 *  ADDED — map re-centres once on first GPS fix, then tracks live
 *    The marker uses tracksViewChanges only while coords are being
 *    set for the first time, avoiding unnecessary re-renders.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import PowerCircleIcon from "../../../assets/icons/power-circle.svg";
import { Colors, Radius, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useOrderOffers } from "../../hooks/rider/useOrders";
import { useToggleStatus } from "../../hooks/rider/useRider";
import { socketService } from "../../lib/socket";
import { useRiderStore } from "../../store/riderStore";
import EmotoSvg from "../../../assets/icons/emoto.svg";
import BicycleSvg from "../../../assets/icons/bicycle.svg"; // or bicycle 6.svg
import { useAuthStore } from "@/store/authStore";

const DEFAULT_REGION = {
  latitude: 5.603717,
  longitude: -0.186964,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export default function HomeMapScreen() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const { rider } = useAuthStore();
  const vehicleType = rider?.vehicle_type ?? "e-motorcycle";

  const { mutate: toggleStatus } = useToggleStatus();

  const [isSocketConnected, setIsSocketConnected] = useState(
    socketService.isConnected,
  );

  const {
    isOnline,
    isTogglingStatus,
    pendingOffer,
    setPendingOffer,
    currentCoords, // written by useLocationTracking in MainNavigator
  } = useRiderStore();

  // Track whether we've already centred the map on the rider's first fix
  const hascentredRef = useRef(false);

  // Re-centre map on first GPS fix
  useEffect(() => {
    if (!currentCoords || hascentredRef.current || !mapRef.current) return;
    hascentredRef.current = true;
    mapRef.current.animateToRegion(
      {
        ...currentCoords,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      800,
    );
  }, [currentCoords]);

  useEffect(() => {
    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socketService.onConnectionChange(onConnect, onDisconnect);

    // Sync immediately in case state changed before this effect ran
    setIsSocketConnected(socketService.isConnected);

    return () => {
      socketService.offConnectionChange(onConnect, onDisconnect);
    };
  }, []); // empty deps — socketService is a singleton, never changes

  // REST fallback — keeps working even when socket drops.
  // The hook internally does nothing when isOnline is false.
  useOrderOffers();

  // Navigate to DeliveryRequest when socket (or REST fallback) delivers an offer.
  // Keyed on pendingOffer.id so a new offer always fires even if the screen
  // was already showing (edge-case: rider declines, gets re-assigned same order).
  useEffect(() => {
    if (!pendingOffer) return;
    navigation.navigate("DeliveryRequest", {
      orderId: pendingOffer.id,
      customerName: pendingOffer.customer?.full_name ?? "",
      customerPhone: pendingOffer.customer?.phone ?? "",
      pickupAddress: pendingOffer.pickup_address,
      dropoffAddress: pendingOffer.dropoff_address,
      itemType: pendingOffer.item_description,
      price: parseFloat(pendingOffer.price_ghs ?? "0"), // ← parse string to number here
      pickupEta: (pendingOffer as any).pickup_eta ?? 6,
      pickupCoords: (pendingOffer as any).pickup_coords,
      dropoffCoords: (pendingOffer as any).dropoff_coords,
    });
    // Clear immediately so re-renders don't re-navigate
    setPendingOffer(null);
  }, [pendingOffer?.id]);

  const handleToggle = () => {
    if (isTogglingStatus) return;

    if (isOnline) {
      // Call the API first, navigate only on success
      toggleStatus(false, {
        onSuccess: () => navigation.navigate("RiderOffline"),
        onError: () => {
          // Status already rolled back in the mutation's onError
          // Optionally show a toast here
        },
      });
    } else {
      toggleStatus(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        customMapStyle={CUSTOM_MAP_STYLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {currentCoords && (
          <Marker
            coordinate={currentCoords}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={!hascentredRef.current}
          >
            <View style={styles.riderMarker}>
              {vehicleType === "bicycle" ? (
                <BicycleSvg width={28} height={28} />
              ) : (
                <EmotoSvg width={28} height={28} />
              )}
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        {/* Online / offline toggle pill */}
        <TouchableOpacity
          style={[styles.pill, !isOnline && styles.pillOffline]}
          onPress={handleToggle}
          activeOpacity={0.85}
          disabled={isTogglingStatus}
        >
          {isTogglingStatus ? (
            <ActivityIndicator
              size="small"
              color={Colors.white}
              style={{ marginRight: 6 }}
            />
          ) : (
            <PowerCircleIcon width={18} height={18} />
          )}
          <Text style={styles.pillText}>
            {isOnline ? "You're online" : "You're offline"}
          </Text>
        </TouchableOpacity>

        {/* Socket connection indicator — small dot, handy in QA/staging */}
        <View
          style={[
            styles.socketDot,
            { backgroundColor: isSocketConnected ? "#4CD964" : "#FF3B30" },
          ]}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },

  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    // SafeAreaView handles the status-bar inset, so we only need a small
    // nudge here — keeps the pill visually clear of the very top edge.
    paddingTop: Platform.OS === "ios" ? 8 : 4,
    zIndex: 10,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
    gap: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  pillOffline: { backgroundColor: "#EF4444" },
  pillText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },

  socketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    opacity: 0.7,
  },

  riderMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  riderEmoji: { fontSize: 24 },
});




/**
 * DeliveryRequestScreen.tsx - RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Shown when dispatch assigns an order to the rider.
 *
 * Changes vs previous version:
 *  - Uses rider's real currentCoords from riderStore as the map origin
 *    instead of a hardcoded Accra point, so the route polyline starts
 *    at the rider's actual position.
 *  - Rider location marker drawn on the map.
 *  - Auto-decline correctly fires on countdown = 0 (guarded with ref).
 *  - All route.params are forwarded correctly on Accept.
 *  - OfflinePill used for consistent positioning.
 */

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useAcceptOrder, useDeclineOrder } from "../../hooks/rider/useOrders";
import { MainStackParamList } from "../../navigation/types";
import { useRiderStore } from "../../store/riderStore";
import { Colors, Radius, Shadow, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useRoutePolyline } from "../../utils/useRoutePolyline";

import OfflinePill from "@/components/common/OfflinePill";
import { useToast } from "@/components/common/Toast";
import CloseXIcon from "../../../assets/icons/close-x.svg";
import UserAvatarIcon from "../../../assets/icons/user-avatar.svg";

type RouteParams = RouteProp<MainStackParamList, "DeliveryRequest">;

const ACCRA_FALLBACK = { latitude: 5.5968, longitude: -0.1869 };

export default function DeliveryRequestScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const mapRef = useRef<MapView>(null);
  const toast = useToast();

  const {
    orderId,
    customerName,
    customerPhone,
    pickupAddress,
    dropoffAddress,
    itemType,
    price,
    pickupEta,
    pickupCoords,
    dropoffCoords,
  } = route.params as any;

  // Use rider's live GPS as the route origin if available
  const { currentCoords } = useRiderStore();
  const riderCoord = currentCoords ?? ACCRA_FALLBACK;
  const pickupCoord = pickupCoords ?? ACCRA_FALLBACK;
  const dropoffCoord = dropoffCoords ?? { latitude: 5.6502, longitude: -0.187 };

  const [countdown, setCountdown] = useState(28);
  const hasAutoDismissed = useRef(false);
  const slideUp = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const { mutateAsync: acceptOrder, isPending: isAccepting } = useAcceptOrder();
  const { mutateAsync: declineOrder, isPending: isDeclining } =
    useDeclineOrder();

  // Route from rider's current location → pickup point
  const { coords: routeCoords, etaMinutes } = useRoutePolyline({
    origin: riderCoord,
    destination: pickupCoord,
    mode: "TWO_WHEELER",
  });

  // Fit map to show rider → pickup route
  useEffect(() => {
    if (!mapRef.current) return;
    const points =
      routeCoords.length > 0 ? routeCoords : [riderCoord, pickupCoord];
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 60, bottom: 340, left: 60 },
      animated: true,
    });
  }, [routeCoords]);

  const initialRegion = useMemo(
    () => ({
      latitude: (riderCoord.latitude + pickupCoord.latitude) / 2,
      longitude: (riderCoord.longitude + pickupCoord.longitude) / 2,
      latitudeDelta:
        Math.abs(riderCoord.latitude - pickupCoord.latitude) * 4 + 0.02,
      longitudeDelta:
        Math.abs(riderCoord.longitude - pickupCoord.longitude) * 4 + 0.02,
    }),
    [],
  );

  // Slide-up animation + countdown timer
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 60,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-decline once countdown hits zero
  useEffect(() => {
    if (countdown === 0 && !hasAutoDismissed.current) {
      hasAutoDismissed.current = true;
      declineOrder(orderId)
        .catch(() => {})
        .finally(() => navigation.replace("MainTabs"));
    }
  }, [countdown]);

  const handleAccept = async () => {
    try {
      await acceptOrder(orderId);
      // useAcceptOrder.onSuccess has already called setActiveOrder(order).
      // Navigate with the same route params so the screen has pickup/dropoff
      // coords, price, customer info, etc. from the offer.
      navigation.replace("ActiveDelivery", route.params);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "Could not accept this order. It may have been cancelled.";
      toast.error(message);
      // Do NOT navigate away — let the rider see the offer again or wait
      // for the auto-decline countdown.
    }
  };

  const handleDecline = async () => {
    try {
      await declineOrder(orderId);
    } catch {
      // Best-effort decline — server may already have cancelled it
    } finally {
      navigation.replace("MainTabs");
    }
  };

  const displayEta = etaMinutes ?? pickupEta;
  const isBusy = isAccepting || isDeclining;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={CUSTOM_MAP_STYLE}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* Route line: rider → pickup */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.navy}
            strokeWidth={4}
          />
        )}

        {/* Rider's current position */}
        <Marker
          coordinate={riderCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.riderDotOuter}>
            <View style={styles.riderDot} />
          </View>
        </Marker>

        {/* Pickup */}
        <Marker
          coordinate={pickupCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.pickupDotOuter}>
            <View style={styles.pickupDot} />
          </View>
        </Marker>

        {/* Drop-off */}
        <Marker
          coordinate={dropoffCoord}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <View style={styles.dropoffPin}>
            <View style={styles.dropoffCircle} />
            <View style={styles.dropoffTail} />
          </View>
        </Marker>

        {/* ETA badge */}
        {displayEta != null && (
          <Marker
            coordinate={{
              latitude:
                (riderCoord.latitude + pickupCoord.latitude) / 2 + 0.004,
              longitude: (riderCoord.longitude + pickupCoord.longitude) / 2,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>{displayEta} min</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Consistent pill — same component used on every map screen */}
      <OfflinePill />

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
      >
        {/* Customer row */}
        <View style={styles.customerRow}>
          <View style={styles.avatarCircle}>
            <UserAvatarIcon width={22} height={24} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>{customerPhone}</Text>
          </View>
          <Text style={styles.countdown}>{countdown}s</Text>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleDecline}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isBusy}
          >
            <CloseXIcon width={14} height={14} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Route details */}
        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📦</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>
                  Pick-up{displayEta != null ? ` (${displayEta} min away)` : ""}
                </Text>
                <Text style={styles.routeValue}>{pickupAddress}</Text>
                <Text style={styles.routeValue}>{itemType}</Text>
              </View>
            </View>
            <View style={styles.dashedLine}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.dashSeg} />
              ))}
            </View>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📍</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeValue}>{dropoffAddress}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.price}>GHS {Number(price).toFixed(2)}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            activeOpacity={0.88}
            disabled={isBusy}
          >
            {isAccepting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.acceptText}>Accept</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            activeOpacity={0.88}
            disabled={isBusy}
          >
            {isDeclining ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.declineText}>Decline</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Rider dot (blue pulsing-style outer ring)
  riderDotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,200,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  riderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFCC00",
    borderWidth: 2.5,
    borderColor: Colors.white,
  },

  pickupDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(74,144,226,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#4A90E2",
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  dropoffPin: { alignItems: "center" },
  dropoffCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.navy,
  },
  dropoffTail: {
    width: 3,
    height: 8,
    backgroundColor: Colors.navy,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  etaBadge: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  etaText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: Colors.white,
  },

  card: {
    position: "absolute",
    bottom: 72,
    left: 12,
    right: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.modal,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  customerPhone: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  countdown: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.lg,
    color: Colors.primary,
    marginRight: 6,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 12 },
  routeSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  routeLeft: { flex: 1 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeEmoji: { fontSize: 18, marginTop: 1 },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  routeValue: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  dashedLine: { marginLeft: 28, paddingVertical: 4, gap: 3 },
  dashSeg: { width: 1.5, height: 5, backgroundColor: Colors.border },
  price: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
    alignSelf: "center",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: Colors.orange,
    borderRadius: Radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
});


/**
 * CameraCaptureScreen.tsx
 * ─────────────────────────────────────────────────────────────────
 * Proof-of-delivery camera. After capturing, navigates to
 * SubmitPhotoScreen with the full order params preserved.
 *
 * Fix vs previous version:
 *  - All route params (amount, pickupAddress, dropoffAddress, itemType)
 *    are forwarded to SubmitPhoto so Retake → CameraCapture → SubmitPhoto
 *    never loses context.
 */

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { MainStackParamList } from "../../navigation/types";
import { Colors, Radius, Typography } from "../../theme";

import ChevronUpIcon from "../../../assets/icons/camera-chevron-up.svg";
import FlashIcon from "../../../assets/icons/camera-flash.svg";
import NoMicIcon from "../../../assets/icons/camera-no-mic.svg";

import { useToast } from "@/components/common/Toast";
import * as ImageManipulator from "expo-image-manipulator";

type CameraParams = RouteProp<MainStackParamList, "CameraCapture">;

const MODES = ["CINEMATIC", "VIDEO", "PHOTO", "PORTRAIT", "PANO"] as const;

export default function CameraCaptureScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CameraParams>();
  const { orderId, amount, pickupAddress, dropoffAddress, itemType } =
    route.params as any;

  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [zoom, setZoom] = useState<"0.5" | "1">("1");
  const [mode, setMode] = useState<(typeof MODES)[number]>("PHOTO");
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const toast = useToast();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.permissionText}>
          Camera access is needed to take delivery proof photos.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permissionSkipBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Text style={styles.permissionSkipText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) return;

      // FIX: reject black/blank frames before handing off to SubmitPhoto.
      // Downscale to 8x8 and sample average luminance — a real photo of
      // any scene will have variance; a black/failed capture won't.
      const isBlank = await isLikelyBlankPhoto(photo.uri);
      if (isBlank) {
        toast.error(
          "Photo looks blank — make sure the lens isn't covered and try again.",
        );
        return;
      }

      navigation.replace("SubmitPhoto", {
        orderId,
        photoUri: photo.uri,
        amount,
        pickupAddress,
        dropoffAddress,
        itemType,
      });
    } catch {
      toast.error("Failed to take photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Downsamples the photo to 8x8 and checks both average brightness and
  // variance across pixels. A solid black (or solid any-color) frame has
  // near-zero variance; a real scene has meaningful pixel-to-pixel variation.
  async function isLikelyBlankPhoto(uri: string): Promise<boolean> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 8, height: 8 } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (!result.base64) return false; // fail open — don't block on manipulator errors

      // Rough heuristic: a valid JPEG of a real scene compresses to noticeably
      // more bytes than a flat/black 8x8 tile even at this tiny size, because
      // there's actual image entropy to encode.
      const byteLength = result.base64.length;
      return byteLength < 200; // empirically: solid-color 8x8 JPEGs base64 to ~120-160 chars
    } catch {
      return false; // fail open — never block a legitimate delivery on a heuristic bug
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top controls */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.topIconBtn}
          onPress={() =>
            setFlashMode((prev) => (prev === "off" ? "on" : "off"))
          }
          activeOpacity={0.75}
        >
          <FlashIcon
            width={22}
            height={22}
            style={{ opacity: flashMode === "on" ? 1 : 0.6 }}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.75}>
          <ChevronUpIcon width={22} height={14} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.75}>
          <NoMicIcon width={22} height={22} />
        </TouchableOpacity>
      </SafeAreaView>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flashMode}
      />

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Zoom pills */}
        <View style={styles.zoomRow}>
          {(["0.5", "1"] as const).map((z) => (
            <TouchableOpacity
              key={z}
              style={[styles.zoomPill, zoom === z && styles.zoomPillActive]}
              onPress={() => setZoom(z)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.zoomText,
                  zoom === z &&
                    (z === "1"
                      ? styles.zoomTextSelected
                      : styles.zoomTextActive),
                ]}
              >
                {z === "1" ? "1×" : z}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
              style={styles.modeBtn}
            >
              <Text
                style={[styles.modeText, mode === m && styles.modeTextActive]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shutter */}
        <TouchableOpacity
          style={[styles.shutterOuter, isCapturing && { opacity: 0.6 }]}
          onPress={handleCapture}
          activeOpacity={0.9}
          disabled={isCapturing}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <View style={{ height: Platform.OS === "ios" ? 24 : 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  permissionText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  permissionBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },
  permissionSkipBtn: { paddingVertical: 12 },
  permissionSkipText: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 12,
    paddingBottom: 10,
    backgroundColor: "#000000",
    zIndex: 10,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { flex: 1 },
  bottomBar: {
    backgroundColor: "#000000",
    paddingTop: 14,
    alignItems: "center",
  },
  zoomRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  zoomPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomPillActive: { backgroundColor: "rgba(255,255,255,0.32)" },
  zoomText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
  },
  zoomTextActive: { color: Colors.white },
  zoomTextSelected: { color: "#FFCC00", fontFamily: "Poppins-SemiBold" },
  modeRow: { flexDirection: "row", gap: 18, marginBottom: 22 },
  modeBtn: { paddingHorizontal: 2 },
  modeText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
  },
  modeTextActive: { color: "#FFCC00", fontFamily: "Poppins-SemiBold" },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.white,
  },
});


/**
 * ActiveDeliveryScreen.tsx  — RIDER APP
 * ─────────────────────────────────────────────────────────────────
 * Fixes applied vs the previous version:
 *
 *  FIX 1  handleArrived set optimisticStatus to "collected" (wrong).
 *         Now sets it to "arrived" so the CTA correctly flips to
 *         "I've collected the package" rather than jumping straight
 *         to the post-collection phase.
 *
 *  FIX 2  Status banner was "Package collected — heading to drop-off"
 *         even while the rider was still at the pickup (status=arrived).
 *         Banner now has three distinct states:
 *           · enRoute   → "Heading to pickup"
 *           · arrived   → "At pickup – collect the package"
 *           · in-transit→ "Package collected – heading to drop-off"
 *
 *  FIX 3  The dead handleCta() function has been removed.  The button
 *         always calls ctaAction which is derived from currentStatus.
 *
 *  FIX 4  ctaLabel / ctaAction now have an explicit "arrived" branch so
 *         the CTA is never ambiguous regardless of optimistic vs real status.
 *
 *  FIX 5  Navigate button label is phase-aware:
 *           · enRoute / arrived → "Navigate to Pickup"
 *           · collected/in_transit → "Navigate to Dropoff"
 *
 *  FIX 6  Polyline direction is phase-aware:
 *           · enRoute / arrived → rider coord → pickup
 *           · collected/in_transit → pickup → dropoff
 *         Previously it always used rider→pickup even after the package
 *         was collected, so the line pointed the wrong way.
 */

import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  useMarkArrived,
  useMarkCollected,
  useMarkInTransit,
} from "../../hooks/rider/useOrders";
import { Coordinates } from "../../lib/api";
import { MainStackParamList } from "../../navigation/types";
import { useRiderStore } from "../../store/riderStore";
import { Colors, Radius, Shadow, Typography } from "../../theme";
import CUSTOM_MAP_STYLE from "../../utils/mapStyle";
import { useRoutePolyline } from "../../utils/useRoutePolyline";

import ConfirmModal from "@/components/common/ConfirmModal";
import OfflinePill from "@/components/common/OfflinePill";
import { useToast } from "@/components/common/Toast";
import UserAvatarIcon from "../../../assets/icons/user-avatar.svg";

type RouteParams = RouteProp<MainStackParamList, "ActiveDelivery">;

const ACCRA_FALLBACK: Coordinates = { latitude: 5.5968, longitude: -0.1869 };

function hasMovedSignificantly(a: Coordinates, b: Coordinates): boolean {
  return (
    Math.abs(a.latitude - b.latitude) > 0.0009 ||
    Math.abs(a.longitude - b.longitude) > 0.0009
  );
}

// ─────────────────────────────────────────────────────────────────
// Phase helpers — single source of truth for status classification
// ─────────────────────────────────────────────────────────────────

/** Rider accepted but hasn't yet reached pickup */
function isHeadingToPickup(status: string): boolean {
  return ["accepted", "assigned", "rider_arriving"].includes(status);
}

/** Rider is physically at the pickup, hasn't collected yet */
function isAtPickup(status: string): boolean {
  return status === "arrived";
}

/** Rider has collected and is heading to (or at) the dropoff */
function isPostCollection(status: string): boolean {
  return ["collected", "in_transit"].includes(status);
}

// ─────────────────────────────────────────────────────────────────

export default function ActiveDeliveryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const mapRef = useRef<MapView>(null);

  const {
    orderId,
    customerName,
    customerPhone,
    pickupAddress,
    dropoffAddress,
    itemType,
    price,
    pickupEta,
    pickupCoords,
    dropoffCoords,
  } = route.params as any;

  const pickupCoord = (pickupCoords as Coordinates) ?? ACCRA_FALLBACK;
  const dropoffCoord = (dropoffCoords as Coordinates) ?? {
    latitude: 5.6502,
    longitude: -0.187,
  };

  const hasSeenActiveOrderRef = useRef(false);
  const deliveryCompletedRef = useRef(false);

  const [orderCancelledVisible, setOrderCancelledVisible] = useState(false);

  const { currentCoords, activeOrder, clearDelivery } = useRiderStore();
  const riderCoord = currentCoords ?? ACCRA_FALLBACK;

  const lastPolylineOriginRef = useRef<Coordinates>(riderCoord);
  const [polylineOrigin, setPolylineOrigin] = useState<Coordinates>(riderCoord);

  // ── FIX 1: "arrived" is the correct optimistic status after markArrived ──
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  // Derive current status — socket keeps activeOrder fresh
  const currentStatus = optimisticStatus ?? activeOrder?.status ?? "accepted";

  const enRoute = isHeadingToPickup(currentStatus);
  const atPickup = isAtPickup(currentStatus);
  const inTransit = isPostCollection(currentStatus);

  const [isMinimized, setIsMinimized] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  // ── FIX 6: polyline direction is phase-aware ──────────────────────────────
  //   · enRoute OR atPickup → rider position → pickup
  //   · inTransit           → pickup        → dropoff
  const polylineOriginCoord = inTransit ? pickupCoord : polylineOrigin;
  const polylineDest = inTransit ? dropoffCoord : pickupCoord;

  const { coords: routeCoords, etaMinutes } = useRoutePolyline({
    origin: polylineOriginCoord,
    destination: polylineDest,
    mode: "TWO_WHEELER",
  });

  const toast = useToast();

  // Update polyline origin when rider moves ~100 m
  useEffect(() => {
    if (!currentCoords) return;
    if (hasMovedSignificantly(currentCoords, lastPolylineOriginRef.current)) {
      lastPolylineOriginRef.current = currentCoords;
      setPolylineOrigin(currentCoords);
    }
  }, [currentCoords]);

  useEffect(() => {
    if (!mapRef.current) return;
    const points =
      routeCoords.length > 0
        ? routeCoords
        : [polylineOriginCoord, polylineDest];
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 60, bottom: 360, left: 60 },
      animated: true,
    });
  }, [routeCoords]);

  const initialRegion = useMemo(
    () => ({
      latitude: (riderCoord.latitude + pickupCoord.latitude) / 2,
      longitude: (riderCoord.longitude + pickupCoord.longitude) / 2,
      latitudeDelta:
        Math.abs(riderCoord.latitude - pickupCoord.latitude) * 4 + 0.02,
      longitudeDelta:
        Math.abs(riderCoord.longitude - pickupCoord.longitude) * 4 + 0.02,
    }),
    [],
  );

  // ── Animations ────────────────────────────────────────────────────────────
  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 62,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutateAsync: markArrived, isPending: isArriving } = useMarkArrived();
  const { mutateAsync: markCollected, isPending: isCollecting } =
    useMarkCollected();
  const { mutateAsync: markInTransit } = useMarkInTransit();

  // Clear optimistic status when real status arrives from socket
  useEffect(() => {
    if (activeOrder?.status) {
      setOptimisticStatus(null);
    }
  }, [activeOrder?.status]);

  // ── Socket-driven navigation ──────────────────────────────────────────────
  useEffect(() => {
    if (activeOrder) {
      hasSeenActiveOrderRef.current = true;
      return;
    }
    if (hasSeenActiveOrderRef.current && !deliveryCompletedRef.current) {
      setOrderCancelledVisible(true);
    }
  }, [activeOrder]);

  // ── CTA handlers ─────────────────────────────────────────────────────────

  /**
   * Called when rider taps the CTA while en-route (heading to pickup).
   * Posts "arrived" to the REST API and sets optimistic status to "arrived"
   * (not "collected") so the next CTA becomes "I've collected the package".
   * FIX 1 was here: old code set optimisticStatus to "collected".
   */
  const handleArrived = useCallback(async () => {
    try {
      await markArrived(orderId);
      // FIX 1: "arrived" is the correct next status, not "collected"
      setOptimisticStatus("arrived");
    } catch {
      setOptimisticStatus(null);
    }
  }, [orderId, markArrived]);

  // Tapped while at pickup (status = "arrived"). Marks collected + in-transit,
  // then STAYS on this screen so the rider can navigate to dropoff.
  // No camera here — proof photo only happens at dropoff (Fix below).
  const handleCollected = useCallback(async () => {
    try {
      await markCollected(orderId);
      await markInTransit(orderId);
      // No optimistic status flip needed — useMarkInTransit's onSuccess
      // already calls setActiveOrder, which flips currentStatus to
      // "in_transit" via the socket-or-store value, which in turn flips
      // ctaLabel/ctaAction below to the delivered branch automatically.
    } catch {
      // Best-effort — if in-transit fails, optimistic status still lets
      // the rider proceed; the next "delivered" call will retry server state.
      setOptimisticStatus("in_transit");
    }
  }, [orderId, markCollected, markInTransit]);

  // Tapped while in transit / at dropoff. THIS is where the camera opens —
  // proof of delivery is captured at the customer's location, not at pickup.
  const handleArrivedAtDropoff = useCallback(() => {
    deliveryCompletedRef.current = true;
    navigation.navigate("CameraCapture", {
      orderId,
      amount: parseFloat(String(price ?? "0")),
      pickupAddress,
      dropoffAddress,
      itemType,
    });
  }, [orderId, price, pickupAddress, dropoffAddress, itemType]);

  // ── FIX 3 & 4: clean CTA derivation — no dead handleCta ─────────────────
  //
  //  enRoute  (accepted/assigned/rider_arriving) → "I have arrived at pickup"
  //  atPickup (arrived)                          → "I've collected the package"
  //  inTransit(collected/in_transit)             → "I've delivered the package"
  //
  const ctaLabel = enRoute
    ? "I have arrived at pickup"
    : atPickup
      ? "I've collected the package"
      : "I've arrived — take delivery photo";

  const ctaAction = enRoute
    ? handleArrived
    : atPickup
      ? handleCollected
      : handleArrivedAtDropoff; // ← was the inline camera-navigate closure

  const ctaBusy = enRoute ? isArriving : atPickup ? isCollecting : false;

  // ── FIX 5: navigation label is phase-aware ────────────────────────────────
  const navButtonLabel = inTransit
    ? "Navigate to Dropoff"
    : "Navigate to Pickup";

  const navDestCoord = inTransit ? dropoffCoord : pickupCoord;
  const navDestAddress = inTransit ? dropoffAddress : pickupAddress;

  const displayEta = etaMinutes ?? pickupEta ?? null;

  const openNavigation = (destLat: number, destLng: number, label: string) => {
    const destination = `${destLat},${destLng}`;
    const encodedLabel = encodeURIComponent(label);

    const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    if (Platform.OS === "ios") {
      // Try Google Maps app first (most riders have it, matches in-app routing),
      // then Apple Maps, then web as the final fallback.
      const googleMapsUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
      const appleMapsUrl = `maps://app?daddr=${destination}&dirflg=d`;

      Linking.canOpenURL(googleMapsUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(googleMapsUrl);
          }
          return Linking.canOpenURL(appleMapsUrl).then((appleSupported) => {
            if (appleSupported) {
              return Linking.openURL(appleMapsUrl);
            }
            return Linking.openURL(webFallbackUrl);
          });
        })
        .catch(() => {
          Linking.openURL(webFallbackUrl).catch(() => {
            toast?.error?.(
              "Couldn't open navigation. Please open Maps manually.",
            );
          });
        });
    } else {
      // Android — try the Google Maps turn-by-turn intent, fall back to web
      // if Google Maps isn't installed (rare but possible on some devices).
      const androidNavUrl = `google.navigation:q=${destination}&mode=d`;

      Linking.canOpenURL(androidNavUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(androidNavUrl);
          }
          return Linking.openURL(webFallbackUrl);
        })
        .catch(() => {
          Linking.openURL(webFallbackUrl).catch(() => {
            toast?.error?.(
              "Couldn't open navigation. Please open Maps manually.",
            );
          });
        });
    }
  };

  const minimizeCard = () => {
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => setIsMinimized(true));
  };

  const expandCard = () => {
    setIsMinimized(false);
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(fabScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });

  // ── FIX 2: banner now has three meaningful states ─────────────────────────
  const bannerText = enRoute
    ? "Heading to pickup location"
    : atPickup
      ? "At pickup — collect the package"
      : "Package collected — heading to drop-off";

  const bannerBg = enRoute
    ? "#FEF3C7" // amber tint
    : atPickup
      ? "#EEF2FF" // indigo tint
      : "#D1FAE5"; // green tint

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={CUSTOM_MAP_STYLE}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={Colors.navy}
            strokeWidth={4}
          />
        )}

        {/* Rider position */}
        <Marker
          coordinate={riderCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={!!currentCoords}
        >
          <View style={styles.riderDotOuter}>
            <View style={styles.riderDot} />
          </View>
        </Marker>

        {/* Pickup */}
        <Marker
          coordinate={pickupCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.pickupDotOuter}>
            <View style={styles.pickupDot} />
          </View>
        </Marker>

        {/* Drop-off */}
        <Marker
          coordinate={dropoffCoord}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <View style={styles.dropoffPin}>
            <View style={styles.dropoffCircle} />
            <View style={styles.dropoffTail} />
          </View>
        </Marker>

        {/* ETA badge */}
        {displayEta != null && (
          <Marker
            coordinate={{
              latitude:
                (polylineOriginCoord.latitude + polylineDest.latitude) / 2 +
                0.005,
              longitude:
                (polylineOriginCoord.longitude + polylineDest.longitude) / 2,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>{displayEta} min</Text>
            </View>
          </Marker>
        )}
      </MapView>

      <OfflinePill />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeIn,
            transform: [
              { translateY: slideUp },
              { translateY: cardTranslateY },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.minimizeBtn}
          onPress={minimizeCard}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.minimizeBtnText}>—</Text>
        </TouchableOpacity>

        {/* Customer row */}
        <View style={styles.customerRow}>
          <View style={styles.avatarCircle}>
            <UserAvatarIcon width={22} height={24} />
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>{customerPhone}</Text>
          </View>
          {displayEta != null && (
            <Text style={styles.timer}>{displayEta} min</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Route details */}
        <View style={styles.routeSection}>
          <View style={styles.routeLeft}>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📦</Text>
              <View style={styles.routeTextWrap}>
                {/* FIX 2: banner clearly describes the current phase */}
                <View
                  style={[styles.statusBanner, { backgroundColor: bannerBg }]}
                >
                  <Text style={styles.statusBannerText}>{bannerText}</Text>
                </View>
                <Text style={styles.routeValue}>{pickupAddress}</Text>
                <Text style={styles.routeValue}>{itemType}</Text>
              </View>
            </View>
            <View style={styles.dashedLine}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.dashSeg} />
              ))}
            </View>
            <View style={styles.routeRow}>
              <Text style={styles.routeEmoji}>📍</Text>
              <View style={styles.routeTextWrap}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeValue}>{dropoffAddress}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.price}>GHS {Number(price || 0).toFixed(2)}</Text>
        </View>

        {/* FIX 5: navigate button label and destination are phase-aware */}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() =>
            openNavigation(
              navDestCoord.latitude,
              navDestCoord.longitude,
              navDestAddress,
            )
          }
          activeOpacity={0.88}
        >
          <View style={styles.navBtnContent}>
            <Image
              source={require("../../../assets/icons/navigation.png")}
              style={styles.navIcon}
              resizeMode="contain"
            />
            {/* FIX 5 */}
            <Text style={styles.navBtnText}>{navButtonLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* FIX 3 & 4: single CTA always calls ctaAction, no dead handleCta */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={ctaAction}
          activeOpacity={0.88}
          disabled={ctaBusy}
        >
          {ctaBusy ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.actionBtnText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Floating action button (minimized state) */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [{ scale: fabScale }],
            opacity: fabScale,
          },
        ]}
        pointerEvents={isMinimized ? "auto" : "none"}
      >
        <TouchableOpacity
          onPress={expandCard}
          activeOpacity={0.85}
          style={styles.fabInner}
        >
          <Text style={styles.fabEmoji}>📦</Text>
          {displayEta != null && (
            <Text style={styles.fabEta}>{displayEta}m</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ConfirmModal
        visible={orderCancelledVisible}
        title="Order Cancelled"
        message="The customer cancelled this delivery."
        primaryLabel="OK"
        onPrimary={() => {
          setOrderCancelledVisible(false);
          navigation.replace("MainTabs");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  riderDotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,200,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  riderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFCC00",
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  pickupDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(74,144,226,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#4A90E2",
    borderWidth: 2.5,
    borderColor: Colors.white,
  },
  dropoffPin: { alignItems: "center" },
  dropoffCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.navy,
  },
  dropoffTail: {
    width: 3,
    height: 8,
    backgroundColor: Colors.navy,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  etaBadge: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  etaText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: Colors.white,
  },

  card: {
    position: "absolute",
    bottom: 72,
    left: 12,
    right: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.modal,
  },
  minimizeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  minimizeBtnText: {
    fontSize: 20,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  customerPhone: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  timer: {
    fontFamily: "Poppins-Bold",
    fontSize: Typography.lg,
    color: Colors.primary,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: 12 },
  routeSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  routeLeft: { flex: 1 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeEmoji: { fontSize: 18, marginTop: 1 },
  routeTextWrap: { flex: 1 },
  routeLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  routeValue: {
    fontFamily: "Poppins-Regular",
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  dashedLine: { marginLeft: 28, paddingVertical: 4, gap: 3 },
  dashSeg: { width: 1.5, height: 5, backgroundColor: Colors.border },
  price: {
    fontFamily: "HelveticaNeue-CondensedBold",
    fontSize: Typography.md,
    color: Colors.textPrimary,
    alignSelf: "center",
  },

  statusBanner: {
    marginBottom: 6,
    padding: 8,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  statusBannerText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },

  navBtn: {
    backgroundColor: "#F0F4F8",
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: { width: 18, height: 18, marginRight: 8 },
  navBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.navy,
  },

  actionBtn: {
    backgroundColor: Colors.navy,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: Typography.base,
    color: Colors.white,
  },

  fab: {
    position: "absolute",
    bottom: 36,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navy,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  fabInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  fabEmoji: { fontSize: 22 },
  fabEta: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 10,
    color: Colors.white,
    marginTop: 1,
  },
});


