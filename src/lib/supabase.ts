import { createClient, type PostgrestFilterBuilder } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "uploads";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const STORAGE_BUCKET = SUPABASE_STORAGE_BUCKET;

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
  let query = supabase.from<SupabaseRow<T>>(table).select("id, fields, created_at");
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
  const { data, error } = await supabase
    .from<SupabaseRow<T>>(table)
    .select("id, fields, created_at")
    .eq("id", recordId)
    .single();
  if (error) {
    throw error;
  }
  return { id: data.id, fields: data.fields as T, createdTime: data.created_at };
}

export async function createRecord<T = Record<string, unknown>>(
  table: string,
  fields: Partial<T>
): Promise<AirtableRecord<T>> {
  const { data, error } = await supabase
    .from<SupabaseRow<T>>(table)
    .insert([{ fields }])
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
  const existing = await fetchRecord<T>(table, recordId);
  const merged = { ...existing.fields, ...fields };
  const { data, error } = await supabase
    .from<SupabaseRow<T>>(table)
    .update({ fields: merged })
    .eq("id", recordId)
    .select("id, fields, created_at")
    .single();
  if (error) {
    throw error;
  }
  return { id: data.id, fields: data.fields as T, createdTime: data.created_at };
}

export async function deleteRecord(table: string, recordId: string): Promise<void> {
  const { error } = await supabase
    .from(table)
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
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, options);
  if (error) {
    throw error;
  }
  return data;
}

export function getPublicFileUrl(bucket: string, path: string) {
  const { data, error } = supabase.storage.from(bucket).getPublicUrl(path);
  if (error) {
    throw error;
  }
  return data.publicUrl;
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
}
