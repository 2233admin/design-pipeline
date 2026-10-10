# 13 · 口播与语音复刻

统一入口与配置见[可选语音指南](voice-configuration.md)，接口细节见[口播API](voice-api.md)。

已有录音先沿用；需要新配音时，按用户配置选择系统声音或已绑定的复刻音色。`koubo.py say/train/voices`保留旧调用入口，和`capabilities.py`共用同一份安装目录外的配置（上游示例/脚本，本项目未提供；新配音用当前会话实际可用、经本次任务授权的工具生成，已有音轨的时长拟合与电平匹配用`tools/art-motion/voice.py`，见[离线语音处理](../../../tools/art-motion/assets-audio.md#process-a-supplied-voice-track)）。

每次say只生成一条，不自动执行三候选或ASR。补配保留`--fit/--match`（本项目差异：`tools/art-motion/voice.py`对应`--fit-seconds`/`--match-db`，`--match-db`取目标平均 dB，不读参考音轨），完成后仍要核实台词、专名、接缝和字幕。具体模型、语速、音色与授权不从本文写死。
