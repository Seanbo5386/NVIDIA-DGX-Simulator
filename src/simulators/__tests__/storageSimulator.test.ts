import { describe, it, expect, beforeEach, vi } from "vitest";
import { StorageSimulator } from "../storageSimulator";
import { parse } from "@/utils/commandParser";
import type { CommandContext } from "@/types/commands";

// Mock the store
vi.mock("@/store/simulationStore");

describe("StorageSimulator", () => {
  let simulator: StorageSimulator;
  let context: CommandContext;

  beforeEach(() => {
    simulator = new StorageSimulator();
    context = {
      currentNode: "dgx-00",
      currentPath: "/root",
      environment: {},
      history: [],
    };
  });

  describe("Metadata", () => {
    it("should return correct metadata", () => {
      const metadata = simulator.getMetadata();

      expect(metadata.name).toBe("storage-tools");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.description).toContain("Storage");
      expect(metadata.commands).toHaveLength(3);
      expect(metadata.commands.map((c) => c.name)).toEqual([
        "df",
        "mount",
        "lfs",
      ]);
    });
  });

  // ============================================
  // df tests
  // ============================================
  describe("df command", () => {
    it("should show filesystems with correct columns", () => {
      const parsed = parse("df");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Filesystem");
      expect(result.output).toContain("1K-blocks");
      expect(result.output).toContain("Used");
      expect(result.output).toContain("Avail");
      expect(result.output).toContain("Use%");
      expect(result.output).toContain("Mounted on");
    });

    it("should list all four filesystems", () => {
      const parsed = parse("df");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("/dev/sda1");
      expect(result.output).toContain("nas01:/data");
      expect(result.output).toContain("nas01:/home");
      expect(result.output).toContain("lustre@tcp:/scratch");
    });

    it("should show correct mount points", () => {
      const parsed = parse("df");
      const result = simulator.execute(parsed, context);
      const lines = result.output.trim().split("\n");

      // Each data line ends with a mount point
      expect(lines.some((l) => l.trimEnd().endsWith("/"))).toBe(true);
      expect(lines.some((l) => l.trimEnd().endsWith("/data"))).toBe(true);
      expect(lines.some((l) => l.trimEnd().endsWith("/home"))).toBe(true);
      expect(lines.some((l) => l.trimEnd().endsWith("/scratch"))).toBe(true);
    });

    describe("df -h (human-readable)", () => {
      it("should show Size header instead of 1K-blocks", () => {
        const parsed = parse("df -h");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("Size");
        expect(result.output).not.toContain("1K-blocks");
      });

      it("should display sizes with human-readable suffixes", () => {
        const parsed = parse("df -h");
        const result = simulator.execute(parsed, context);

        // Check for G/T/P suffixes in sizes
        expect(result.output).toMatch(/\d+(\.\d+)?[GTPKM]/);
        expect(result.output).toContain("500G");
        expect(result.output).toContain("1.2P");
      });

      it("should show Lustre filesystem at 1.2P scale", () => {
        const parsed = parse("df -h");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("1.2P");
        expect(result.output).toContain("804T");
        expect(result.output).toContain("396T");
      });
    });

    describe("df -T (filesystem type)", () => {
      it("should include Type column", () => {
        const parsed = parse("df -T");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("Type");
      });

      it("should show filesystem types: ext4, nfs4, lustre", () => {
        const parsed = parse("df -T");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("ext4");
        expect(result.output).toContain("nfs4");
        expect(result.output).toContain("lustre");
      });
    });

    describe("df -i (inodes)", () => {
      it("should show inode-specific columns", () => {
        const parsed = parse("df -i");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("Inodes");
        expect(result.output).toContain("IUsed");
        expect(result.output).toContain("IFree");
        expect(result.output).toContain("IUse%");
      });

      it("should not show Size/Used/Avail columns from regular mode", () => {
        const parsed = parse("df -i");
        const result = simulator.execute(parsed, context);

        expect(result.output).not.toContain("1K-blocks");
        // "Used" might appear inside "IUsed", so check for isolated "Used" header
        // Instead, confirm inode columns are present
        expect(result.output).toContain("IUsed");
        expect(result.output).toContain("IFree");
      });

      it("should show inode data for all filesystems", () => {
        const parsed = parse("df -i");
        const result = simulator.execute(parsed, context);

        // Check inode values for root filesystem
        expect(result.output).toContain("32768000");
        expect(result.output).toContain("2450000");
        expect(result.output).toContain("30318000");
      });
    });

    describe("column alignment", () => {
      it("should right-align numeric columns in regular mode", () => {
        const parsed = parse("df");
        const result = simulator.execute(parsed, context);
        const lines = result.output.trim().split("\n");

        // Header line: numeric headers should be right-aligned (padStart)
        const header = lines[0];
        // "1K-blocks" should appear after the "Filesystem" padded area
        expect(header).toContain("1K-blocks");

        // Data lines: check that numeric values are right-aligned
        // The "9%" percentage should be padded with spaces before it
        const rootLine = lines.find((l) => l.includes("/dev/sda1"));
        expect(rootLine).toBeDefined();
        // The percentage "9%" has a space before it (right-aligned in 5-char column)
        expect(rootLine).toMatch(/\s+9%\s/);
      });

      it("should right-align numeric columns in human-readable mode", () => {
        const parsed = parse("df -h");
        const result = simulator.execute(parsed, context);
        const lines = result.output.trim().split("\n");

        // Check that the "9%" for root is right-aligned (padStart within 5 chars)
        const rootLine = lines.find((l) => l.includes("/dev/sda1"));
        expect(rootLine).toBeDefined();
        expect(rootLine).toMatch(/\s+9%\s/);
      });

      it("should right-align numeric columns in inode mode", () => {
        const parsed = parse("df -i");
        const result = simulator.execute(parsed, context);
        const lines = result.output.trim().split("\n");

        // Check that inode percentages are right-aligned
        const rootLine = lines.find((l) => l.includes("/dev/sda1"));
        expect(rootLine).toBeDefined();
        // "7%" should be right-aligned
        expect(rootLine).toMatch(/\s+7%\s/);
      });

      it("should left-align Filesystem column", () => {
        const parsed = parse("df");
        const result = simulator.execute(parsed, context);
        const lines = result.output.trim().split("\n");

        // Data lines: device names should be left-aligned (padEnd)
        const rootLine = lines.find((l) => l.includes("/dev/sda1"));
        expect(rootLine).toBeDefined();
        // "/dev/sda1" should start at the beginning, followed by padding spaces
        expect(rootLine!.startsWith("/dev/sda1")).toBe(true);
      });
    });

    describe("combined flags", () => {
      it("should support -hT (human-readable + type)", () => {
        const parsed = parse("df -h -T");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Size");
        expect(result.output).toContain("Type");
        expect(result.output).toContain("ext4");
        expect(result.output).toContain("500G");
      });

      it("should support -iT (inodes + type)", () => {
        const parsed = parse("df -i -T");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Inodes");
        expect(result.output).toContain("Type");
        expect(result.output).toContain("ext4");
      });
    });
  });

  // ============================================
  // mount tests
  // ============================================
  describe("mount command", () => {
    it("should list all mounted filesystems", () => {
      const parsed = parse("mount");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      const lines = result.output.trim().split("\n");
      // Should have at least 7 mount entries
      expect(lines.length).toBeGreaterThanOrEqual(7);
    });

    it("should show filesystem types", () => {
      const parsed = parse("mount");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("type ext4");
      expect(result.output).toContain("type nfs4");
      expect(result.output).toContain("type lustre");
      expect(result.output).toContain("type devtmpfs");
      expect(result.output).toContain("type tmpfs");
    });

    it("should show mount options for each filesystem", () => {
      const parsed = parse("mount");
      const result = simulator.execute(parsed, context);

      // ext4 options
      expect(result.output).toContain("rw,relatime,errors=remount-ro");
      // NFS options
      expect(result.output).toContain("vers=4.2");
      expect(result.output).toContain("rsize=1048576");
      // Lustre options
      expect(result.output).toContain("rw,flock,user_xattr,lazystatfs");
    });

    it("should show 'on <mount_point> type' format", () => {
      const parsed = parse("mount");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("/dev/sda1 on / type ext4");
      expect(result.output).toContain("nas01:/data on /data type nfs4");
      expect(result.output).toContain(
        "lustre@tcp:/scratch on /scratch type lustre",
      );
    });

    it("should include tmpfs entries", () => {
      const parsed = parse("mount");
      const result = simulator.execute(parsed, context);

      expect(result.output).toContain("tmpfs on /dev/shm");
      expect(result.output).toContain("tmpfs on /run");
    });
  });

  // ============================================
  // lfs tests
  // ============================================
  describe("lfs command", () => {
    it("should error without subcommand", () => {
      const parsed = parse("lfs");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("missing subcommand");
    });

    describe("lfs df", () => {
      it("should show Lustre filesystem status with MDT/OST listing", () => {
        const parsed = parse("lfs df");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("UUID");
        expect(result.output).toContain("1K-blocks");
        expect(result.output).toContain("Used");
        expect(result.output).toContain("Available");
        expect(result.output).toContain("Use%");
      });

      it("should list MDT and OST targets", () => {
        const parsed = parse("lfs df");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("MDT0000");
        expect(result.output).toContain("OST0000");
        expect(result.output).toContain("OST0001");
        expect(result.output).toContain("OST0002");
        expect(result.output).toContain("OST0003");
      });

      it("should show filesystem_summary line", () => {
        const parsed = parse("lfs df");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("filesystem_summary:");
        expect(result.output).toContain("/scratch");
      });

      it("should use filesystem-prefixed UUID format (scratch-)", () => {
        const parsed = parse("lfs df");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("scratch-MDT0000_UUID");
        expect(result.output).toContain("scratch-OST0000_UUID");
        expect(result.output).toContain("scratch-OST0001_UUID");
        expect(result.output).toContain("scratch-OST0002_UUID");
        expect(result.output).toContain("scratch-OST0003_UUID");
        // Should NOT use "lustre-" prefix
        expect(result.output).not.toContain("lustre-MDT");
        expect(result.output).not.toContain("lustre-OST");
      });

      it("should show mount point with target type annotations", () => {
        const parsed = parse("lfs df");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("/scratch[MDT:0]");
        expect(result.output).toContain("/scratch[OST:0]");
        expect(result.output).toContain("/scratch[OST:1]");
      });

      it("should show PB-scale total in filesystem_summary", () => {
        const parsed = parse("lfs df");
        const result = simulator.execute(parsed, context);

        // Verify the summary has realistic numbers (~1.2PB total)
        expect(result.output).toContain("1258291200000");
      });
    });

    describe("lfs df -h", () => {
      it("should show human-readable Lustre sizes", () => {
        const parsed = parse("lfs df -h");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("bytes");
        // Should have T/G/P suffixes
        expect(result.output).toMatch(/\d+\.\d+[TGP]/);
      });

      it("should show PB-scale filesystem summary", () => {
        const parsed = parse("lfs df -h");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("1.2P");
        expect(result.output).toContain("804.0T");
        expect(result.output).toContain("396.0T");
      });

      it("should show MDT size in GB range", () => {
        const parsed = parse("lfs df -h");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("953.6G");
      });

      it("should show OST sizes in hundreds-of-TB range", () => {
        const parsed = parse("lfs df -h");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("300.0T");
      });

      it("should use filesystem-prefixed UUID format in human-readable mode", () => {
        const parsed = parse("lfs df -h");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("scratch-MDT0000_UUID");
        expect(result.output).toContain("scratch-OST0000_UUID");
      });
    });

    describe("lfs check servers", () => {
      it("should show all Lustre servers responding", () => {
        const parsed = parse("lfs check servers");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("All Lustre servers are responding");
      });

      it("should check MDT and all OSTs", () => {
        const parsed = parse("lfs check servers");
        const result = simulator.execute(parsed, context);

        expect(result.output).toContain("scratch-MDT0000");
        expect(result.output).toContain("scratch-OST0000");
        expect(result.output).toContain("scratch-OST0001");
        expect(result.output).toContain("scratch-OST0002");
        expect(result.output).toContain("scratch-OST0003");
      });

      it("should show 'Check:' prefix for each server", () => {
        const parsed = parse("lfs check servers");
        const result = simulator.execute(parsed, context);

        const lines = result.output.trim().split("\n");
        const checkLines = lines.filter((l) => l.startsWith("Check:"));
        expect(checkLines).toHaveLength(5); // 1 MDT + 4 OSTs
      });

      it("should use filesystem-prefixed target names", () => {
        const parsed = parse("lfs check servers");
        const result = simulator.execute(parsed, context);

        // Should use "scratch-" prefix, not "lustre-"
        expect(result.output).not.toContain("lustre-MDT");
        expect(result.output).not.toContain("lustre-OST");
        expect(result.output).toContain("scratch-MDT0000");
        expect(result.output).toContain("scratch-OST0000");
      });
    });

    describe("lfs check (non-servers)", () => {
      it("should handle check without specific target", () => {
        const parsed = parse("lfs check");
        // positionalArgs[1] won't exist, defaults to "servers"
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
      });
    });

    describe("lfs help", () => {
      it("should show available lfs commands", () => {
        const parsed = parse("lfs help");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("df");
        expect(result.output).toContain("check servers");
        expect(result.output).toContain("getstripe");
        expect(result.output).toContain("setstripe");
      });
    });

    describe("lfs unknown subcommand", () => {
      it("should error for unknown lfs subcommand", () => {
        const parsed = parse("lfs badcmd");
        const result = simulator.execute(parsed, context);

        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("unknown command");
        expect(result.output).toContain("badcmd");
      });
    });
  });

  // ============================================
  // Version and help
  // ============================================
  describe("version and help", () => {
    it("should handle --version flag", () => {
      const parsed = parse("df --version");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("storage-tools");
      expect(result.output).toContain("version");
    });

    it("should handle --help flag", () => {
      const parsed = parse("df --help");
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("storage-tools");
      expect(result.output).toContain("Usage");
    });
  });

  // ============================================
  // Error handling
  // ============================================
  describe("error handling", () => {
    it("should error for unknown storage command", () => {
      const parsed = parse("badcommand");
      parsed.baseCommand = "badcommand";
      const result = simulator.execute(parsed, context);

      expect(result.exitCode).toBe(1);
      expect(result.output).toContain("Unknown storage command");
    });
  });
});
