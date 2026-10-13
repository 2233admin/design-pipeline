use slabkit::{RenderOptions, Result, Slab};
use std::path::PathBuf;

#[derive(Debug)]
struct Args {
    video: PathBuf,
    project: PathBuf,
    wav: Option<PathBuf>,
    render: bool,
    stems: bool,
}
impl Args {
    fn parse() -> Result<Option<Self>> {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .to_path_buf();
        let mut args = Self {
            video: root.clone(),
            project: root.join("score/ff_tracking.slab"),
            wav: None,
            render: false,
            stems: false,
        };
        let mut tokens = std::env::args().skip(1);
        while let Some(token) = tokens.next() {
            match token.as_str() {
                "--render" => args.render = true,
                "--stems" => args.stems = true,
                "--video" | "--project" | "--wav" => {
                    let path =
                        PathBuf::from(tokens.next().ok_or_else(|| {
                            slabkit::Error::Invalid(format!("{token} needs a path"))
                        })?);
                    match token.as_str() {
                        "--video" => args.video = path,
                        "--project" => args.project = path,
                        _ => args.wav = Some(path),
                    }
                }
                "-h" | "--help" => {
                    println!(
                        "ff-tracking Slab score\n\nSLAB=/path/to/slab cargo run -p score -- [--video DIR] [--project DIR] [--render] [--wav FILE] [--stems]\n\nDefaults: this workspace's event exports and score/ff_tracking.slab; out/pass/score.wav.\nRendering writes the full reverb tail; tools/score.sh trims/fades for the picture."
                    );
                    return Ok(None);
                }
                _ => {
                    return Err(slabkit::Error::Invalid(format!(
                        "unknown argument {token}; use --help"
                    )));
                }
            }
        }
        Ok(Some(args))
    }
}
fn main() -> Result<()> {
    let Some(args) = Args::parse()? else {
        return Ok(());
    };
    let slab = Slab::from_env()?;
    let tracking = slabkit::video::Tracking::load(&args.video)?;
    let song = score::score(&tracking)?;
    let catalog = slab.describe()?;
    let document = score::project(&song, &catalog, &slab.roots, Some(&args.project))?;
    score::save_project(&document, &args.project)?;
    println!(
        "saved {}: {} tracks, {} notes",
        args.project.display(),
        song.tracks.len(),
        song.tracks
            .iter()
            .flat_map(|t| &t.clips)
            .map(|c| c.notes.len())
            .sum::<usize>()
    );
    if args.render {
        let wav = args
            .wav
            .unwrap_or_else(|| args.video.join("out/pass/score.wav"));
        let options = RenderOptions {
            stems: args.stems.then(|| wav.with_extension("stems")),
            ..Default::default()
        };
        let rendered = slab.render(&args.project, wav, &options)?;
        println!("{}", rendered.report);
    }
    Ok(())
}
