/**
 * useKyc.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query mutation for KYC document submission.
 *
 *  useSubmitKyc  → POST /rider/kyc  (multipart/form-data)
 *
 * API expects:
 *  {
 *    ghana_card_no:          string   (required)
 *    license_no:             string   (optional)
 *    vehicle_type_preference: string  (required) e.g. "motorcycle"
 *    momo_number:            string   (required)
 *    momo_provider:          string   (required) e.g. "mtn"
 *    ghana_card_image:       file     (required)
 *    profile_photo:          file     (required)
 *  }
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kycApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { AUTH_QUERY_KEYS } from "./useAuth";

// ── Payload shape ─────────────────────────────────────────────────────────────
export interface KycPayload {
  ghana_card_no: string;
  license_no?: string;
  vehicle_type_preference: string;
  momo_number: string;
  momo_provider: string;
  /** local file URI for the Ghana Card image */
  ghanaCardUri: string;
  /** local file URI for the profile photo */
  profilePhotoUri: string;
}

/**
 * Converts the KYC payload into a FormData object ready for multipart upload.
 */
export function buildKycFormData(payload: KycPayload): FormData {
  const form = new FormData();

  // ── Text fields ─────────────────────────────────────────────────
  form.append("ghana_card_no", payload.ghana_card_no);
  form.append("vehicle_type_preference", payload.vehicle_type_preference);
  form.append("momo_number", payload.momo_number);
  form.append("momo_provider", payload.momo_provider);

  if (payload.license_no) {
    form.append("license_no", payload.license_no);
  }

  // ── File fields — React Native FormData accepts { uri, name, type } ──
  form.append("ghana_card_image", {
    uri: payload.ghanaCardUri,
    name: "ghana_card.jpg",
    type: "image/jpeg",
  } as any);

  form.append("profile_photo", {
    uri: payload.profilePhotoUri,
    name: "profile_photo.jpg",
    type: "image/jpeg",
  } as any);

  return form;
}

// ── Mutation hook ─────────────────────────────────────────────────────────────
export function useSubmitKyc() {
  const queryClient = useQueryClient();
  const { updateRider } = useAuthStore();

  return useMutation({
    mutationFn: (form: FormData) => kycApi.submitKyc(form),

    onSuccess: (response) => {
      // Backend may return updated rider profile after KYC submission
      const rider = response.data?.data?.rider;
      if (rider) {
        updateRider(rider);
        queryClient.setQueryData(AUTH_QUERY_KEYS.me, rider);
      }
    },
  });
}


