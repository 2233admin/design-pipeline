use fframes::{
    CombinedMediaProvider, EncoderOptions, MediaDirectory, MediaProvider, RenderOptions, cli,
};
#[cfg(not(windows))]
use fframes_skia_renderer::metal::SkiaMetalCtx as SkiaGpuCtx;
#[cfg(windows)]
use fframes_skia_renderer::vulkan::SkiaVulkanCtx as SkiaGpuCtx;
use fframes_skia_renderer::{
    SkiaFFramesRenderer, SkiaPipelineConcurrencyPolicy, SkiaPipelineConfig,
};
use lens::{HEIGHT, LensVideo, WIDTH};
use std::process::ExitCode;

fn main() -> ExitCode {
    // out/pass holds flat.mp4 (pass 1) and sfx.wav (tools/sfx.py); run from the workspace root.
    let dir = MediaDirectory::read_folder("out/pass")
        .expect("out/pass: render flat and run tools/sfx.py first");
    let pass = dir.process_media_source().expect("out/pass media");
    // Fonts for the camera tracker's labels.
    let fonts_dir = MediaDirectory::read_folder("media").expect("media folder");
    let fonts = fonts_dir.process_media_source().expect("fonts");
    let media = CombinedMediaProvider::from([&pass as &dyn MediaProvider, &fonts]);
    let video = LensVideo::new();
    let gpu = SkiaGpuCtx::new(WIDTH, HEIGHT).expect("GPU context");

    cli::new(
        &video,
        RenderOptions {
            media: Some(&media),
            default_font: "JetBrains Mono",
            video_encoder_options: EncoderOptions {
                preferred_encoder: Some("libx264"),
                codec_params: Some(&[("crf", "16"), ("preset", "slow"), ("tune", "grain")]),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .backend(SkiaFFramesRenderer::new(
        if cfg!(windows) {
            // Bound GPU contexts and frame buffers to limit memory use on Windows.
            SkiaPipelineConfig {
                concurrency_policy: SkiaPipelineConcurrencyPolicy::Concurrency(2),
                encoder_threads: 2,
                buffer_queue_size: 2,
                ..Default::default()
            }
        } else {
            SkiaPipelineConfig {
                concurrency_policy: SkiaPipelineConcurrencyPolicy::MaxPerformance,
                ..Default::default()
            }
        },
        &gpu,
    ))
    .preview(fframes_native_player::cli_preview)
    .default_output("out/tracking.mp4")
    .run()
}
