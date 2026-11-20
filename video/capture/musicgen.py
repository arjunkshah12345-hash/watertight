import sys, torch, numpy as np, soundfile as sf
from transformers import AutoProcessor, MusicgenForConditionalGeneration
out = sys.argv[1]
prompt = sys.argv[2]
torch.manual_seed(int(sys.argv[3]) if len(sys.argv) > 3 else 7)
dev = "mps" if torch.backends.mps.is_available() else "cpu"
proc = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small").to(dev)
inputs = proc(text=[prompt], padding=True, return_tensors="pt").to(dev)
audio = model.generate(**inputs, do_sample=True, guidance_scale=3.5, max_new_tokens=1450)
sr = model.config.audio_encoder.sampling_rate
a = audio[0, 0].float().cpu().numpy()
sf.write(out, a, sr)
print("wrote", out, len(a) / sr, "s")
