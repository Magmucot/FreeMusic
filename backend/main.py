import fastapi as fst
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from data.db import DB
from youtube import Youtube_download
