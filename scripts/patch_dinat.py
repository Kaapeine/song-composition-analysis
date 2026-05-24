"""
Patch allin1/models/dinat.py for NATTEN 0.21+ API compatibility.

allin1 was written for the old NATTEN API (natten1dqkrpb / natten1dav).
Three problems with NATTEN 0.21+ on CPU:
  1. Renamed functions: natten1dqkrpb/av -> na1d/na2d, dropped RPB argument
  2. Changed tensor layout from heads-second (B,H,L,D) to heads-last (B,L,H,D)
  3. Flex Attention backend requires power-of-two head_dim; allin1 uses head_dim=12
Fix: replace NATTEN calls with pure PyTorch neighborhood attention that
  - has no head_dim restriction
  - restores RPB (relative positional bias) from the pretrained checkpoint
"""
import sys
from pathlib import Path
import site

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

PURE_FUNCTIONS = """

def _pure_na1d(q, k, v, kernel_size, dilation, scale=1.0, rpb=None):
    \"\"\"Pure PyTorch 1D neighborhood attention — no head_dim restriction.\"\"\"
    B, L, H, D = q.shape
    r = kernel_size // 2
    pad = r * dilation

    k_flat = k.reshape(B, L, H * D).permute(0, 2, 1)  # (B, H*D, L)
    v_flat = v.reshape(B, L, H * D).permute(0, 2, 1)
    k_pad = F.pad(k_flat, (pad, pad))  # (B, H*D, L+2*pad)
    v_pad = F.pad(v_flat, (pad, pad))

    i_idx = torch.arange(L, device=q.device)
    j_idx = torch.arange(kernel_size, device=q.device)
    idx = (i_idx[:, None] + j_idx[None, :] * dilation).reshape(-1)  # (L*K,)

    k_nb = k_pad[:, :, idx].reshape(B, H * D, L, kernel_size)
    v_nb = v_pad[:, :, idx].reshape(B, H * D, L, kernel_size)
    # (B, L, H, K, D)
    k_nb = k_nb.permute(0, 2, 3, 1).reshape(B, L, kernel_size, H, D).permute(0, 1, 3, 2, 4)
    v_nb = v_nb.permute(0, 2, 3, 1).reshape(B, L, kernel_size, H, D).permute(0, 1, 3, 2, 4)

    attn = (q.unsqueeze(3) * k_nb).sum(-1)  # (B, L, H, K)
    if rpb is not None:
        # rpb: (H, 2K-1); neighbor j_k in [0,K) maps to rpb[:, j_k + (K-1-r)]
        start = kernel_size - 1 - r
        attn = attn + rpb[:, start:start + kernel_size][None, None, :, :]
    attn = F.softmax(attn, dim=-1)
    return (attn.unsqueeze(-1) * v_nb).sum(-2)  # (B, L, H, D)


def _pure_na2d(q, k, v, kernel_size, dilation, scale=1.0, rpb=None):
    \"\"\"Pure PyTorch 2D neighborhood attention — no head_dim restriction.\"\"\"
    B, X, Y, H, D = q.shape
    r = kernel_size // 2
    pad = r * dilation

    k_flat = k.permute(0, 3, 4, 1, 2).reshape(B, H * D, X, Y)  # (B, H*D, X, Y)
    v_flat = v.permute(0, 3, 4, 1, 2).reshape(B, H * D, X, Y)
    k_pad = F.pad(k_flat, (pad, pad, pad, pad))
    v_pad = F.pad(v_flat, (pad, pad, pad, pad))

    Y_pad = Y + 2 * pad
    ix = torch.arange(X, device=q.device)
    iy = torch.arange(Y, device=q.device)
    jk = torch.arange(kernel_size, device=q.device)
    nx = ix[:, None] + jk[None, :] * dilation  # (X, K)
    ny = iy[:, None] + jk[None, :] * dilation  # (Y, K)
    nx_g = nx[:, None, :, None].expand(X, Y, kernel_size, kernel_size)
    ny_g = ny[None, :, None, :].expand(X, Y, kernel_size, kernel_size)
    lin_idx = (nx_g * Y_pad + ny_g).reshape(-1)  # (X*Y*K*K,)

    K2 = kernel_size * kernel_size
    k_nb = k_pad.reshape(B, H * D, -1)[:, :, lin_idx].reshape(B, H * D, X, Y, K2)
    v_nb = v_pad.reshape(B, H * D, -1)[:, :, lin_idx].reshape(B, H * D, X, Y, K2)
    # (B, X, Y, H, K2, D)
    k_nb = k_nb.permute(0, 2, 3, 4, 1).reshape(B, X, Y, K2, H, D).permute(0, 1, 2, 4, 3, 5)
    v_nb = v_nb.permute(0, 2, 3, 4, 1).reshape(B, X, Y, K2, H, D).permute(0, 1, 2, 4, 3, 5)

    attn = (q.unsqueeze(4) * k_nb).sum(-1)  # (B, X, Y, H, K2)
    if rpb is not None:
        # rpb: (H, 2K-1, 2K-1); 2D neighbors (jx,jy) map to rpb[:, jx+(K-1-r), jy+(K-1-r)]
        start = kernel_size - 1 - r
        rpb_slice = rpb[:, start:start + kernel_size, start:start + kernel_size]  # (H, K, K)
        attn = attn + rpb_slice.reshape(H, K2)[None, None, None, :, :]
    attn = F.softmax(attn, dim=-1)
    return (attn.unsqueeze(-1) * v_nb).sum(-2)  # (B, X, Y, H, D)

"""

