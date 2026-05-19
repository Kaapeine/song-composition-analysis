from app.storage import StorageBackend, _make_storage
from app.database import get_db  # re-export for convenience


def get_storage() -> StorageBackend:
    return _make_storage()


async def get_current_user():
    """Auth stub. Replace this function body when adding authentication."""
    return None
