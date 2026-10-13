mod arrangement;
mod python_random;
pub use arrangement::score;

use serde_json::Value;
use slabkit::{Catalog, Roots, Song};
use std::path::Path;

/// Keep Python's automation insertion order and serialized note precision.
/// These are part of the committed project even when they do not affect sound.
pub fn project(
    song: &Song,
    catalog: &Catalog,
    roots: &Roots,
    directory: Option<&Path>,
) -> slabkit::Result<Value> {
    let mut document = song.build(catalog, roots, directory)?;
    for track in document["tracks"].as_array_mut().unwrap() {
        let order: &[&str] = match track["name"].as_str().unwrap() {
            "MIX" => &[
                "fx0:era-mix",
                "fx0:era-bits",
                "fx0:era-rate",
                "fx0:era-filter",
            ],
            "ECHO" => &["fx0:delay-fb", "pan"],
            "HATS" => &["pan", "inst:hat-tone"],
            "KEYS" => &["pan", "fx0:char-lofi"],
            "REESE" => &[
                "fx1:sat-mode",
                "fx1:sat-drive",
                "fx1:sat-out",
                "inst:cn-f-cut",
                "fx2:char-mix",
                "fx2:char-lofi",
            ],
            "PAD" => &["inst:cn-f-cut", "pan", "fx3:char-mix"],
            "HUM" => &["pan", "volume"],
            "LOCK" => &["pan", "fx0:era-bits"],
            "RISER" => &["inst:cn-f-cut", "volume", "pan"],
            "FALL" => &["inst:cn-f-cut", "pan"],
            _ => &[],
        };
        if let Some(lanes) = track.get_mut("automation").and_then(Value::as_array_mut) {
            lanes.sort_by_key(|lane| {
                order
                    .iter()
                    .position(|target| lane["target"].as_str() == Some(target))
                    .unwrap_or(usize::MAX)
            });
        }
        for clip in track["clips"].as_array_mut().unwrap() {
            for note in clip["notes"].as_array_mut().unwrap() {
                for field in ["start", "len"] {
                    let value = note[field].as_f64().unwrap();
                    // Decimal formatting, like Python round(x,5), rounds the
                    // actual binary float rather than first scaling it by 1e5.
                    let value = if field == "len" {
                        value.max(0.01)
                    } else {
                        value
                    };
                    note[field] = serde_json::json!(format!("{value:.5}").parse::<f64>().unwrap());
                }
            }
        }
    }
    Ok(document)
}

pub fn save_project(document: &Value, directory: &Path) -> slabkit::Result<()> {
    if directory.is_file() {
        return Err(slabkit::Error::Invalid(
            "project destination is a bare file".into(),
        ));
    }
    std::fs::create_dir_all(directory)?;
    let temp = directory.join(format!(".rust-score-{}.json", std::process::id()));
    let result = (|| {
        std::fs::write(&temp, serde_json::to_vec_pretty(document)?)?;
        std::fs::rename(&temp, directory.join("project.json"))?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(temp);
    }
    result
}
