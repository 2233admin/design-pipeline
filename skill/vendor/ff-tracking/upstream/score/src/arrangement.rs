//! Rust port of nooga’s ff-tracking Slab score. MIT, Marcin Gasperowicz (2026).
use crate::python_random::PythonRandom;
use slabkit::video::Tracking;
use slabkit::{Clip, Effect, Instrument, Point, Result, Song, Track, TrackId};
pub fn score(t: &Tracking) -> Result<Song> {
    if t.events.cuts.len() != 12 || t.events.locks.len() < 12 || t.camera.frames.len() < 12 {
        return Err(slabkit::Error::Invalid(
            "this arrangement expects ff-tracking’s twelve-shot score".into(),
        ));
    }
    let mut song = Song::new("FF Tracking", 120., "F minor")?;
    for name in ["BOOT", "TRACE", "LOCK", "TAIL"] {
        song.section(name, 1.)?;
    }
    let mut track = Track::bus("MIX");
    track.effects = vec![
        Effect::new("era")
            .preset("sp1200")
            .param("mix", 0.0)
            .param("out", -1.5),
    ];
    let mix = song.add_track(track)?;
    let mut track = Track::bus("VERB");
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("verb2")
            .preset("big-plate-hall")
            .param("mix", 1.0)
            .param("decay", 2.6)
            .param("predelay", 0.012)
            .param("lowcut", 380.0)
            .param("tone", 9000.0)
            .param("damp", 6000.0)
            .param("width", 1.5),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 320.0)
            .param("p1_hz", 600.0)
            .param("p1_db", -2.0)
            .param("hs_hz", 9000.0)
            .param("hs_db", -3.0),
    ];
    let verb = song.add_track(track)?;
    let mut track = Track::bus("ECHO");
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("delay2")
            .param("sync", "SYNC")
            .param("div", "1/16")
            .param("mode", "PING")
            .param("fb", 0.35)
            .param("lowcut", 700.0)
            .param("damp", 6500.0)
            .param("char", "DIGITAL")
            .param("mix", 1.0)
            .param("width", 1.4),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 500.0)
            .param("p2_hz", 3000.0)
            .param("p2_db", -2.0)
            .param("hs_hz", 7000.0)
            .param("hs_db", -4.0),
    ];
    let echo = song.add_track(track)?;
    let mut track = Track::bus("DRUM BUS");
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 30.0),
        Effect::new("sat2")
            .preset("tape-slam")
            .param("drive", 11.0)
            .param("mix", 0.5)
            .param("out", -2.5),
        Effect::new("bus2")
            .preset("drum-bus")
            .param("thresh", -18.0)
            .param("makeup", 2.0)
            .param("color", 0.3)
            .param("mix", 0.8),
    ];
    let drums = song.add_track(track)?;
    let mut track = Track::new(
        "KICK",
        Instrument::new("drum2")
            .preset("909-punch")
            .param("kick_tune", 53.0)
            .param("kick_sweep", 10.0)
            .param("kick_bend", 0.03)
            .param("kick_decay", 0.28)
            .param("kick_click", 0.55)
            .param("kick_drive", 3.2)
            .param("kick_level", 1.0)
            .param("master_drive", 1.3),
    );
    track.volume = 0.7;
    track.output = Some(drums);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 30.0)
            .param("p1_hz", 330.0)
            .param("p1_db", -4.0)
            .param("p1_q", 0.8)
            .param("p2_hz", 3500.0)
            .param("p2_db", 2.0),
    ];
    let kick = song.add_track(track)?;
    let mut track = Track::new(
        "BOOM",
        Instrument::new("drum2")
            .preset("808-boom")
            .param("kick_tune", 43.65)
            .param("kick_sweep", 12.0)
            .param("kick_bend", 0.06)
            .param("kick_decay", 1.6)
            .param("kick_click", 0.4)
            .param("kick_drive", 4.5)
            .param("kick_level", 1.0)
            .param("master_drive", 1.6),
    );
    track.volume = 0.75;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 30.0)
            .param("p1_hz", 900.0)
            .param("p1_db", 3.0)
            .param("p1_q", 0.7)
            .param("hs_hz", 6000.0)
            .param("hs_db", -3.0),
        Effect::new("sat2")
            .preset("iron-bass")
            .param("drive", 10.0)
            .param("mix", 0.5)
            .param("out", -2.0),
    ];
    let boom = song.add_track(track)?;
    let mut track = Track::new(
        "CLAP",
        Instrument::new("drum2")
            .preset("gated-snare-kit")
            .param("snare_tune", 210.0)
            .param("snare_decay", 0.16)
            .param("snare_snap", 0.9)
            .param("snare_tone", 3200.0)
            .param("clap_level", 0.8)
            .param("clap_tone", 1400.0)
            .param("clap_decay", 0.2)
            .param("master_drive", 2.2),
    );
    track.volume = 0.85;
    track.output = Some(drums);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 180.0)
            .param("p1_hz", 500.0)
            .param("p1_db", -3.0)
            .param("p2_hz", 2200.0)
            .param("p2_db", 2.0)
            .param("hs_hz", 9000.0)
            .param("hs_db", -4.0),
        Effect::new("char2").preset("smush-1200").param("mix", 0.35),
    ];
    let clap = song.add_track(track)?;
    let mut track = Track::new(
        "HATS",
        Instrument::new("drum2")
            .preset("crisp-hat-kit")
            .param("hat_tone", 0.8)
            .param("hat_tune", 1.2)
            .param("hat_chdec", 0.03)
            .param("hat_ohdec", 0.16)
            .param("hat_level", 1.1),
    );
    track.volume = 1.2;
    track.output = Some(drums);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 900.0)
            .param("p2_hz", 6000.0)
            .param("p2_db", -2.0)
            .param("hs_hz", 9000.0)
            .param("hs_db", -5.0),
    ];
    let hats = song.add_track(track)?;
    let mut track = Track::new(
        "KEYS",
        Instrument::new("drum2")
            .preset("lofi-kit")
            .param("hat_tune", 1.6)
            .param("hat_tone", 1.4)
            .param("hat_chdec", 0.02)
            .param("snare_tune", 420.0)
            .param("snare_decay", 0.05)
            .param("snare_sdec", 0.03)
            .param("snare_snap", 1.0)
            .param("snare_tone", 5000.0)
            .param("master_drive", 2.5),
    );
    track.volume = 1.2;
    track.output = Some(drums);
    track.effects = vec![
        Effect::new("char2")
            .preset("smush-1200")
            .param("ltype", "80s")
            .param("lofi", 0.85)
            .param("noise", 0.0)
            .param("mix", 1.0)
            .param("makeup", 0.0),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 1000.0)
            .param("p2_hz", 4000.0)
            .param("p2_db", -2.0)
            .param("hs_hz", 10000.0)
            .param("hs_db", -6.0),
        Effect::new("comp2")
            .param("thresh", -24.0)
            .param("ratio", 10.0)
            .param("atk", 0.0002)
            .param("rel", 0.04)
            .param("makeup", 9.0),
    ];
    let ticks = song.add_track(track)?;
    let mut track = Track::new(
        "GLITCH",
        Instrument::new("concoction")
            .preset("noise-sweep")
            .param("n_level", 1.0)
            .param("n_color", 0.3)
            .param("f_mode", "BP")
            .param("f_cut", 2400.0)
            .param("f_res", 0.55)
            .param("f_key", 1.0)
            .param("e1_a", 0.0005)
            .param("e1_d", 0.07)
            .param("e1_s", 0.0)
            .param("e1_r", 0.02)
            .param("e3_a", 0.0005)
            .param("e3_d", 0.1)
            .param("e3_s", 0.0)
            .param("m1_src", "OFF")
            .param("l1_shape", "S&H")
            .param("l1_sync", "1/32")
            .param("l1_mode", "RETRIG")
            .param("m2_src", "LFO1")
            .param("m2_dst", "CUTOFF")
            .param("m2_amt", 0.8)
            .param("level", 0.8),
    );
    track.volume = 1.25;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("char2")
            .preset("smush-1200")
            .param("ltype", "80s")
            .param("lofi", 1.0)
            .param("noise", 0.0)
            .param("mix", 1.0)
            .param("makeup", 6.0),
        Effect::new("sat2")
            .preset("fold-wreck")
            .param("drive", 18.0)
            .param("mix", 0.5)
            .param("out", -1.0),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 500.0)
            .param("p2_hz", 3200.0)
            .param("p2_db", -3.0)
            .param("hs_hz", 11000.0)
            .param("hs_db", -4.0),
    ];
    let glitch = song.add_track(track)?;
    let mut track = Track::new(
        "REESE",
        Instrument::new("concoction")
            .preset("reese")
            .param("sub_on", "ON")
            .param("sub_shape", "SINE")
            .param("sub_oct", -1.0)
            .param("sub_level", 0.3)
            .param("a_pos", 0.6667)
            .param("b_pos", 0.6667)
            .param("a_fine", -18.0)
            .param("b_fine", 18.0)
            .param("f_mode", "LP24")
            .param("f_cut", 420.0)
            .param("f_res", 0.4)
            .param("f_drive", 0.9)
            .param("f_env", 0.45)
            .param("e2_a", 0.0005)
            .param("e2_d", 0.11)
            .param("e2_s", 0.1)
            .param("e2_r", 0.05)
            .param("e1_a", 0.002)
            .param("e1_d", 0.2)
            .param("e1_s", 0.7)
            .param("e1_r", 0.04)
            .param("level", 0.7),
    );
    track.volume = 0.8;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 32.0)
            .param("ls_hz", 80.0)
            .param("ls_db", -5.0)
            .param("p1_hz", 850.0)
            .param("p1_db", 6.0)
            .param("p1_q", 0.7)
            .param("p2_hz", 2500.0)
            .param("p2_db", 2.0)
            .param("hs_hz", 6000.0)
            .param("hs_db", -6.0),
        Effect::new("sat2")
            .preset("iron-bass")
            .param("drive", 16.0)
            .param("mix", 0.75)
            .param("out", 0.0),
        Effect::new("char2")
            .preset("smush-1200")
            .param("ltype", "90s")
            .param("lofi", 0.5)
            .param("noise", 0.0)
            .param("mix", 0.0),
        Effect::new("comp2")
            .sidechain(kick)
            .param("thresh", -26.0)
            .param("ratio", 6.0)
            .param("knee", 4.0)
            .param("atk", 0.001)
            .param("rel", 0.11),
        Effect::new("geq8")
            .preset("flat")
            .param("t1", "LC48")
            .param("f1", 30.0)
            .param("t5", "BELL")
            .param("f5", 1200.0)
            .param("b5", 2.0)
            .param("q5", 0.8)
            .param("t8", "HC12")
            .param("f8", 6500.0),
    ];
    let bass = song.add_track(track)?;
    let mut track = Track::new(
        "PAD",
        Instrument::new("concoction")
            .preset("vowel-pad")
            .param("e1_a", 0.25)
            .param("e1_r", 0.6)
            .param("f_mode", "LP24")
            .param("f_cut", 600.0)
            .param("f_res", 0.25)
            .param("level", 1.0),
    );
    track.volume = 1.25;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 180.0)
            .param("p1_hz", 400.0)
            .param("p1_db", -3.0)
            .param("hs_hz", 10000.0)
            .param("hs_db", -2.0),
        Effect::new("tape2")
            .preset("vhs-rental")
            .param("wear", 0.4)
            .param("hiss", 0.15)
            .param("mix", 0.7),
        Effect::new("chorus2")
            .preset("juno-ii-deep")
            .param("mix", 0.6),
        Effect::new("char2")
            .preset("smush-1200")
            .param("ltype", "80s")
            .param("lofi", 0.7)
            .param("noise", 0.0)
            .param("mix", 0.0),
        Effect::new("comp2")
            .sidechain(kick)
            .param("thresh", -30.0)
            .param("ratio", 8.0)
            .param("atk", 0.002)
            .param("rel", 0.16),
    ];
    let pad = song.add_track(track)?;
    let mut track = Track::new(
        "HUM",
        Instrument::new("concoction")
            .param("a_table", "DRIVE")
            .param("a_pos", 0.7)
            .param("b_on", "ON")
            .param("b_table", "BASIC")
            .param("b_pos", 0.3)
            .param("b_oct", 1.0)
            .param("b_fine", 7.0)
            .param("b_level", 0.35)
            .param("f_mode", "LP12")
            .param("f_cut", 700.0)
            .param("f_res", 0.35)
            .param("e1_a", 0.15)
            .param("e1_s", 1.0)
            .param("e1_r", 0.4)
            .param("l1_shape", "SINE")
            .param("l1_rate", 0.35)
            .param("l1_mode", "FREE")
            .param("m1_src", "LFO1")
            .param("m1_dst", "CUTOFF")
            .param("m1_amt", 0.35)
            .param("l2_shape", "SINE")
            .param("l2_rate", 5.5)
            .param("l2_mode", "FREE")
            .param("m2_src", "LFO2")
            .param("m2_dst", "A LVL")
            .param("m2_amt", 0.12)
            .param("level", 0.8),
    );
    track.volume = 0.55;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("tape2")
            .preset("chewed")
            .param("hum", 0.5)
            .param("hiss", 0.25)
            .param("drops", 0.35)
            .param("wow", 0.75)
            .param("flutter", 0.5)
            .param("mix", 1.0),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 100.0)
            .param("p1_hz", 300.0)
            .param("p1_db", -2.0)
            .param("p2_hz", 1800.0)
            .param("p2_db", 1.5)
            .param("hs_hz", 7000.0)
            .param("hs_db", -6.0),
        Effect::new("chorus2").preset("wide-slow").param("mix", 0.5),
        Effect::new("comp2")
            .sidechain(kick)
            .param("thresh", -30.0)
            .param("ratio", 4.0)
            .param("atk", 0.002)
            .param("rel", 0.2),
    ];
    let hum = song.add_track(track)?;
    let mut track = Track::new(
        "LOCK",
        Instrument::new("concoction")
            .param("a_table", "PWM")
            .param("a_pos", 0.35)
            .param("b_on", "ON")
            .param("b_table", "FM")
            .param("b_pos", 0.45)
            .param("b_oct", -1.0)
            .param("b_level", 0.5)
            .param("f_mode", "LP12")
            .param("f_cut", 1800.0)
            .param("f_res", 0.45)
            .param("f_env", 0.5)
            .param("e2_a", 0.0005)
            .param("e2_d", 0.05)
            .param("e2_s", 0.0)
            .param("p_amt", 12.0)
            .param("p_time", 0.012)
            .param("e1_a", 0.0005)
            .param("e1_d", 0.08)
            .param("e1_s", 0.0)
            .param("e1_r", 0.03)
            .param("level", 1.0),
    );
    track.volume = 1.0;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("era")
            .preset("sp1200")
            .param("bits", 7.0)
            .param("rate", 14000.0)
            .param("filter", 9000.0)
            .param("mix", 1.0),
        Effect::new("sat2")
            .preset("diode-drive")
            .param("drive", 14.0)
            .param("mix", 0.6)
            .param("out", 3.0),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 220.0)
            .param("p1_hz", 500.0)
            .param("p1_db", -2.0)
            .param("p2_hz", 2500.0)
            .param("p2_db", 2.0)
            .param("hs_hz", 9000.0)
            .param("hs_db", -4.0),
    ];
    let blip = song.add_track(track)?;
    let mut track = Track::new(
        "RISER",
        Instrument::new("concoction")
            .preset("noise-sweep")
            .param("e3_a", 2.5)
            .param("f_res", 0.7)
            .param("e1_a", 0.3)
            .param("e1_r", 0.3),
    );
    track.volume = 0.5;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("sat2")
            .preset("fold-buzz")
            .param("drive", 6.0)
            .param("mix", 0.25)
            .param("out", -2.0),
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 350.0)
            .param("p2_hz", 4000.0)
            .param("p2_db", -2.0)
            .param("hs_hz", 12000.0)
            .param("hs_db", -3.0),
    ];
    let riser = song.add_track(track)?;
    let mut track = Track::new(
        "FALL",
        Instrument::new("concoction")
            .preset("noise-sweep")
            .param("e1_a", 0.001)
            .param("e1_d", 1.2)
            .param("e1_s", 0.0)
            .param("e1_r", 0.4)
            .param("m1_src", "OFF")
            .param("f_mode", "BP")
            .param("f_cut", 8000.0)
            .param("f_res", 0.5)
            .param("e3_a", 0.0005),
    );
    track.volume = 0.45;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 200.0)
            .param("hs_hz", 12000.0)
            .param("hs_db", -3.0),
    ];
    let fall = song.add_track(track)?;
    let mut track = Track::new("DONE", Instrument::new("fm86").preset("slab/bells"));
    track.volume = 1.15;
    track.output = Some(mix);
    track.effects = vec![
        Effect::new("eq2")
            .param("hpf_on", "ON")
            .param("hpf_hz", 500.0)
            .param("p2_hz", 2800.0)
            .param("p2_db", -2.0)
            .param("hs_hz", 12000.0)
            .param("hs_db", 1.5),
        Effect::new("chorus2").preset("bell-widener"),
    ];
    let chime = song.add_track(track)?;
    song.master_subsonic = true;
    song.master_effects = vec![
        Effect::new("geq8")
            .preset("flat")
            .param("t1", "LC48")
            .param("f1", 30.0)
            .param("t2", "BELL")
            .param("f2", 250.0)
            .param("b2", -1.5)
            .param("q2", 0.8)
            .param("t8", "HSHLF")
            .param("f8", 12000.0)
            .param("b8", 1.5),
        Effect::new("bus2")
            .preset("mix-glue")
            .param("thresh", -16.0)
            .param("makeup", 2.0)
            .param("color", 0.25),
        Effect::new("sat2")
            .preset("tape-glue")
            .param("drive", 7.0)
            .param("mix", 0.35)
            .param("out", -1.5),
        Effect::new("limiter2")
            .param("gain", 5.5)
            .param("ceil", -2.2),
    ];
    let b = 2.;
    let fps = t.events.fps as f64;
    let nf = t.camera.frames.len();
    let shot = nf / 12;
    let collapse = t.events.collapse * b;
    let done = t.events.done * b;
    let cuts: Vec<_> = t.events.cuts.iter().map(|s| s * b).collect();
    let locks: Vec<_> = t.events.locks.iter().map(|s| s * b).collect();
    for id in [
        kick, boom, clap, hats, ticks, glitch, bass, pad, hum, blip, riser, fall, chime,
    ] {
        song.track_mut(id)?.add_clip(Clip::new("SCORE", 0., 16.))?;
    }
    song.track_mut(mix)?.automate(
        "fx0:mix",
        [
            Point::hold(0., 0.),
            Point::hold(7., 1.),
            Point::hold(8., 0.),
        ],
    )?;
    song.track_mut(mix)?.automate(
        "fx0:bits",
        [
            Point::hold(0., 12.),
            Point::curve(7., 6., -0.4),
            Point::hold(7.95, 3.),
            Point::hold(8., 12.),
        ],
    )?;
    song.track_mut(mix)?.automate(
        "fx0:rate",
        [
            Point::hold(0., 26040.),
            Point::curve(7., 11000., -0.4),
            Point::hold(7.95, 3500.),
            Point::hold(8., 26040.),
        ],
    )?;
    song.track_mut(mix)?.automate(
        "fx0:filter",
        [
            Point::hold(0., 11000.),
            Point::new(7., 6000.),
            Point::hold(7.95, 2500.),
            Point::hold(8., 11000.),
        ],
    )?;
    song.track_mut(verb)?.automate(
        "volume",
        [
            Point::new(0., 0.8),
            Point::new(collapse, 1.),
            Point::new(done, 1.2),
        ],
    )?;
    song.track_mut(echo)?.automate(
        "fx0:fb",
        [
            Point::new(0., 0.3),
            Point::new(collapse, 0.62),
            Point::hold(done, 0.25),
        ],
    )?;
    song.track_mut(echo)?.automate(
        "pan",
        lane(t, 0, nf, 2, false, |g| {
            Ok((-t.screen_pan(g, 1920.)? * 0.5).clamp(-0.5, 0.5))
        })?,
    )?;
    for beat in &cuts[1..10] {
        clip(&mut song, kick)?.note(
            "C2",
            *beat,
            0.2,
            if [1., 5., 9.].contains(beat) {
                124
            } else {
                112
            },
        )?;
    }
    for i in 0..8 {
        clip(&mut song, kick)?.note("C2", collapse + i as f64 * 0.125, 0.1, 70 + i * 7)?;
    }
    song.track_mut(kick)?.automate(
        "kick_tune",
        [
            Point::hold(0., 53.),
            Point::new(collapse, 70.),
            Point::hold(done - 0.05, 40.),
        ],
    )?;
    clip(&mut song, boom)?
        .note("C2", 0., 1., 70)?
        .note("C2", done, 2., 127)?;
    song.track_mut(boom)?.automate(
        "kick_decay",
        [Point::hold(0., 0.45), Point::hold(done - 0.25, 1.4)],
    )?;
    for beat in [3., 5., 7., 9.] {
        clip(&mut song, clap)?
            .note("D2", beat, 0.2, 118)?
            .note("D#2", beat, 0.2, 100)?;
    }
    clip(&mut song, clap)?.note("D2", 8.75, 0.1, 70)?;
    song.track_mut(clap)?.send(verb, -11., false)?;
    song.track_mut(clap)?
        .automate("fx1:mix", [Point::new(0., 0.2), Point::new(collapse, 0.6)])?;
    for i in 4..40 {
        clip(&mut song, hats)?.note(
            "F#2",
            i as f64 * 0.25,
            0.05,
            if i % 4 == 2 { 92 } else { 58 + (i % 2) * 10 },
        )?;
    }
    for beat in [5.5, 6.5, 7.5, 8.5, 9.5] {
        clip(&mut song, hats)?.note("A#2", beat, 0.2, 84)?;
    }
    song.track_mut(hats)?.automate(
        "pan",
        (4..40)
            .map(|i| {
                let g = (i as f64 * 0.25 / b * fps).round_ties_even() as usize;
                Ok(Point::hold(
                    i as f64 * 0.25 - 0.01,
                    ((if i % 2 == 0 { -0.45 } else { 0.45 }) - t.screen_pan(g, 1920.)? * 0.3)
                        .clamp(-0.8, 0.8),
                ))
            })
            .collect::<Result<Vec<_>>>()?,
    )?;
    song.track_mut(hats)?.automate(
        "hat_tone",
        lane(t, shot, 10 * shot, 2, false, |g| {
            Ok((0.75 + (push(t, g, shot) - 1.) * 0.9).clamp(0.6, 1.4))
        })?,
    )?;
    // Preserve Python’s integer seeding and rejection sampling, including
    // consumption of the shared tick/glitch random stream.
    let mut rng = PythonRandom::new(4812);
    for (i, seconds) in t.events.keys.iter().enumerate() {
        clip(&mut song, ticks)?.note(
            if i % 3 == 0 { "D2" } else { "F#2" },
            seconds * b,
            0.04,
            70 + rng.below(41) as i32,
        )?;
    }
    song.track_mut(ticks)?.send(echo, -20., false)?;
    song.track_mut(ticks)?.automate(
        "pan",
        lane(t, 0, nf, 1, false, |g| {
            Ok((t.box_pan(g, 1920.)? * 1.6).clamp(-0.85, 0.85))
        })?,
    )?;
    song.track_mut(ticks)?
        .automate("fx0:lofi", [Point::new(0., 0.6), Point::new(collapse, 1.)])?;
    for (i, beat) in cuts[..10].iter().enumerate() {
        clip(&mut song, glitch)?.note(
            ["F5", "C6", "Ab5", "Eb6"][rng.below(4) as usize],
            *beat,
            0.15,
            if i == 0 { 124 } else { 112 },
        )?;
    }
    let (mut bt, mut step, mut p) = (collapse, 0.125, 72);
    while bt < done - 0.02 {
        clip(&mut song, glitch)?.note(
            p,
            bt,
            step * 0.7,
            (96 + (40. * (bt - collapse)) as i32).min(127),
        )?;
        bt += step;
        step = (step * 0.9).max(0.0625);
        p += 1;
    }
    song.track_mut(glitch)?.send(echo, -12., false)?;
    let mut pans = vec![];
    for beat in &cuts[..10] {
        let g = ((*beat / b * fps).round_ties_even() as usize + 1).min(nf - 1);
        pans.push(Point::hold(
            (beat - 0.02).max(0.),
            (-t.screen_pan(g, 1920.)? * 1.2).clamp(-0.85, 0.85),
        ));
    }
    pans.extend(
        (0..16).map(|i| Point::hold(collapse + i as f64 / 16., 0.75 * (i as f64 * 1.9).sin())),
    );
    song.track_mut(glitch)?.automate("pan", pans)?;
    let grit = [
        (1., "TUBE", 20., 0.),
        (2., "TAPE", 24., -3.),
        (3., "XFMR", 26., 3.),
        (4., "DIODE", 18., 2.),
        (5., "FUZZ", 16., -5.),
        (6., "RAIL", 22., -4.),
        (7., "VALVE", 28., -5.5),
        (8., "FOLD", 14., 1.),
        (9., "FUZZ", 26., -6.),
        (10., "FOLD", 32., -2.),
        (11., "TUBE", 12., 0.),
    ];
    song.track_mut(bass)?.automate(
        "fx1:mode",
        grit.iter().map(|(b, m, _, _)| Point::hold(*b, *m)),
    )?;
    song.track_mut(bass)?.automate(
        "fx1:drive",
        grit.iter().map(|(b, _, d, _)| Point::hold(*b, *d)),
    )?;
    song.track_mut(bass)?.automate(
        "fx1:out",
        grit.iter().map(|(b, _, _, o)| Point::hold(*b, *o)),
    )?;
    for (i, root) in ["F1", "F1", "F1", "F1", "Db1", "Db1", "Eb1", "Eb1", "C1"]
        .iter()
        .enumerate()
    {
        let beat = i + 1;
        for (j, off) in [0.25, 0.5, 0.75].into_iter().enumerate() {
            let pitch = slabkit::note(root)?
                + if [4, 8].contains(&beat) && j == 2 {
                    12
                } else {
                    0
                };
            clip(&mut song, bass)?.note(
                pitch,
                beat as f64 + off,
                0.2,
                if j == 0 { 112 } else { 96 },
            )?;
        }
    }
    let bc = clip(&mut song, bass)?;
    bc.note("C2", collapse, done - collapse, 118)?;
    bc.bend(
        "pitch",
        &[Point::new(0., 0.), Point::curve(0.95, -24., 0.5)],
        |n| n.start == collapse,
    )?;
    bc.note("F1", done, 1., 120)?;
    song.track_mut(bass)?.automate(
        "f_cut",
        lane(t, 0, nf, 1, false, |g| {
            let beat = g as f64 / fps * b;
            Ok(if beat >= done {
                260.
            } else if beat >= collapse {
                2600. * (180f64 / 2600.).powf(((beat - collapse) / (done - collapse)).powf(0.7))
            } else {
                (520.
                    * (2400f64 / 520.).powf(((beat - 1.) / 8.).clamp(0., 1.).powf(1.4))
                    * push(t, g, shot).powf(1.6))
                .clamp(200., 6000.)
            })
        })?,
    )?;
    let mut tears = lane(t, 0, 10 * shot, 1, true, |g| {
        Ok(if t.camera.frames[g].lock { 0.7 } else { 0. })
    })?;
    tears.extend([
        Point::new(collapse, 0.),
        Point::hold(collapse + 0.6, 1.),
        Point::hold(done, 0.),
    ]);
    song.track_mut(bass)?.automate("fx2:mix", tears)?;
    song.track_mut(bass)?.automate(
        "fx2:lofi",
        [
            Point::hold(0., 0.5),
            Point::new(collapse, 0.3),
            Point::hold(done - 0.05, 1.),
            Point::hold(done, 0.4),
        ],
    )?;
    let pc = clip(&mut song, pad)?;
    pc.chord(["F3", "Ab3", "C4", "Eb4", "G4"], 0., 5., 84, 0.)?;
    pc.chord(["Db3", "F3", "Ab3", "C4", "G4"], 5., 2., 84, 0.)?;
    pc.chord(["Eb3", "G3", "Bb3", "C4", "F4"], 7., 2., 84, 0.)?;
    pc.chord(["C3", "E3", "G3", "Bb3", "Db4"], 9., 1., 88, 0.)?;
    pc.chord(
        ["C3", "E3", "G3", "Bb3", "Db4"],
        collapse,
        done - collapse,
        84,
        0.,
    )?;
    pc.converge("C2", collapse, done, 0.4)?;
    pc.chord(["F3", "C4", "Eb4", "G4", "Ab4"], done, 1.5, 100, 0.)?;
    song.track_mut(pad)?
        .ramp("f_cut", 0., 10., 500., 3600., -0.5)?;
    song.track_mut(pad)?.automate(
        "pan",
        lane(t, 0, nf, 2, false, |g| {
            Ok((t.screen_pan(g, 1920.)? * 0.55).clamp(-0.6, 0.6))
        })?,
    )?;
    song.track_mut(pad)?.automate(
        "fx3:mix",
        lane(t, 0, nf, 1, true, |g| {
            Ok(if t.camera.frames[g].lock { 0.6 } else { 0. })
        })?,
    )?;
    song.track_mut(pad)?.send(verb, -5., false)?;
    clip(&mut song, hum)?
        .note("F2", 0., done + 0.5, 90)?
        .note("C3", 0., done + 0.5, 60)?;
    song.track_mut(hum)?.automate(
        "pan",
        lane(t, 0, nf, 3, false, |g| {
            Ok((t.screen_pan(g, 1920.)? * 0.4).clamp(-0.4, 0.4))
        })?,
    )?;
    song.track_mut(hum)?.automate(
        "volume",
        [
            Point::new(0., 0.35),
            Point::new(1., 0.55),
            Point::new(collapse, 0.55),
            Point::new(done - 0.1, 0.8),
            Point::hold(done, 0.),
        ],
    )?;
    let scale = [
        "F3", "G3", "Ab3", "Bb3", "C4", "Db4", "Eb4", "F4", "G4", "Ab4", "C5",
    ];
    let mut lock_rng = PythonRandom::new(180);
    for beat in &locks[..11] {
        clip(&mut song, blip)?
            .note(
                scale[lock_rng.below(scale.len() as u32) as usize],
                *beat,
                0.1,
                118,
            )?
            .note(
                scale[lock_rng.below(scale.len() as u32) as usize],
                beat + 2. / fps * b,
                0.1,
                100,
            )?;
    }
    clip(&mut song, blip)?.note("F4", locks[11], 0.12, 110)?;
    song.track_mut(blip)?.automate(
        "pan",
        lane(t, 0, nf, 1, false, |g| {
            Ok((t.box_pan(g, 1920.)? * 1.8).clamp(-0.85, 0.85))
        })?,
    )?;
    song.track_mut(blip)?.automate(
        "fx0:bits",
        [
            Point::new(0., 8.),
            Point::new(collapse, 4.),
            Point::hold(done, 9.),
        ],
    )?;
    song.track_mut(blip)?
        .send(echo, -6., false)?
        .send(verb, -14., false)?;
    clip(&mut song, riser)?
        .note("C5", 0.3, 0.7, 100)?
        .note("F4", 6., done - 6., 110)?;
    song.track_mut(riser)?.automate(
        "f_cut",
        [
            Point::curve(0.3, 400., -0.5),
            Point::hold(1., 6000.),
            Point::curve(6., 300., -0.6),
            Point::new(done, 7000.),
        ],
    )?;
    song.track_mut(riser)?.automate(
        "volume",
        [
            Point::new(0., 0.4),
            Point::new(6., 0.4),
            Point::new(collapse, 0.5),
            Point::hold(done, 0.8),
        ],
    )?;
    song.track_mut(riser)?.automate(
        "pan",
        lane(t, 0, 11 * shot, 2, false, |g| {
            Ok((t.screen_pan(g, 1920.)? * 0.7).clamp(-0.7, 0.7))
        })?,
    )?;
    song.track_mut(riser)?.send(verb, -10., false)?;
    clip(&mut song, fall)?.note("F4", 0., 1.2, 110)?;
    song.track_mut(fall)?
        .ramp("f_cut", 0., 1.2, 9000., 250., 0.5)?;
    song.track_mut(fall)?.automate(
        "pan",
        lane(t, 0, 2 * shot, 1, false, |g| {
            Ok((t.screen_pan(g, 1920.)? * 0.8).clamp(-0.8, 0.8))
        })?,
    )?;
    song.track_mut(fall)?.send(verb, -6., false)?;
    clip(&mut song, chime)?.chord(["F5", "C6", "Ab6"], done + 0.12, 1.5, 100, 0.03)?;
    song.track_mut(chime)?
        .send(verb, -6., false)?
        .send(echo, -16., false)?;
    const PALETTE: [[u8; 3]; 8] = [
        [230, 90, 120],
        [64, 206, 174],
        [150, 110, 230],
        [250, 190, 80],
        [90, 170, 250],
        [240, 130, 70],
        [120, 200, 90],
        [210, 120, 200],
    ];
    for (i, track) in song.tracks.iter_mut().enumerate() {
        track.color = PALETTE[i % PALETTE.len()];
        for clip in &mut track.clips {
            clip.name = track.name.clone();
        }
    }
    Ok(song)
}
fn clip(song: &mut Song, id: TrackId) -> Result<&mut Clip> {
    Ok(&mut song.track_mut(id)?.clips[0])
}
fn lane(
    t: &Tracking,
    start: usize,
    end: usize,
    step: usize,
    hold: bool,
    f: impl Fn(usize) -> Result<f64>,
) -> Result<Vec<Point>> {
    (start..end)
        .step_by(step)
        .map(|g| {
            let beat = g as f64 / t.events.fps as f64 * 2.;
            let value = f(g)?;
            Ok(if hold {
                Point::hold(beat, value)
            } else {
                Point::new(beat, value)
            })
        })
        .collect()
}

fn push(t: &Tracking, frame: usize, shot: usize) -> f64 {
    t.camera.frames[frame].zoom / t.camera.frames[frame - frame % shot].zoom
}
