#!/usr/bin/env bash
# Install allin1 and all its dependencies into the active Python environment.
# Run from the project root with the venv activated:
#   source .venv/bin/activate
#   bash scripts/install_allin1.sh

set -euo pipefail

echo "==> Step 1: torch + torchaudio"
pip install torch torchaudio

echo ""
echo "==> Step 2: ninja (C++ build tool)"
pip install ninja

echo ""
echo "==> Step 3: madmom (from GitHub — PyPI version is outdated)"
pip install "git+https://github.com/CPJKU/madmom"

echo ""
echo "==> Step 4: natten 0.21.6"
pip install natten==0.21.6

echo ""
echo "==> Step 5: allin1 1.1.0"
pip install allin1==1.1.0

echo ""
echo "==> Step 6: patch allin1/models/dinat.py for NATTEN 0.20+ API"
# allin1 was written for the old NATTEN API (natten1dqkrpb / natten1dav).
# NATTEN 0.20+ replaced those with a fused na1d / na2d. This patch rewrites
# the three affected spots in dinat.py to use the new API.
python3 - <<'PYEOF'
import sys
from pathlib import Path
import site

# Find dinat.py in whichever site-packages the current interpreter uses
dinat_path = None
for sp in site.getsitepackages():
    candidate = Path(sp) / "allin1" / "models" / "dinat.py"
    if candidate.exists():
        dinat_path = candidate
        break

if dinat_path is None:
    print("ERROR: could not find allin1/models/dinat.py in site-packages", file=sys.stderr)
    sys.exit(1)

print(f"Patching {dinat_path}")
src = dinat_path.read_text()

patches = [
    # 1. Replace old import with new fused API import
    (
        "from natten.functional import natten1dav, natten1dqkrpb, natten2dav, natten2dqkrpb",
        "from natten.functional import na1d, na2d",
    ),
    # 2. Replace abstract class attributes
    (
        "  nattendqkrpb: Callable\n  nattendav: Callable",
        "  nattn_fn: Callable  # na1d or na2d from natten.functional",
    ),
    # 3. Replace the two-step QK+AV forward with a single fused call
    (
        "    # Compute NA between \"query\" and \"key\" to get the raw attention scores, and add relative positional biases.\n"
        "    # attention_scores = natten2dqkrpb(query_layer, key_layer, self.rpb, self.dilation)\n"
        "    attention_scores = self.nattendqkrpb(query_layer, key_layer, self.rpb, self.kernel_size, self.dilation)\n"
        "    \n"
        "    # Normalize the attention scores to probabilities.\n"
        "    attention_probs = nn.functional.softmax(attention_scores, dim=-1)\n"
        "    \n"
        "    # This is actually dropping out entire tokens to attend to, which might\n"
        "    # seem a bit unusual, but is taken from the original Transformer paper.\n"
        "    attention_probs = self.dropout(attention_probs)\n"
        "    \n"
        "    # context_layer = natten2dav(attention_probs, value_layer, self.dilation)\n"
        "    context_layer = self.nattendav(attention_probs, value_layer, self.kernel_size, self.dilation)",
        "    # Fused neighborhood attention (NATTEN 0.20+ API).\n"
        "    # query_layer is already scaled above so pass scale=1.0 to skip internal scaling.\n"
        "    context_layer = self.nattn_fn(\n"
        "      query_layer, key_layer, value_layer,\n"
        "      kernel_size=self.kernel_size,\n"
        "      dilation=self.dilation,\n"
        "      rpb=self.rpb,\n"
        "      scale=1.0,\n"
        "    )",
    ),
    # 4. Replace 1D concrete class assignments
    (
        "    self.nattendqkrpb = natten1dqkrpb\n    self.nattendav = natten1dav",
        "    self.nattn_fn = na1d",
    ),
    # 5. Replace 2D concrete class assignments
    (
        "    self.nattendqkrpb = natten2dqkrpb\n    self.nattendav = natten2dav",
        "    self.nattn_fn = na2d",
    ),
]

patched = src
for old, new in patches:
    if old not in patched:
        print(f"WARNING: patch target not found (already applied, or allin1 version changed):\n  {old[:80]!r}...")
    else:
        patched = patched.replace(old, new, 1)
        print(f"  OK: {old[:60]!r}...")

dinat_path.write_text(patched)
print("Patch complete.")
PYEOF

echo ""
echo "==> Verifying allin1 import..."
python3 -c "import allin1; print('allin1 ok')"

echo ""
echo "==> Loading pretrained model (downloads weights on first run)..."
python3 -c "from allin1.models import load_pretrained_model; m = load_pretrained_model(); print('model ok:', type(m).__name__)"

echo ""
echo "All done."
