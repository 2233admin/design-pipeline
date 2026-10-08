"""Credential-free native integration check; these scores do not judge design quality."""
import json

objective = "Add the missing synthetic verification instructions from execution feedback."
background = "Preserve the seed instruction and add only the checks reported as missing."
dataset = [{"id": "train", "required": ["Check keyboard focus.", "Check reduced motion."]}]
valset = [{"id": "validation", "required": ["Check keyboard focus.", "Check reduced motion."]}]
test_set = [{"id": "heldout-sentinel", "required": ["Check keyboard focus.", "Check reduced motion."]}]


def evaluator(candidate, example):
    missing = [text for text in example["required"] if text not in candidate]
    score = 1.0 - len(missing) / len(example["required"])
    return score, {"Input": {"id": example["id"]}, "Generated Outputs": candidate,
                   "Feedback": {"missing_instructions": missing}, "scores": {"synthetic": score}}


def custom_candidate_proposer(candidate, reflective_dataset, components_to_update):
    assert "heldout-sentinel" not in json.dumps(reflective_dataset), "final test leaked into reflection"
    return {
        name: candidate[name].rstrip() + "\n" + "\n".join(dict.fromkeys(
            text for record in reflective_dataset[name] for text in record["Feedback"]["missing_instructions"]
        )) + "\n"
        for name in components_to_update
    }
