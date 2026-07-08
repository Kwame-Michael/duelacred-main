import { createClient, type PostgrestFilterBuilder } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "private-docs";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const STORAGE_BUCKET = SUPABASE_STORAGE_BUCKET;
export { SUPABASE_URL, SUPABASE_ANON_KEY };

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime?: string;
}

interface SupabaseRow<T = Record<string, unknown>> {
  id: string;
  fields: T;
  created_at: string;
}

const TABLE_NAME_MAP: Record<string, string> = {
  Users: "users",
  SME_Applications: "sme_applications",
  Listings: "listings",
  Investments: "investments",
  Repayments: "repayments",
  Repayment_Proofs: "repayment_proofs",
  Investor_Onboarding: "investor_onboarding",
};

const normalizeTableName = (table: string) => TABLE_NAME_MAP[table] || table.toLowerCase();

const applyJsonFilters = <T>(query: PostgrestFilterBuilder<SupabaseRow<T>>, filter: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(`fields->>${key}`, String(value));
  }
  return query;
};

const normalizeFilter = (filter?: Record<string, unknown> | string): Record<string, unknown> | undefined => {
  if (!filter) return undefined;
  if (typeof filter === "string") {
    const match = filter.match(/^\s*\{(.+?)\}\s*=\s*'([^']*)'\s*$/);
    if (match) {
      return { [match[1]]: match[2] };
    }
    return undefined;
  }
  return filter;
};

export async function fetchRecords<T = Record<string, unknown>>(
  table: string,
  filter?: Record<string, unknown> | string
): Promise<AirtableRecord<T>[]> {
  const tableName = normalizeTableName(table);
  let query = supabase.from<SupabaseRow<T>>(tableName).select("id, fields, created_at");
  const normalizedFilter = normalizeFilter(filter);
  if (normalizedFilter) {
    query = applyJsonFilters(query, normalizedFilter);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data || []).map((row) => ({ id: row.id, fields: row.fields as T, createdTime: row.created_at }));
}

export async function fetchRecord<T = Record<string, unknown>>(
  table: string,
  recordId: string
): Promise<AirtableRecord<T>> {
  const tableName = normalizeTableName(table);
  const { data, error } = await supabase
    .from<SupabaseRow<T>>(tableName)
    .select("id, fields, created_at")
    .eq("id", recordId)
    .single();
  if (error) {
    throw error;
  }
  return { id: data.id, fields: data.fields as T, createdTime: data.created_at };
}

async function getCurrentAuthId(): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id) {
    return null;
  }
  return user.id;
}

export async function createRecord<T = Record<string, unknown>>(
  table: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const tableName = normalizeTableName(table);
  const authId = await getCurrentAuthId();
  const payload: Record<string, unknown> = { fields };
  if (authId) {
    payload.auth_id = authId;
  }

  const { data, error } = await supabase
    .from<SupabaseRow<T>>(tableName)
    .insert([payload])
    .select("id, fields, created_at")
    .single();
  if (error) {
    throw error;
  }
  return { id: data.id, fields: data.fields as T, createdTime: data.created_at };
}

export async function updateRecord<T = Record<string, unknown>>(
  table: string,
  recordId: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const tableName = normalizeTableName(table);
  const existing = await fetchRecord<T>(table, recordId);
  const merged = { ...existing.fields, ...fields };
  const authId = await getCurrentAuthId();
  const payload: Record<string, unknown> = { fields: merged };
  if (authId) {
    payload.auth_id = authId;
  }

  const { data, error } = await supabase
    .from<SupabaseRow<T>>(tableName)
    .update(payload)
    .eq("id", recordId)
    .select("id, fields, created_at")
    .single();
  if (error) {
    throw error;
  }
  return { id: data.id, fields: data.fields as T, createdTime: data.created_at };
}

