#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const jsonMode = args.has("--json");
const recordFeedbackMode = args.has("--record-feedback");

function optionValue(name) {
  const index = rawArgs.indexOf(name);
  if (index < 0) return undefined;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

const configuredSkillRoots =
  process.env.DESIGN_PIPELINE_SKILL_ROOTS || process.env.CODEX_SKILLS_DIR;
const skillRoots = configuredSkillRoots
  ? configuredSkillRoots.split(path.delimiter).filter(Boolean).map((root) => path.resolve(root))
  : [path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills")];
const skillRoot = skillRoots[0];

const cwd = process.cwd();
const registryPath = path.join(__dirname, "..", "references", "companion-capabilities.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
if (
  registry.schema !== "design-pipeline-companions.v1" ||
  !Array.isArray(registry.groups) ||
  !Array.isArray(registry.profiles) ||
  !Array.isArray(registry.surfaces)
) {
  throw new Error(`Invalid companion capability registry: ${registryPath}`);
}
const groups = registry.groups;
const capabilityProfiles = registry.profiles;
const surfaces = registry.surfaces;
const feedbackRoot = path.resolve(optionValue("--feedback-root") || cwd);

function exists(p) {
  return fs.existsSync(p);
}

function findSkill(name) {
  for (const root of skillRoots) {
    const skillPath = path.join(root, name, "SKILL.md");
    if (exists(skillPath)) return { root, path: skillPath };
  }
  return null;
}

function skillExists(name) {
  return Boolean(findSkill(name));
}

function resourceExists(name) {
  return skillRoots.some((root) => exists(path.join(root, name)));
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
  skillRoots,
  projectRoot: cwd,
  registry: {
    path: registryPath,
    schema: registry.schema,
    updatedAt: registry.updatedAt,
  },
  groups: [],
  capabilityProfiles: [],
  surfaces: [],
  result: "OK",
};

function print(text = "") {
  if (!jsonMode) console.log(text);
}

print("# design-pipeline self-check");
print("");
print(`Skill roots: ${skillRoots.join(", ")}`);
print(`Project root: ${cwd}`);
print(`Capability registry: ${registryPath}`);
print("");

print("## Skill groups");
for (const group of groups) {
  const skills = group.skills || [];
  const resources = group.resources || [];
  const installed = skills.filter(skillExists);
  const missingSkills = skills.filter((name) => !skillExists(name));
  const installedResources = resources.filter(resourceExists);
  const missingResources = resources.filter((name) => !resourceExists(name));
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
print("## Capability profiles");
for (const profile of capabilityProfiles) {
  const profileSkills = profile.skills || [profile.skill];
  const locations = new Map(
    profileSkills
      .map((skill) => [skill, findSkill(skill)])
      .filter(([, located]) => Boolean(located)),
  );
  const installedSkills = [...locations.keys()];
  if (!installedSkills.length) {
    const result = {
      id: profile.id,
      name: profile.name,
      ...(profile.skill ? { skill: profile.skill } : {}),
      skills: profileSkills,
      level: profile.level,
      status: "INFO",
      installed: false,
      installedSkills,
      source: profile.source,
      fallback: profile.fallback,
    };
    report.capabilityProfiles.push(result);
    print("");
    print(`### ${profile.name} (${profile.level})`);
    print(
      line(
        "INFO",
        `${profileSkills.join(", ")} not installed; capability markers were not evaluated.`,
      ),
    );
    print(`Fallback: ${profile.fallback}`);
    continue;
  }

  const texts = new Map(
    [...locations.entries()].map(([skill, located]) => [
      skill,
      fs.readFileSync(located.path, "utf8"),
    ]),
  );
  const missingMarkers = [];
  for (const requirement of profile.requirements || []) {
    const text = texts.get(requirement.skill);
    if (text === undefined) {
      missingMarkers.push(`${requirement.skill}:missing`);
      continue;
    }
    const matches = requirement.patterns.map(({ source, flags = "" }) =>
      new RegExp(source, flags).test(text),
    );
    const satisfied =
      requirement.match === "all" ? matches.every(Boolean) : matches.some(Boolean);
    if (!satisfied) missingMarkers.push(requirement.id);
  }
  const status = missingMarkers.length ? "WARN" : "OK";
  const checkedSkillPaths = Object.fromEntries(
    [...locations.entries()].map(([skill, located]) => [skill, located.path]),
  );
  report.capabilityProfiles.push({
    id: profile.id,
    name: profile.name,
    ...(profile.skill ? { skill: profile.skill } : {}),
    skills: profileSkills,
    level: profile.level,
    status,
    installed: true,
    installedSkills,
    ...(profile.skill && locations.get(profile.skill)
      ? { skillPath: locations.get(profile.skill).path }
      : {}),
    checkedSkillPaths,
    missingMarkers,
    source: profile.source,
    fallback: missingMarkers.length ? profile.fallback : undefined,
  });

  print("");
  print(`### ${profile.name} (${profile.level})`);
  print(
    line(
      status,
      `${installedSkills.join(", ")} capability markers checked across ${locations.size} skill(s)`,
    ),
  );
  if (missingMarkers.length) {
    print(`Missing capability markers: ${missingMarkers.join(", ")}`);
    print(`Fallback: ${profile.fallback}`);
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

if (recordFeedbackMode) {
  const { recordObservation } = require("./record-feedback.cjs");
  const recorded = [];
  for (const profile of report.capabilityProfiles.filter(
    (item) => item.status === "WARN",
  )) {
    const result = recordObservation({
      root: cwd,
      feedbackRoot,
      kind: "companion-gap",
      source: "self-check",
      severity: profile.level === "required" ? "high" : "medium",
      skill: profile.skill || profile.skills.join(","),
      title: `${profile.name}: ${profile.missingMarkers.join(", ")}`,
      summary: `The installed companion surface does not advertise every capability required by the ${profile.name} profile.`,
      evidence: [
        `Missing capability markers: ${profile.missingMarkers.join(", ")}`,
        `Capability source: ${profile.source}`,
      ],
      route: "issue",
    });
    recorded.push({
      id: result.observation.id,
      profileId: profile.id,
      draftPath: result.draftPath,
      created: result.created,
    });
  }
  report.feedback = {
    root: feedbackRoot,
    recorded,
    remotePublished: false,
  };
  print("");
  print(`Feedback recorded: ${recorded.length} local draft(s); remote publication not performed.`);
}

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
}
