# 13 · 口播与语音复刻

可选语音的路径与授权原则见[可选语音指南](voice-configuration.md)，服务接口细节见[口播API](voice-api.md)。

已有录音先沿用；需要新配音时，按用户选择使用系统声音或已授权的复刻音色，并用当前会话实际可用、经本次任务授权的工具生成。已有音轨的时长拟合与电平匹配用`tools/art-motion/voice.py`，见[离线语音处理](../../../tools/art-motion/assets-audio.md#process-a-supplied-voice-track)。

每次生成只出一条，不自动执行三候选或ASR。补配用`voice.py`的`--fit-seconds`拟合时长、`--match-db`匹配电平（取目标平均 dB，不读参考音轨），完成后仍要核实台词、专名、接缝和字幕。具体模型、语速、音色与授权不从本文写死。
