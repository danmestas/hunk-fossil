// Fossil and zit backends for hunk: `hunk diff` and `hunk show` inside a
// fossil or zit checkout. Both tools emit the same unified diff format, so
// the adapters differ only in the binary and the checkout marker.
//
//   hunk diff               checkout changes, plus untracked files
//   hunk diff VERSION       VERSION against the checkout
//   hunk diff A..B          check-in A against check-in B
//   hunk show [VERSION]     what VERSION changed (default: the current check-in)
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

type Tool = { id: string; name: string; bin: string; markers: string[] };

const TOOLS: Tool[] = [
  { id: "fossil", name: "Fossil", bin: "fossil", markers: [".fslckout", "_FOSSIL_"] },
  { id: "zit", name: "zit", bin: "zit", markers: [".zit-checkout"] },
];

function findRoot(cwd: string, markers: string[]): string | null {
  for (let dir = cwd; ; dir = dirname(dir)) {
    if (markers.some((m) => existsSync(join(dir, m)))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

function run(bin: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { cwd, maxBuffer: 256 << 20 }, (err, stdout, stderr) => {
      if (err) {
        const why = (stderr || err.message).trim().split("\n")[0];
        reject(new Error(`${bin} ${args.join(" ")}: ${why}`));
      } else resolve(stdout);
    });
  });
}

// "A..B" compares two check-ins; a single VERSION compares it to the checkout.
function rangeArgs(range?: string): string[] {
  if (!range) return [];
  const [from, to] = range.split("..");
  return to ? ["--from", from, "--to", to] : ["--from", from];
}

export default function (hunk: any) {
  for (const t of TOOLS) {
    hunk.registerVcsAdapter({
      id: t.id,
      name: t.name,
      detect: (cwd: string) => {
        const repoRoot = findRoot(cwd, t.markers);
        return repoRoot ? { id: t.id, repoRoot } : null;
      },
      operations: {
        "working-tree-diff": {
          async load(input: any, ctx: any) {
            if (input.staged) throw new Error(`${t.name} has no staging area; drop --staged.`);
            const root = findRoot(ctx.cwd, t.markers) ?? ctx.cwd;
            const paths = input.pathspecs ?? [];
            const patchText = await run(t.bin, ["diff", ...rangeArgs(input.range), ...paths], ctx.cwd);
            // Untracked files only make sense against the working checkout.
            const wantExtras = !input.range?.includes("..") && !input.options?.excludeUntracked;
            const untrackedPaths = wantExtras
              ? (await run(t.bin, ["extras"], root)).split("\n").filter(Boolean)
              : [];
            return {
              repoRoot: root,
              sourceLabel: root,
              title: input.range ? `${t.name} diff ${input.range}` : `${t.name} checkout`,
              patchText,
              untrackedPaths,
            };
          },
        },
        "revision-show": {
          async load(input: any, ctx: any) {
            const root = findRoot(ctx.cwd, t.markers) ?? ctx.cwd;
            const ref = input.ref ?? "current";
            const paths = input.pathspecs ?? [];
            return {
              repoRoot: root,
              sourceLabel: root,
              title: `${t.name} ${ref}`,
              patchText: await run(t.bin, ["diff", "--checkin", ref, ...paths], ctx.cwd),
            };
          },
        },
      },
    });
  }
}