NEW_FORWARD = (
    "    # Pure PyTorch neighborhood attention — bypasses NATTEN (head_dim=12 is not a\n"
    "    # power of two, so NATTEN's Flex backend rejects it). RPB from the checkpoint\n"
    "    # is passed explicitly so the pretrained biases are preserved.\n"
    "    if query_layer.dim() == 4:  # 1D: (B, H, L, D) -> (B, L, H, D)\n"
    "      q = query_layer.permute(0, 2, 1, 3)\n"
    "      k = key_layer.permute(0, 2, 1, 3)\n"
    "      v = value_layer.permute(0, 2, 1, 3)\n"
    "      out = self.nattn_fn(q, k, v, kernel_size=self.kernel_size, dilation=self.dilation, scale=1.0, rpb=self.rpb)\n"
    "      context_layer = out.permute(0, 2, 1, 3).contiguous()  # (B, L, H, D) -> (B, H, L, D)\n"
    "    else:  # 2D: (B, H, X, Y, D) -> (B, X, Y, H, D)\n"
    "      q = query_layer.permute(0, 2, 3, 1, 4)\n"
    "      k = key_layer.permute(0, 2, 3, 1, 4)\n"
    "      v = value_layer.permute(0, 2, 1, 4)\n"
    "      out = self.nattn_fn(q, k, v, kernel_size=self.kernel_size, dilation=self.dilation, scale=1.0, rpb=self.rpb)\n"
    "      context_layer = out.permute(0, 3, 1, 2, 4).contiguous()  # (B, X, Y, H, D) -> (B, H, X, Y, D)\n"
    "\n"
    "    if len(context_layer.shape) > 4:  # 2D\n"
    "      context_layer = context_layer.permute(0, 2, 3, 1, 4).contiguous()\n"
    "    else:  # 1D\n"
    "      context_layer = context_layer.permute(0, 2, 1, 3).contiguous()\n"
    "    new_context_layer_shape = context_layer.size()[:-2] + (self.all_head_size,)\n"
    "    context_layer = context_layer.view(new_context_layer_shape)\n"
    "\n"
    "    outputs = (context_layer,)"
)

OLD_FORWARD = (
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
    "    context_layer = self.nattendav(attention_probs, value_layer, self.kernel_size, self.dilation)\n"
    "    if len(context_layer.shape) > 4:  # 2D\n"
    "      context_layer = context_layer.permute(0, 2, 3, 1, 4).contiguous()\n"
    "    else:  # 1D\n"
    "      context_layer = context_layer.permute(0, 2, 1, 3).contiguous()\n"
    "    new_context_layer_shape = context_layer.size()[:-2] + (self.all_head_size,)\n"
    "    context_layer = context_layer.view(new_context_layer_shape)\n"
    "    \n"
    "    outputs = (context_layer, attention_probs) if output_attentions else (context_layer,)"
)

patches = [
    (
        "from natten.functional import natten1dav, natten1dqkrpb, natten2dav, natten2dqkrpb",
        "import torch.nn.functional as F",
    ),
    (
        "from .utils import *",
        "from .utils import *" + PURE_FUNCTIONS,
    ),
    (
        "  nattendqkrpb: Callable\n  nattendav: Callable",
        "  nattn_fn: Callable  # _pure_na1d or _pure_na2d",
    ),
    (
        OLD_FORWARD,
        NEW_FORWARD,
    ),
    (
        "    self.nattendqkrpb = natten1dqkrpb\n    self.nattendav = natten1dav",
        "    self.nattn_fn = _pure_na1d",
    ),
    (
        "    self.nattendqkrpb = natten2dqkrpb\n    self.nattendav = natten2dav",
        "    self.nattn_fn = _pure_na2d",
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