export async function deleteRecord(table: string, recordId: string): Promise<void> {
  const tableName = normalizeTableName(table);
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq("id", recordId);
  if (error) {
    throw error;
  }
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { cacheControl?: number; upsert?: boolean }
) {
  const primaryBucket = bucket || STORAGE_BUCKET;

  const fileArrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(fileArrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const fileBase64 = btoa(binary);
  const contentType = file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream";

  const response = await fetch(`${SUPABASE_URL}/functions/v1/uploadFile`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ bucket: primaryBucket, path, fileBase64, contentType, upsert: options?.upsert ?? true }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getSignedStorageUrl(bucket: string, path: string, expires = 60) {
  const url = `${SUPABASE_URL}/functions/v1/getSignedUrl`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ bucket, path, expires }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Signed URL request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.signedUrl || data.url || data?.data?.signedUrl || data?.data?.url;
}

export function getPublicFileUrl(bucket: string, path: string) {
  const { data, error } = supabase.storage.from(bucket).getPublicUrl(path);
  if (error) {
    throw error;
  }
  return data.publicUrl;
}

export async function backfillAuthOwnershipForCurrentUser(email: string, tables = ["Users", "SME_Applications", "Investor_Onboarding", "Repayments", "Repayment_Proofs"]) {
  const authId = await getCurrentAuthId();
  if (!authId || !email) {
    return;
  }

  const normalizedEmail = email.toLowerCase();
  for (const table of tables) {
    const tableName = normalizeTableName(table);
    const fieldName = table === "Users" ? "Email" : table === "SME_Applications" ? "Submitted By Email" : table === "Investor_Onboarding" ? "Email" : "Email";
    const { data, error } = await supabase.from(tableName).select("id").eq(`fields->>${fieldName}`, normalizedEmail);
    if (error) {
      continue;
    }
    for (const row of data || []) {
      await supabase.from(tableName).update({ auth_id: authId }).eq("id", row.id);
    }
  }
}

export async function autoInvest(listingId: string, perInvestorAmount = 10) {
  // Simple auto-invest scaffold: finds investors with wallet balance and allocates until funding goal reached.
  const listing = await fetchRecord<any>("Listings", listingId);
  const fundingGoal = Number(listing.fields["Funding Goal"] || 0);
  if (!fundingGoal || fundingGoal <= 0) throw new Error("Invalid funding goal");

  const investments = await fetchRecords<any>("Investments");
  const currentRaised = investments.filter((inv) => inv.fields["Listing ID"] === listingId).reduce((s, i) => s + (i.fields["Amount Invested"] || 0), 0);
  let remaining = Math.max(0, fundingGoal - currentRaised);

  const investors = await fetchRecords<any>("Users", { Role: "Investor" });
  for (const inv of investors) {
    if (remaining <= 0) break;
    const walletBal = Number(inv.fields["Wallet Balance"] || 0);
    if (walletBal <= 0) continue;
    const amt = Math.min(perInvestorAmount, walletBal, remaining);
    if (amt <= 0) continue;
    // create investment
    await createRecord("Investments", {
      "Investor Email": (inv.fields.Email as string) || "",
      "Listing ID": listingId,
      "Business Name": listing.fields["Business Name"],
      "Amount Invested": amt,
      "Expected Return": amt * (listing.fields["Return Multiple"] || 1),
      Date: new Date().toISOString().split("T")[0],
    });
    // deduct from wallet
    const newWallet = Math.max(0, walletBal - amt);
    await updateRecord("Users", inv.id, { "Wallet Balance": newWallet });
    // update listing amount raised
    const current = Number(listing.fields["Amount Raised"] || 0) + amt;
    listing.fields["Amount Raised"] = current;
    await updateRecord("Listings", listingId, { "Amount Raised": current });
    remaining = Math.max(0, fundingGoal - current);
  }
  return { listingId, remaining };
};

/**
 * Send OTP email via Resend Edge Function
 * Used as fallback/supplement to Supabase Auth email sending
 */
export const sendOtpEmail = async (email: string, otp: string): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sendOtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Failed to send OTP email:", data);
      return { success: false, error: data.error || "Failed to send email" };
    }
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};
