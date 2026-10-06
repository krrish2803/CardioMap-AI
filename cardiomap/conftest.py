import sys
from pathlib import Path

# Add project root and cardiomap folder to python search path
root = Path(__file__).resolve().parent
sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(root))
