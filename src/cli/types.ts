/**
 * Command Definition Types
 *
 * TypeScript types matching the JSON schema in src/data/output/schema.json
 * These types are the foundation for the data-driven CLI architecture.
 */

export type CommandCategory =
  | "gpu_management"
  | "diagnostics"
  | "system_info"
  | "cluster_management"
  | "networking"
  | "containers"
  | "firmware"
  | "storage"
  | "mpi"
  | "gpu_fabric"
  | "cuda_tools"
  | "nccl_tests"
  | "monitoring"
  | "general"
  | "rdma_perf"
  | "parallel_shell"
  | "modules";

export type StateDomain =
  | "gpu_state"
  | "gpu_process_state"
  | "job_state"
  | "node_state"
  | "partition_state"
  | "network_ib_state"
  | "network_eth_state"
  | "storage_lustre_state"
  | "storage_local_state"
  | "system_state"
  | "container_state"
  | "firmware_state"
  | "fabric_state";

export interface CommandOption {
  flag?: string;
  short?: string;
  long?: string;
  description: string;
  arguments?: string;
  argument_type?: string;
  default?: string;
  required?: boolean;
  example?: string;
}

export interface Subcommand {
  name: string;
  description: string;
  synopsis?: string;
  options?: CommandOption[];
}

export interface ExitCode {
  code: number;
  meaning: string;
}

export interface UsagePattern {
  description: string;
  command: string;
  output_example?: string;
  requires_root?: boolean;
}

export interface ErrorMessage {
  message: string;
  meaning: string;
  resolution?: string;
}

export interface EnvironmentVariable {
  name: string;
  description: string;
  example?: string;
  affects_command?: string;
}

export interface StateRead {
  state_domain: StateDomain;
  fields?: string[];
  description?: string;
}

export interface StateWrite {
  state_domain: StateDomain;
  fields?: string[];
  description?: string;
  requires_flags?: string[];
  requires_privilege?: string;
}

export interface StateInteraction {
  reads_from?: StateRead[];
  writes_to?: StateWrite[];
  triggered_by?: Array<{ state_change: string; effect: string }>;
  consistent_with?: Array<{ command: string; shared_state: string }>;
}

export interface Interoperability {
  related_commands?: string[];
  uses_library?: string[];
  notes?: string;
}

export interface Permissions {
  read_operations?: string;
  write_operations?: string;
  notes?: string;
}

export interface Installation {
  package?: string;
  notes?: string;
}

export interface CommandDefinition {
  command: string;
  category: CommandCategory;
  description: string;
  synopsis: string;
  version_documented?: string;
  source_urls?: string[];
  installation?: Installation;
  global_options?: CommandOption[];
  subcommands?: Subcommand[];
  output_formats?: Record<string, string>;
  environment_variables?: EnvironmentVariable[];
  exit_codes?: ExitCode[];
  common_usage_patterns?: UsagePattern[];
  error_messages?: ErrorMessage[];
  interoperability?: Interoperability;
  permissions?: Permissions;
  limitations?: string[];
  state_interactions?: StateInteraction;
}
