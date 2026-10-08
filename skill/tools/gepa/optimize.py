#!/usr/bin/env python3
"""Run the pinned native GEPA engine; export proposals without adopting them."""
import argparse
import contextlib
import difflib
import hashlib
from importlib import import_module, metadata, util
import json
import math
from pathlib import Path
import sys
import traceback
import types

sys.dont_write_bytecode = True


def digest(content):
    return hashlib.sha256(content).hexdigest()


def json_bytes(value):
    def check(item):
        if isinstance(item, dict):
            if not all(isinstance(key, str) for key in item):
                raise ValueError("fixtures must have string JSON keys")
            for child in item.values():
                check(child)
        elif isinstance(item, list):
            for child in item:
                check(child)
        elif type(item) not in (str, int, float, bool, type(None)):
            raise ValueError("fixtures must contain only JSON data")
    check(value)
    return json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False).encode("utf-8")


def inputs(seed, task_path, task):
    return {
        "seed": {"path": str(seed), "sha256": digest(seed.read_bytes())},
        "task": {"path": str(task_path), "sha256": digest(task_path.read_bytes())},
        "splits": {
            name: {"sha256": digest(json_bytes(getattr(task, name))),
                   "ids": [item["id"] for item in getattr(task, name)]}
            for name in ("dataset", "valset", "test_set")
        },
    }


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False, default=str) + "\n", encoding="utf-8")


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def positive_integer(value):
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("max-evals must be a positive integer")
    if number <= 0:
        raise argparse.ArgumentTypeError("max-evals must be a positive integer")
    return number


def load_runtime(skill_root):
    manifest = json.loads((skill_root / "vendor/gepa/manifest.json").read_text(encoding="utf-8-sig"))
    reviewed_revision = manifest["source"]["revision"]
    try:
        distribution = metadata.distribution("gepa")
    except metadata.PackageNotFoundError as error:
        raise ValueError("GEPA runtime unavailable; install tools/gepa/requirements.txt in a task-local environment") from error
    direct_url = distribution.read_text("direct_url.json")
    try:
        provenance = json.loads(direct_url) if direct_url else None
        vcs = provenance.get("vcs_info", {}) if isinstance(provenance, dict) else {}
        revision = vcs.get("commit_id") if isinstance(vcs, dict) else None
    except (TypeError, ValueError) as error:
        raise ValueError("GEPA runtime provenance is invalid; reinstall tools/gepa/requirements.txt") from error
    if not isinstance(vcs, dict) or vcs.get("vcs") != "git" or not revision:
        raise ValueError("GEPA runtime provenance unavailable; install the exact Git pin in tools/gepa/requirements.txt")
    if revision != reviewed_revision:
        raise ValueError(f"GEPA runtime revision {revision} does not match reviewed {reviewed_revision}; reinstall tools/gepa/requirements.txt")
    package_root = Path(distribution.locate_file("gepa")).resolve()
    spec = util.find_spec("gepa")
    if spec is None or spec.origin is None or not Path(spec.origin).resolve().is_relative_to(package_root):
        raise ValueError("GEPA import path does not belong to the pinned distribution")
    runtime = import_module("gepa.optimize_anything")
    if not Path(runtime.__file__).resolve().is_relative_to(package_root):
        raise ValueError("GEPA optimize_anything import path does not belong to the pinned distribution")
    return runtime, {"name": "gepa", "version": distribution.version, "revision": revision}


