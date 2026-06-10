/**
 * useKyc.ts
 * ─────────────────────────────────────────────────────────────────
 * TanStack Query mutation for KYC document submission.
 *
 *  useSubmitKyc  → POST /rider/kyc  (multipart/form-data)
 *
 * Usage in CreateProfileStep3 (document upload screen):
 *
 *   const { mutateAsync: submitKyc, isPending } = useSubmitKyc();
 *
 *   const handleSubmit = async () => {
 *     const form = buildKycFormData({ ... });
 *     await submitKyc(form);
 *     navigation.navigate('BiometricSetup');
 *   };
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kycApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { AUTH_QUERY_KEYS } from "./useAuth";

// ── Payload builder ───────────────────────────────────────────────────────────
export interface KycPayload {
  name: string;
  email?: string;
  language?: string;
  id_type: string;
  id_number: string;
  vehicle_type: string;
  /** local file URI for the ID document image */
  ghanaCardUri: string;
  /** local file URI for the profile photo */
  profilePhotoUri: string;
  /** optional MoMo payout account */
  account_type?: string;
  account_number?: string;
  account_name?: string;
}

/**
 * Converts the KYC payload into a FormData object ready for multipart upload.
 */
export function buildKycFormData(payload: KycPayload): FormData {
  const form = new FormData();

  form.append("name", payload.name);
  form.append("id_type", payload.id_type);
  form.append("id_number", payload.id_number);
  form.append("vehicle_type", payload.vehicle_type);

  if (payload.email) form.append("email", payload.email);
  if (payload.language) form.append("language", payload.language);

  if (payload.account_type) form.append("account_type", payload.account_type);
  if (payload.account_number)
    form.append("account_number", payload.account_number);
  if (payload.account_name) form.append("account_name", payload.account_name);

  // Append files — React Native FormData accepts the { uri, name, type } shape
  form.append("id_document", {
    uri: payload.ghanaCardUri,
    name: "id_document.jpg",
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
