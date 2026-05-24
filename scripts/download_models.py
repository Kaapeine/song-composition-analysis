"""
Runs during Docker base image build to pre-download model weights.
Baking weights into the base image means the first analysis job is not slow.
"""
import numpy as np
import soundfile as sf
import tempfile
import os

print("Pre-downloading allin1 + demucs model weights (triggered together by allin1.analyze)...")
tmp = tempfile.mktemp(suffix='.wav')
sf.write(tmp, np.zeros(44100 * 12, dtype=np.float32), 44100)
try:
    import allin1
    allin1.analyze(tmp, keep_byproducts=False)
    print("allin1 model ready.")
except Exception as e:
    print(f"allin1 model download triggered (analysis error expected on silent audio): {e}")
finally:
    if os.path.exists(tmp):
        os.unlink(tmp)
