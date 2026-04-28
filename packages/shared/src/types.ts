/**
 * MOLDURIZE WEB — Shared Types
 * TypeScript types shared between frontend and (via OpenAPI) backend.
 */

// ═══════════════════════════════════════════════════════════════════════════
// NESTING
// ═══════════════════════════════════════════════════════════════════════════

export interface PartInput {
  width: number;
  height: number;
  quantity?: number;
  label?: string;
}

export interface BlockConfig {
  width: number;
  height: number;
  kerf?: number;
}

export interface PlacedPart {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  block_index: number;
  label?: string;
}

export interface NestingRequest {
  parts: PartInput[];
  block?: BlockConfig;
  name?: string;
}

export interface NestingResponse {
  id: string;
  success: boolean;
  total_blocks: number;
  waste_percent: number;
  largest_remnant_w: number;
  largest_remnant_h: number;
  pieces_per_block: number;
  placed_parts: PlacedPart[];
  block_width: number;
  block_height: number;
  total_pieces: number;
  nesting_id?: string;
}

export interface NestingSummary {
  id: string;
  name: string | null;
  status: NestingStatus;
  total_blocks: number | null;
  waste_percent: number | null;
  created_at: string;
  completed_at: string | null;
}

export type NestingStatus = "pending" | "processing" | "completed" | "failed";

// ═══════════════════════════════════════════════════════════════════════════
// G-CODE
// ═══════════════════════════════════════════════════════════════════════════

export type MachineProfile = "mach3" | "planet_cnc" | "planetcnc" | "grbl";

export interface GCodePiece {
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  block_index?: number;
  label?: string | null;
}

export interface GCodeConfig {
  feed_rate?: number;
  rapid_rate?: number;
  plunge_rate?: number;
  safe_z?: number;
  clearance?: number;
  origin_x?: number;
  origin_y?: number;
  cut_depth?: number;
  wire_temp?: number;
  lead_in_length?: number;
  block_gap?: number;
  output_style?: "devfoam" | "compact" | "annotated";
  precision?: number;
  corner_radius?: number;
  corner_segments?: number;
}

export interface GCodeRequest {
  pieces: GCodePiece[];
  block_width?: number;
  block_height?: number;
  config?: GCodeConfig;
  machine_profile?: MachineProfile;
  strategy?:
    | "devfoam_auto"
    | "auto"
    | "devfoam_banded"
    | "banded_grid"
    | "banded_serpentine"
    | "devfoam_shared"
    | "shared_grid"
    | "shared_serpentine"
    | "serpentine"
    | "contour";
  safe_z?: number;
  cut_depth?: number;
  feed_rate?: number;
}

export interface GCodeResponse {
  gcode: string;
  line_count: number;
  estimated_time_min: number;
  profile: MachineProfile;
}

// ═══════════════════════════════════════════════════════════════════════════
// REMNANTS
// ═══════════════════════════════════════════════════════════════════════════

export type RemnantStatus = "disponivel" | "descartado";

export interface Remnant {
  id: string;
  width: number;
  height: number;
  depth: number;
  status: RemnantStatus;
  nesting_id: string | null;
  created_at: string;
}

export interface RemnantCreate {
  width: number;
  height: number;
  depth?: number;
  nesting_id?: string | null;
}

export interface RemnantUpdate {
  status?: RemnantStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════════════════

export type PlanTier = "free" | "starter" | "pro" | "enterprise";

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  period: string;
  nestings_limit: number;
  blocks_limit: number;
  features: string[];
  popular?: boolean;
}

export interface PlansResponse {
  currency: string;
  plans: Plan[];
}

export interface CheckoutRequest {
  plan: "starter" | "pro" | "enterprise";
  clerk_id?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiError {
  detail: string | ApiValidationError[];
  status?: number;
}

export interface ApiValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