def run(args):
    seed = Path(args.seed).resolve()
    task_path = Path(args.task).resolve()
    output = Path(args.run_dir).absolute()
    if output.exists() or output.is_symlink():
        raise ValueError("run-dir must be a fresh directory; existing output is never overwritten")
    skill_root = Path(__file__).resolve().parents[2]
    if output.resolve().is_relative_to(skill_root):
        raise ValueError("run-dir must be outside the packaged skill")
    seed_bytes = seed.read_bytes()
    seed_text = seed_bytes.decode("utf-8-sig")
    if not seed_text.strip():
        raise ValueError("seed must be nonempty UTF-8 text")
    task_bytes = task_path.read_bytes()
    task = types.ModuleType("gepa_optimization_task")
    task.__file__ = str(task_path)
    sys.modules[task.__name__] = task
    sys.path.insert(0, str(task_path.parent))
    exec(compile(task_bytes, str(task_path), "exec"), task.__dict__)
    if seed.read_bytes() != seed_bytes or task_path.read_bytes() != task_bytes:
        raise ValueError("input drift while loading task")
    if not callable(getattr(task, "evaluator", None)):
        raise ValueError("task must supply a callable evaluator")
    if not isinstance(getattr(task, "objective", None), str) or not task.objective.strip():
        raise ValueError("task objective must be a nonempty string")
    background = getattr(task, "background", None)
    if background is not None and not isinstance(background, str):
        raise ValueError("task background must be a string when provided")
    ids = set()
    for name in ("dataset", "valset", "test_set"):
        split = getattr(task, name, None)
        if not isinstance(split, list) or not split:
            raise ValueError(f"{name} must be a nonempty JSON list")
        json_bytes(split)
        for item in split:
            case_id = item.get("id") if isinstance(item, dict) else None
            if not isinstance(case_id, str) or not case_id.strip():
                raise ValueError(f"{name} requires nonempty string ids")
            if case_id in ids:
                raise ValueError("fixture ids must be unique and disjoint across all splits")
            ids.add(case_id)
    lm = getattr(task, "reflection_lm", None)
    proposer = getattr(task, "custom_candidate_proposer", None)
    if (lm is None) == (proposer is None):
        raise ValueError("task must supply exactly one explicit reflection_lm or custom_candidate_proposer")
    if proposer is not None and not callable(proposer):
        raise ValueError("custom_candidate_proposer must be callable")
    if lm is not None and not (callable(lm) or isinstance(lm, str) and lm.strip()):
        raise ValueError("reflection_lm must be a callable or nonempty model string")
    before = inputs(seed, task_path, task)
    try:
        runtime, runtime_record = load_runtime(skill_root)
        OptimizeAnythingConfig, optimize_anything = runtime.OptimizeAnythingConfig, runtime.optimize_anything
    except ImportError as error:
        raise ValueError("GEPA runtime unavailable; install tools/gepa/requirements.txt in a task-local environment") from error

    failures = []

    def checked_evaluator(candidate, example):
        if failures:
            raise ValueError(f"evaluator already failed: {failures[0]}")
        try:
            scored = task.evaluator(candidate, example)
            if not isinstance(scored, tuple) or len(scored) != 2:
                raise ValueError("evaluator must return (score, side_info)")
            score, side_info = scored
            if type(score) not in (int, float) or not math.isfinite(score):
                raise ValueError("evaluator score must be a finite number, not bool")
            if not isinstance(side_info, dict):
                raise ValueError("evaluator side_info must be a dict")
            json.dumps(side_info, allow_nan=False, default=str)
            return score, side_info
        except Exception as error:
            failures.append(f"{type(error).__name__}: {error}")
            raise

    output.mkdir(parents=True)
    (output / "seed.md").write_bytes(seed_bytes)
    write_json(output / "inputs.json", before)
    report = {"status": "failed", "ComponentConformance": "not-evaluated",
              "VisualAcceptance": "not-evaluated", "max_evals": args.max_evals,
              "inputs_before": before, "runtime": runtime_record}
    try:
        with (output / "native.log").open("w", encoding="utf-8") as log:
            with contextlib.redirect_stdout(log), contextlib.redirect_stderr(log):
                result = optimize_anything(
                    seed_candidate=seed_text, evaluator=checked_evaluator,
                    dataset=task.dataset, valset=task.valset, test_set=task.test_set,
                    objective=task.objective, background=background,
                    config=OptimizeAnythingConfig(
                        engine="gepa", max_evals=args.max_evals, max_concurrency=1,
                        run_dir=str(output / "state"), output_dir=output / "evaluations",
                        engine_config={
                            "engine": {"seed": 0, "parallel": False, "use_cloudpickle": False,
                                       "cache_evaluation": False, "raise_on_exception": True,
                                       "write_agent_state": True},
                            "reflection": {"reflection_lm": lm, "custom_candidate_proposer": proposer},
                        },
                    ),
                )
        native_fields = {"native": result.to_dict(), "metadata": result.metadata, "eval_log": result.eval_log,
                         "total_evals": result.total_evals, "total_metric_calls": result.total_metric_calls}
        json.dumps(native_fields, allow_nan=False, default=str)
        report.update(native_fields)
        if failures:
            raise ValueError(f"evaluator failed: {failures[0]}")
        after = inputs(seed, task_path, task)
        report["inputs_after"] = after
        if before != after:
            raise ValueError("input drift: seed, task or frozen split changed during optimization")
        best = result.best_candidate
        if not isinstance(best, str) or not best.strip():
            raise ValueError("native GEPA did not return a nonempty text candidate")
        (output / "best-candidate.md").write_text(best, encoding="utf-8")
        diff = difflib.unified_diff(seed_text.splitlines(keepends=True), best.splitlines(keepends=True),
                                    fromfile="seed.md", tofile="best-candidate.md")
        (output / "candidate.diff").write_text("".join(diff), encoding="utf-8")
        report["status"] = "proposed"
    except BaseException as error:
        report["error"] = f"{type(error).__name__}: {error}"
        report["evaluator_errors"] = failures
        try:
            report["inputs_after"] = inputs(seed, task_path, task)
        except Exception as input_error:
            report["input_check_error"] = str(input_error)
        (output / "error.txt").write_text(traceback.format_exc(), encoding="utf-8")
        write_json(output / "result.json", report)
        raise
    write_json(output / "result.json", report)
    print(json.dumps({"status": "proposed", "run_dir": str(output), "best_score": result.best_score,
                      "test_score": result.metadata.get("test_score"), "total_evals": result.total_evals,
                      "ComponentConformance": "not-evaluated", "VisualAcceptance": "not-evaluated"}))


def main():
    parser = Parser(description=__doc__)
    parser.add_argument("--seed", required=True, help="read-only UTF-8 guidance file")
    parser.add_argument("--task", required=True, help="trusted Python evaluator/proposer module")
    parser.add_argument("--run-dir", required=True, help="fresh experiment output outside the skill")
    parser.add_argument("--max-evals", required=True, type=positive_integer, help="positive native search evaluation cap")
    try:
        run(parser.parse_args())
    except (Exception, KeyboardInterrupt) as error:
        print(f"GEPA optimization failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
