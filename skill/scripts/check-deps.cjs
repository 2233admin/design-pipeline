#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const args = new Set(process.argv.slice(2));
const jsonMode = args.has("--json");
const skillRoot =
  process.env.CODEX_SKILLS_DIR ||
  path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills");

const cwd = process.cwd();

const groups = [
  {
    name: "Core pipeline",
    level: "required",
    skills: ["design-pipeline"],
    resources: [
      "design-pipeline/references/website-cloning.md",
      "design-pipeline/references/website-clone-component-spec.md",
      "design-pipeline/references/website-cloning-manifest.schema.json",
      "design-pipeline/scripts/init-website-clone.cjs",
      "design-pipeline/scripts/evaluate-website-clone.cjs",
    ],
  },
  {
    name: "Visual taste",
    level: "enhancement",
    skills: [
      "frontend-design",
      "design-taste-frontend",
      "ui-ux-pro-max",
      "web-design-guidelines",
      "emil-design-eng",
    ],
    fallback: "Use the built-in visual, UX, accessibility, and motion gates manually.",
    install: [
      "Install companion skills from: https://github.com/Leonxlnx/taste-skill",
      "Install UI/UX Pro Max from: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
      "Install Vercel skills from: https://github.com/vercel-labs/agent-skills",
    ],
  },
  {
    name: "Motion design",
    level: "enhancement",
    skills: [
      "design-motion-principles",
      "animation-vocabulary",
      "review-animations",
      "apple-design",
      "vercel-react-view-transitions",
    ],
    fallback: "Document trigger, purpose, duration, easing, interruption behavior, and reduced-motion fallback in design.md.",
    install: [
      "Install Emil motion skills from: https://github.com/emilkowalski/skills",
      "Install motion principles from: https://github.com/kylezantos/design-motion-principles",
    ],
  },
  {
    name: "Animation implementation",
    level: "optional",
    skills: [
      "gsap-core",
      "gsap-timeline",
      "gsap-scrolltrigger",
      "gsap-react",
      "gsap-plugins",
      "gsap-utils",
      "gsap-performance",
      "gsap-frameworks",
      "animejs",
    ],
    fallback: "Use CSS transitions/keyframes for simple motion, or implement animation with the project's existing library.",
    install: [
      "Install GSAP skills from: https://github.com/greensock/gsap-skills",
      "Install Anime.js skill from: https://github.com/BowTiedSwan/animejs-skills",
    ],
  },
  {
    name: "React / Next.js engineering",
    level: "optional",
    skills: [
      "vercel-react-best-practices",
      "vercel-composition-patterns",
      "next-dev-loop",
      "next-cache-components-adoption",
      "next-cache-components-optimizer",
    ],
    fallback: "Use the repo's existing React/Next.js conventions and official docs.",
    install: [
      "Install Vercel Agent Skills from: https://github.com/vercel-labs/agent-skills",
      "Install current Next.js skills from: https://github.com/vercel/next.js/tree/canary/skills",
    ],
  },
  {
    name: "Matt Pocock development",
    level: "optional",
    skills: ["codebase-design", "grill-with-docs", "implement", "matt-tdd", "matt-code-review"],
    fallback: "Use the repo's normal planning, implementation, test, and review process.",
    install: ["Install Matt Pocock skills from: https://github.com/mattpocock/skills"],
  },
];

const surfaces = [
  {
    name: "OpenSpec-style artifacts",
    paths: ["openspec", ".openspec", "spec/changes", "specs", "docs/specs"],
    fallback: "Use design/changes/<change-id>/ as the artifact root.",
  },
  {
    name: "GBrain",
    paths: [".gbrain", "gbrain"],
    fallback: "Keep design decisions repo-local; sync to GBrain only when the repo already supports it.",
  },
  {
    name: "Design artifacts",
    paths: ["design/changes", "docs/design"],
    fallback: "Create design/changes/<change-id>/ when starting a pipeline run.",
  },
];

function exists(p) {
  return fs.existsSync(p);
}

function skillExists(name) {
  return exists(path.join(skillRoot, name, "SKILL.md"));
}

function findSurface(surface) {
  return surface.paths.filter((p) => exists(path.join(cwd, p)));
}

function line(status, text) {
  return `${status} ${text}`;
}

let requiredMissing = 0;
const report = {
  skillRoot,
  projectRoot: cwd,
  groups: [],
  surfaces: [],
  result: "OK",
};

function print(text = "") {
  if (!jsonMode) console.log(text);
}

print("# design-pipeline self-check");
print("");
print(`Skill root: ${skillRoot}`);
print(`Project root: ${cwd}`);
print("");

print("## Skill groups");
for (const group of groups) {
  const skills = group.skills || [];
  const resources = group.resources || [];
  const installed = skills.filter(skillExists);
  const missingSkills = skills.filter((name) => !skillExists(name));
  const installedResources = resources.filter((name) => exists(path.join(skillRoot, name)));
  const missingResources = resources.filter((name) => !exists(path.join(skillRoot, name)));
  const missing = [...missingSkills, ...missingResources];
  const status = group.level === "required" && missing.length ? "FAIL" : missing.length ? "WARN" : "OK";
  if (group.level === "required") requiredMissing += missing.length;

  report.groups.push({
    name: group.name,
    level: group.level,
    status,
    installed,
    missing,
    installedResources,
    missingResources,
    fallback: missing.length ? group.fallback : undefined,
    install: missing.length ? group.install : undefined,
  });

  print("");
  print(`### ${group.name} (${group.level})`);
  print(line(status, `${installed.length}/${skills.length} skills installed`));
  if (installed.length) print(`Installed: ${installed.join(", ")}`);
  if (resources.length) {
    print(`Bundled resources: ${installedResources.length}/${resources.length} installed`);
  }
  if (missing.length) print(`Missing: ${missing.join(", ")}`);
  if (missing.length && group.fallback) print(`Fallback: ${group.fallback}`);
  if (missing.length && group.install) {
    print("Install hints:");
    for (const hint of group.install) print(`- ${hint}`);
  }
}

print("");
print("## Project surfaces");
for (const surface of surfaces) {
  const found = findSurface(surface);
  report.surfaces.push({
    name: surface.name,
    status: found.length ? "OK" : "INFO",
    found,
    fallback: found.length ? undefined : surface.fallback,
  });
  print("");
  print(`### ${surface.name}`);
  if (found.length) {
    print(line("OK", found.join(", ")));
  } else {
    print(line("INFO", "not detected"));
    print(`Fallback: ${surface.fallback}`);
  }
}

if (requiredMissing) {
  report.result = "FAIL";
  report.requiredMissing = requiredMissing;
  print("");
  print(`Result: FAIL (${requiredMissing} required item(s) missing)`);
  process.exitCode = 1;
} else {
  report.result = "OK";
  print("");
  print("Result: OK (missing optional/enhancement skills have fallbacks)");
}

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
}
