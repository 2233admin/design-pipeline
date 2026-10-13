//! The entire generated document must match the committed Python project.
//! Resource fixtures capture only the controls/preset data needed by this score,
//! so this test runs on any Rust platform without Slab, Python or a sound device.
use serde_json::Value;
use slabkit::{Catalog, Roots};
use std::{
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};
static NEXT: AtomicU64 = AtomicU64::new(1);
struct Fixture {
    directory: PathBuf,
    catalog: Catalog,
    roots: Roots,
}
impl Fixture {
    fn new() -> Self {
        let directory = std::env::temp_dir().join(format!(
            "ff-score-parity-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let resources: Value =
            serde_json::from_str(include_str!("fixtures/resources.json")).unwrap();
        for (key, preset) in resources["presets"].as_object().unwrap() {
            let (machine, name) = key.split_once('/').unwrap();
            let path = directory
                .join("machines")
                .join(machine)
                .join("presets")
                .join(format!("{name}.preset"));
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, serde_json::to_vec(preset).unwrap()).unwrap();
        }
        let catalog =
            Catalog::from_json(&serde_json::to_vec(&resources["catalog"]).unwrap()).unwrap();
        let roots = Roots {
            factory: directory.clone(),
            home: directory.join("home"),
            library: directory.join("home/Library"),
        };
        Self {
            directory,
            catalog,
            roots,
        }
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}
fn equal(actual: &Value, expected: &Value, path: &str) {
    match (actual, expected) {
        (Value::Number(a), Value::Number(e)) => assert_eq!(a.as_f64(), e.as_f64(), "{path}"),
        (Value::Object(a), Value::Object(e)) => {
            assert_eq!(
                a.keys().collect::<Vec<_>>(),
                e.keys().collect::<Vec<_>>(),
                "{path}"
            );
            for (key, v) in a {
                equal(v, &e[key], &format!("{path}/{key}"));
            }
        }
        (Value::Array(a), Value::Array(e)) => {
            assert_eq!(a.len(), e.len(), "{path}");
            for (i, (a, e)) in a.iter().zip(e).enumerate() {
                equal(a, e, &format!("{path}/{i}"));
            }
        }
        _ => assert_eq!(actual, expected, "{path}"),
    }
}
#[test]
fn reproduces_every_field_of_the_python_project() {
    let fixture = Fixture::new();
    let tracking = slabkit::video::Tracking::from_json(
        include_bytes!("fixtures/tracks.json"),
        include_bytes!("fixtures/camera.json"),
    )
    .unwrap();
    let song = score::score(&tracking).unwrap();
    let project = score::project(&song, &fixture.catalog, &fixture.roots, None).unwrap();
    let expected: Value =
        serde_json::from_str(include_str!("../ff_tracking.slab/project.json")).unwrap();
    equal(&project, &expected, "");
    assert_eq!(song.tracks.len(), 17);
    assert_eq!(
        song.tracks
            .iter()
            .flat_map(|t| &t.clips)
            .map(|c| c.notes.len())
            .sum::<usize>(),
        249
    );
}
#[test]
fn camera_and_event_changes_drive_the_rust_score() {
    let tracking = slabkit::video::Tracking::from_json(
        include_bytes!("fixtures/tracks.json"),
        include_bytes!("fixtures/camera.json"),
    )
    .unwrap();
    let original = score::score(&tracking).unwrap();
    let mut changed = tracking.clone();
    changed.events.keys[0] += 0.01;
    changed.camera.frames[0].focus_screen[0] += 240.;
    changed.camera.frames[0].centre_screen[0] -= 120.;
    let changed = score::score(&changed).unwrap();
    let a = original.tracks.iter().find(|t| t.name == "KEYS").unwrap();
    let b = changed.tracks.iter().find(|t| t.name == "KEYS").unwrap();
    assert_eq!(b.clips[0].notes[0].start, a.clips[0].notes[0].start + 0.02);
    assert_ne!(a.automation["pan"], b.automation["pan"]);
    assert_ne!(
        original.tracks[2].automation["pan"],
        changed.tracks[2].automation["pan"]
    );
}
