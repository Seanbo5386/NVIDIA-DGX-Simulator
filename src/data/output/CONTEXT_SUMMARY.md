# HPC Cluster CLI Simulator Context Summary

_Generated: 2026-02-04 05:22:10_

This document provides a comprehensive reference for simulating NVIDIA HPC cluster CLI commands.

---

## Overview

- **Total Commands Documented:** 214
- **Categories:** 17

- **State Domains:** 13

## Table of Contents

1. [State Domains](#state-domains)
2. [Commands by Category](#commands-by-category)
3. [Consistency Groups](#consistency-groups)
4. [State Propagation Rules](#state-propagation-rules)
5. [Scenario References](#scenario-references)

---

## State Domains

The simulator maintains state in 13 domains:

### gpu_state

_GPU hardware and driver state information from NVIDIA SMI and NVML_

Key fields: `gpu_id`, `uuid`, `name`, `temperature`, `power_draw`, `power_limit`, `utilization_gpu`, `utilization_memory`, `memory_total`, `memory_used`
... and 13 more

### gpu_process_state

_Information about processes currently using GPU resources_

Key fields: `pid`, `gpu_id`, `process_name`, `used_memory`, `compute_utilization`, `type`

### job_state

_Slurm job scheduling and execution state information_

Key fields: `job_id`, `job_name`, `user`, `state`, `partition`, `nodes`, `num_nodes`, `num_cpus`, `num_gpus`, `time_limit`
... and 9 more

### node_state

_Compute node status and resource availability_

Key fields: `hostname`, `state`, `state_flags`, `cpus_total`, `cpus_alloc`, `cpus_idle`, `memory_total`, `memory_alloc`, `memory_free`, `gpus_total`
... and 8 more

### partition_state

_Slurm partition (queue) configuration and status_

Key fields: `partition_name`, `state`, `nodes`, `total_nodes`, `total_cpus`, `max_time`, `default_time`, `max_nodes`, `min_nodes`, `default`
... and 6 more

### network_ib_state

_InfiniBand fabric port and link state information_

Key fields: `device`, `port`, `state`, `physical_state`, `link_speed`, `link_width`, `rate`, `lid`, `sm_lid`, `guid`
... and 5 more

### network_eth_state

_Ethernet network interface state and statistics_

Key fields: `interface`, `state`, `mac_address`, `ipv4_address`, `ipv4_netmask`, `ipv6_address`, `mtu`, `speed`, `duplex`, `driver`
... and 8 more

### storage_lustre_state

_Lustre parallel filesystem state and statistics_

Key fields: `filesystem`, `mount_point`, `mdt_status`, `ost_count`, `ost_status`, `total_space`, `used_space`, `free_space`, `total_inodes`, `used_inodes`
... and 4 more

### storage_local_state

_Local disk and storage device state_

Key fields: `device`, `mount_point`, `fs_type`, `total_size`, `used_size`, `available_size`, `use_percent`, `mount_options`, `read_only`, `model`
... and 2 more

### system_state

_General system information and resource utilization_

Key fields: `hostname`, `fqdn`, `kernel_version`, `os_name`, `os_version`, `architecture`, `uptime_seconds`, `boot_time`, `cpu_model`, `cpu_count`
... and 13 more

### container_state

_Container runtime state for Docker, Podman, Singularity, or Enroot_

Key fields: `container_id`, `name`, `image`, `image_id`, `status`, `created`, `started`, `ports`, `mounts`, `gpus_attached`
... and 3 more

### firmware_state

_Device firmware versions and update status_

Key fields: `device_type`, `device_id`, `current_version`, `available_version`, `update_available`, `psid`, `last_updated`

### fabric_state

_NVSwitch and NVLink fabric interconnect state_

Key fields: `nvswitch_id`, `nvswitch_uuid`, `nvlink_version`, `links`, `throughput_rx`, `throughput_tx`, `fatal_errors`, `non_fatal_errors`

---

## Commands by Category

### cluster_management (18 commands)

_SLURM and cluster management tools_

| Command    | State Reads                            | State Writes                           |
| ---------- | -------------------------------------- | -------------------------------------- |
| `sacct`    | job_state, node_state, partition_state | -                                      |
| `sacctmgr` | job_state                              | job_state                              |
| `salloc`   | partition_state, node_state            | job_state, node_state                  |
| `sbatch`   | partition_state, node_state            | job_state                              |
| `sbcast`   | job_state                              | storage_local_state                    |
| `scancel`  | job_state                              | job_state                              |
| `scontrol` | job_state, node_state, partition_state | job_state, node_state, partition_state |
| `scrontab` | -                                      | job_state                              |
| `sdiag`    | job_state                              | -                                      |
| `sgather`  | job_state, storage_local_state         | storage_local_state                    |
| `sinfo`    | node_state, partition_state            | -                                      |
| `sprio`    | job_state, partition_state             | -                                      |
| `squeue`   | job_state, node_state, partition_state | -                                      |
| `sreport`  | job_state                              | -                                      |
| `srun`     | job_state, partition_state, node_state | job_state                              |
| `sshare`   | job_state                              | -                                      |
| `sstat`    | job_state, node_state                  | -                                      |
| `strigger` | node_state, job_state                  | job_state                              |

### containers (8 commands)

_Container runtime and management tools_

| Command                | State Reads                | State Writes               |
| ---------------------- | -------------------------- | -------------------------- |
| `apptainer`            | gpu_state, container_state | container_state            |
| `docker`               | container_state, gpu_state | container_state, gpu_state |
| `enroot`               | container_state, gpu_state | container_state, gpu_state |
| `ngc`                  | container_state            | -                          |
| `nvidia-container-cli` | gpu_state, container_state | container_state            |
| `podman`               | container_state, gpu_state | container_state, gpu_state |
| `pyxis`                | job_state, container_state | container_state            |
| `singularity`          | container_state, gpu_state | container_state, gpu_state |

### cuda_tools (12 commands)

_CUDA development and profiling tools_

| Command             | State Reads                  | State Writes        |
| ------------------- | ---------------------------- | ------------------- |
| `bandwidthTest`     | gpu_state, system_state      | -                   |
| `compute-sanitizer` | gpu_state, gpu_process_state | -                   |
| `cuda-gdb`          | gpu_state, gpu_process_state | gpu_process_state   |
| `cuda-memcheck`     | gpu_state, gpu_process_state | -                   |
| `cuobjdump`         | storage_local_state          | storage_local_state |
| `deviceQuery`       | gpu_state                    | -                   |
| `ncu`               | gpu_state, gpu_process_state | -                   |
| `nsys`              | gpu_state, gpu_process_state | -                   |
| `nvcc`              | gpu_state                    | -                   |
| `nvdisasm`          | storage_local_state          | -                   |
| `nvprof`            | gpu_state                    | storage_local_state |
| `ptxas`             | storage_local_state          | storage_local_state |

### diagnostics (9 commands)

_System and hardware diagnostic tools_

| Command                | State Reads                                | State Writes             |
| ---------------------- | ------------------------------------------ | ------------------------ |
| `dmesg`                | system_state, gpu_state, network_ib_state  | system_state             |
| `fio`                  | storage_local_state, storage_lustre_state  | storage_local_state      |
| `gpu_burn`             | gpu_state                                  | gpu_state                |
| `ipmitool`             | system_state, node_state                   | node_state, system_state |
| `journalctl`           | system_state, gpu_state, job_state         | system_state             |
| `memtester`            | system_state                               | -                        |
| `nvidia-bug-report.sh` | gpu_state, system_state, gpu_process_state | -                        |
| `stress-ng`            | system_state                               | -                        |
| `xhpl`                 | gpu_state, system_state, fabric_state      | -                        |

### firmware (5 commands)

_Firmware management tools_

| Command        | State Reads                      | State Writes                     |
| -------------- | -------------------------------- | -------------------------------- |
| `flint`        | firmware_state, network_ib_state | firmware_state, network_ib_state |
| `fwupdmgr`     | firmware_state, system_state     | firmware_state                   |
| `mlxfwmanager` | firmware_state, network_ib_state | firmware_state, network_ib_state |
| `mlxfwreset`   | firmware_state, network_ib_state | network_ib_state, firmware_state |
| `mlxup`        | firmware_state                   | firmware_state                   |

### general (53 commands)

_General utility commands_

| Command     | State Reads         | State Writes        |
| ----------- | ------------------- | ------------------- |
| `awk`       | storage_local_state | -                   |
| `cat`       | storage_local_state | -                   |
| `chmod`     | -                   | storage_local_state |
| `chown`     | -                   | storage_local_state |
| `cmake`     | storage_local_state | storage_local_state |
| `cp`        | storage_local_state | storage_local_state |
| `crontab`   | -                   | system_state        |
| `curl`      | -                   | storage_local_state |
| `diff`      | storage_local_state | -                   |
| `env`       | system_state        | -                   |
| `find`      | storage_local_state | storage_local_state |
| `git`       | storage_local_state | storage_local_state |
| `grep`      | storage_local_state | -                   |
| `gzip`      | storage_local_state | storage_local_state |
| `head`      | storage_local_state | -                   |
| `id`        | system_state        | -                   |
| `kill`      | -                   | gpu_process_state   |
| `ldconfig`  | storage_local_state | system_state        |
| `ldd`       | storage_local_state | -                   |
| `ln`        | -                   | storage_local_state |
| `make`      | storage_local_state | storage_local_state |
| `mkdir`     | -                   | storage_local_state |
| `mv`        | -                   | storage_local_state |
| `nice`      | -                   | system_state        |
| `nohup`     | -                   | gpu_process_state   |
| `nproc`     | node_state          | -                   |
| `pgrep`     | gpu_process_state   | -                   |
| `pkill`     | -                   | gpu_process_state   |
| `rm`        | -                   | storage_local_state |
| `rsync`     | storage_local_state | storage_local_state |
| `scp`       | storage_local_state | storage_local_state |
| `screen`    | -                   | gpu_process_state   |
| `sed`       | storage_local_state | storage_local_state |
| `sleep`     | -                   | -                   |
| `sort`      | storage_local_state | -                   |
| `ssh`       | node_state          | -                   |
| `strace`    | system_state        | -                   |
| `sudo`      | -                   | system_state        |
| `systemctl` | system_state        | system_state        |
| `tail`      | storage_local_state | -                   |
| `tar`       | storage_local_state | storage_local_state |
| `taskset`   | system_state        | system_state        |
| `tee`       | -                   | storage_local_state |
| `time`      | system_state        | -                   |
| `timeout`   | -                   | system_state        |
| `tmux`      | -                   | gpu_process_state   |
| `touch`     | -                   | storage_local_state |
| `unzip`     | storage_local_state | storage_local_state |
| `wc`        | storage_local_state | -                   |
| `wget`      | -                   | storage_local_state |
| `which`     | system_state        | -                   |
| `whoami`    | system_state        | -                   |
| `xargs`     | storage_local_state | -                   |

### gpu_fabric (5 commands)

_NVLink, NVSwitch, and GPU fabric tools_

| Command                   | State Reads             | State Writes            |
| ------------------------- | ----------------------- | ----------------------- |
| `gdrcopy_copybw`          | gpu_state               | -                       |
| `gdrcopy_copylat`         | gpu_state               | -                       |
| `nv-fabricmanager`        | gpu_state, fabric_state | fabric_state, gpu_state |
| `nvbandwidth`             | gpu_state, fabric_state | -                       |
| `p2pBandwidthLatencyTest` | gpu_state, fabric_state | -                       |

### gpu_management (7 commands)

_GPU monitoring and management tools_

| Command                   | State Reads                                | State Writes                 |
| ------------------------- | ------------------------------------------ | ---------------------------- |
| `dcgmi`                   | gpu_state, gpu_process_state, fabric_state | gpu_state                    |
| `gpustat`                 | gpu_state, gpu_process_state               | -                            |
| `nvidia-cuda-mps-control` | gpu_state, gpu_process_state               | gpu_state, gpu_process_state |
| `nvidia-persistenced`     | gpu_state                                  | gpu_state                    |
| `nvidia-smi`              | gpu_state, gpu_process_state, fabric_state | gpu_state                    |
| `nvitop`                  | gpu_state, gpu_process_state, system_state | gpu_process_state            |
| `nvtop`                   | gpu_state, gpu_process_state               | -                            |

### modules (1 commands)

_Environment modules tools_

| Command  | State Reads  | State Writes |
| -------- | ------------ | ------------ |
| `module` | system_state | system_state |

### monitoring (18 commands)

_System monitoring and observability tools_

| Command     | State Reads                                          | State Writes |
| ----------- | ---------------------------------------------------- | ------------ |
| `atop`      | system_state, storage_local_state, network_eth_state | -            |
| `dstat`     | system_state, storage_local_state, network_eth_state | -            |
| `glances`   | system_state, gpu_state, storage_local_state         | -            |
| `htop`      | system_state                                         | system_state |
| `iostat`    | system_state, storage_local_state                    | -            |
| `iotop`     | storage_local_state, gpu_process_state               | -            |
| `mpstat`    | system_state                                         | -            |
| `nmon`      | system_state, storage_local_state, network_eth_state | -            |
| `perf`      | system_state, gpu_process_state                      | -            |
| `pidstat`   | system_state                                         | -            |
| `ps`        | system_state                                         | -            |
| `sar`       | system_state, storage_local_state, network_eth_state | -            |
| `sensors`   | system_state                                         | -            |
| `top`       | system_state                                         | -            |
| `turbostat` | system_state                                         | -            |
| `uptime`    | system_state                                         | -            |
| `vmstat`    | system_state, storage_local_state                    | -            |
| `watch`     | system_state                                         | -            |

### mpi (6 commands)

_MPI and parallel computing tools_

| Command          | State Reads                      | State Writes                    |
| ---------------- | -------------------------------- | ------------------------------- |
| `mpi_test_suite` | network_ib_state                 | -                               |
| `mpicc`          | system_state                     | -                               |
| `mpiexec`        | job_state, node_state, gpu_state | gpu_process_state, system_state |
| `mpif90`         | -                                | storage_local_state             |
| `mpirun`         | job_state, node_state, gpu_state | gpu_process_state, system_state |
| `ompi_info`      | system_state                     | -                               |

### nccl_tests (8 commands)

_NCCL collective communication tests_

| Command               | State Reads                               | State Writes |
| --------------------- | ----------------------------------------- | ------------ |
| `all_gather_perf`     | gpu_state, fabric_state, network_ib_state | -            |
| `all_reduce_perf`     | gpu_state, fabric_state, network_ib_state | -            |
| `broadcast_perf`      | gpu_state, fabric_state, network_ib_state | -            |
| `gather_perf`         | gpu_state                                 | -            |
| `reduce_perf`         | gpu_state, fabric_state, network_ib_state | -            |
| `reduce_scatter_perf` | gpu_state, fabric_state, network_ib_state | -            |
| `scatter_perf`        | gpu_state                                 | -            |
| `sendrecv_perf`       | gpu_state, network_ib_state, fabric_state | -            |

### networking (29 commands)

_InfiniBand, Mellanox, and network tools_

| Command         | State Reads                      | State Writes                     |
| --------------- | -------------------------------- | -------------------------------- |
| `ethtool`       | network_eth_state                | network_eth_state                |
| `ibdiagnet`     | network_ib_state                 | -                                |
| `ibhosts`       | network_ib_state                 | -                                |
| `iblinkinfo`    | network_ib_state                 | -                                |
| `ibnetdiscover` | network_ib_state                 | -                                |
| `ibping`        | network_ib_state                 | -                                |
| `ibportstate`   | network_ib_state                 | network_ib_state                 |
| `ibstat`        | network_ib_state                 | -                                |
| `ibstatus`      | network_ib_state                 | -                                |
| `ibswitches`    | network_ib_state                 | -                                |
| `ibtracert`     | network_ib_state                 | -                                |
| `ibv_devinfo`   | network_ib_state, firmware_state | -                                |
| `ip`            | network_eth_state, system_state  | network_eth_state, system_state  |
| `mlxcables`     | network_ib_state, firmware_state | -                                |
| `mlxconfig`     | network_ib_state, firmware_state | network_ib_state, firmware_state |
| `mlxdump`       | firmware_state                   | firmware_state                   |
| `mlxlink`       | network_ib_state, firmware_state | network_ib_state                 |
| `mlxreg`        | network_ib_state, firmware_state | network_ib_state                 |
| `netstat`       | network_eth_state                | -                                |
| `perfquery`     | network_ib_state                 | network_ib_state                 |
| `ping`          | network_eth_state                | -                                |
| `rdma`          | network_ib_state                 | network_ib_state                 |
| `saquery`       | network_ib_state                 | -                                |
| `show_gids`     | network_ib_state                 | -                                |
| `sminfo`        | network_ib_state                 | -                                |
| `smpquery`      | network_ib_state                 | -                                |
| `ss`            | network_eth_state                | -                                |
| `traceroute`    | network_eth_state                | -                                |
| `ucx_info`      | network_ib_state, gpu_state      | -                                |

### parallel_shell (4 commands)

_Parallel shell and cluster administration tools_

| Command   | State Reads | State Writes |
| --------- | ----------- | ------------ |
| `clush`   | node_state  | -            |
| `nodeset` | node_state  | -            |
| `pdcp`    | node_state  | -            |
| `pdsh`    | node_state  | -            |

### rdma_perf (6 commands)

_RDMA performance testing tools_

| Command        | State Reads                 | State Writes |
| -------------- | --------------------------- | ------------ |
| `ib_read_bw`   | network_ib_state, gpu_state | -            |
| `ib_read_lat`  | network_ib_state            | -            |
| `ib_send_bw`   | network_ib_state            | -            |
| `ib_send_lat`  | network_ib_state            | -            |
| `ib_write_bw`  | network_ib_state, gpu_state | -            |
| `ib_write_lat` | network_ib_state, gpu_state | -            |

### storage (10 commands)

_Storage and filesystem tools_

| Command    | State Reads                               | State Writes         |
| ---------- | ----------------------------------------- | -------------------- |
| `dd`       | storage_local_state                       | storage_local_state  |
| `df`       | storage_local_state, storage_lustre_state | -                    |
| `du`       | storage_local_state, storage_lustre_state | -                    |
| `findmnt`  | storage_local_state, storage_lustre_state | -                    |
| `lfs`      | storage_lustre_state                      | storage_lustre_state |
| `lsblk`    | storage_local_state                       | -                    |
| `mount`    | storage_local_state                       | storage_local_state  |
| `nvme`     | storage_local_state                       | storage_local_state  |
| `smartctl` | storage_local_state                       | -                    |
| `umount`   | storage_local_state                       | storage_local_state  |

### system_info (15 commands)

_System information and status tools_

| Command       | State Reads                               | State Writes |
| ------------- | ----------------------------------------- | ------------ |
| `dmidecode`   | system_state                              | -            |
| `free`        | system_state                              | -            |
| `hostname`    | system_state                              | system_state |
| `hostnamectl` | system_state                              | system_state |
| `hwloc-info`  | system_state                              | -            |
| `hwloc-ls`    | system_state, gpu_state                   | -            |
| `lscpu`       | system_state                              | -            |
| `lsmem`       | system_state                              | -            |
| `lsmod`       | system_state                              | -            |
| `lspci`       | gpu_state, network_ib_state, system_state | -            |
| `lstopo`      | system_state, gpu_state                   | -            |
| `numactl`     | system_state                              | system_state |
| `numastat`    | system_state                              | -            |
| `timedatectl` | system_state                              | system_state |
| `uname`       | system_state                              | -            |

---

## Consistency Groups

Commands that must show consistent data:

### GPU Inventory

_Commands that list GPUs must show the same devices with matching UUIDs and names_

Commands: `nvidia-smi`, `nvidia-smi`, `dcgmi`, `lspci`, `nvitop`

### GPU Memory Usage

_Commands showing GPU memory must report consistent total/used/free values_

Commands: `nvidia-smi`, `nvidia-smi`, `dcgmi`, `nvtop`, `gpustat`, `nvitop`

### GPU Utilization

_Commands showing GPU utilization metrics_

Commands: `nvidia-smi`, `nvidia-smi`, `dcgmi`, `nvtop`, `gpustat`, `nvitop`

### GPU Process List

_Commands showing processes using GPUs_

Commands: `nvidia-smi`, `nvidia-smi`, `nvidia-smi`, `dcgmi`, `nvtop`, `nvitop`

### GPU Topology/NVLink

_Commands showing GPU interconnect topology_

Commands: `nvidia-smi`, `nvidia-smi`, `dcgmi`, `dcgmi`, `lstopo`

### SLURM Job Queue

_Commands showing SLURM job information_

Commands: `squeue`, `scontrol`, `sacct`

### SLURM Node Status

_Commands showing SLURM node state_

Commands: `sinfo`, `sinfo`, `scontrol`, `scontrol`

### SLURM Partition Info

_Commands showing SLURM partition configuration_

Commands: `sinfo`, `scontrol`

### InfiniBand Port Status

_Commands showing IB port state_

Commands: `ibstat`, `ibstatus`, `ibv_devinfo`, `mlxlink`

### InfiniBand Fabric Topology

_Commands showing IB fabric discovery_

Commands: `ibnetdiscover`, `iblinkinfo`, `ibhosts`, `ibswitches`

### InfiniBand Error Counters

_Commands showing IB error statistics_

Commands: `perfquery`, `ibdiagnet`, `mlxlink`

### Ethernet Interface Status

_Commands showing Ethernet interface state_

Commands: `ip`, `ip`, `ethtool`

### Local Storage Status

_Commands showing local disk/filesystem state_

Commands: `df`, `df`, `lsblk`, `mount`, `findmnt`

### Lustre Filesystem Status

_Commands showing Lustre filesystem state_

Commands: `lfs`, `lfs`, `df`

### CPU Information

_Commands showing CPU details_

Commands: `lscpu`, `nproc`, `numastat`, `lstopo`

### System Memory

_Commands showing memory information_

Commands: `free`, `free`, `lsmem`, `numastat`, `vmstat`

### Container Status

_Commands showing container state_

Commands: `docker`, `docker`, `enroot`, `podman`

### Firmware Versions

_Commands showing device firmware_

Commands: `nvidia-smi`, `mlxfwmanager`, `flint`, `fwupdmgr`

---

## State Propagation Rules

How state changes cascade:

- **GPU Falls Off Bus**: GPU becomes unavailable due to hardware error, driver crash, or uncorrectable ECC error
- **GPU Thermal Throttling**: GPU reduces clocks due to high temperature
- **Job Submitted to SLURM**: New job enters the queue
- **Job Starts Running**: Pending job gets scheduled and starts execution
- **Job Completes Successfully**: Running job finishes normally
- **Job Fails**: Running job exits with error
- **Job Cancelled**: Job cancelled via scancel
- **Node Drained**: Admin drains node for maintenance
- **InfiniBand Link Down**: IB port goes down due to cable or switch issue
- **IB Error Threshold Exceeded**: InfiniBand error counters exceed threshold
- **NVLink Error**: NVLink between GPUs experiences errors
- **Storage Full**: Filesystem reaches capacity
- **Lustre OST Down**: Lustre Object Storage Target becomes unavailable
- **NVIDIA Driver Reload**: NVIDIA driver is reloaded (e.g., after GPU reset)
- **Container Started**: Container runtime starts a new container
- **GPU Persistence Mode Changed**: nvidia-smi -pm command changes persistence mode
- **GPU ECC Mode Changed**: ECC memory mode changed (requires reboot)

---

## Scenario References

Detailed impact analyses for common events:

- **Container GPU Allocation** (`container_gpu_allocation.json`): Simulates allocating GPUs to a container using nvidia-container-toolkit, showing visibility and isol
- **GPU ECC Memory Errors** (`ecc_error.json`): Simulates ECC memory errors on GPU, from correctable single-bit errors to uncorrectable double-bit e
- **GPU Falls Off Bus** (`gpu_failure.json`): Simulates a GPU becoming unavailable due to hardware failure, uncorrectable ECC error, or driver cra
- **GPU Thermal Throttling** (`gpu_thermal_throttle.json`): Simulates GPU reducing clock speeds due to high temperature, affecting performance but not availabil
- **InfiniBand Link Failure** (`ib_link_failure.json`): Simulates an InfiniBand port going down due to cable issue, switch failure, or transceiver problem
- **Job Lifecycle: Submit to Complete** (`job_submission_to_completion.json`): Simulates a complete job lifecycle from submission through pending, running, to completion
- **Node Drain for Maintenance** (`node_drain.json`): Simulates an administrator draining a node for maintenance, preventing new job scheduling
- **NVLink Error Between GPUs** (`nvlink_error.json`): Simulates NVLink connectivity issues between GPUs, causing fallback to PCIe for peer-to-peer communi
- **Storage Filesystem Full** (`storage_full.json`): Simulates a filesystem reaching capacity, causing job failures due to inability to write output

---

_This summary was auto-generated. See individual JSON files for complete documentation._
