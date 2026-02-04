"""
History Manager (M8) implementation.
"""

#from __future__ import annotations

from typing import List
from app.models.schemas import ModelDelta

class EmptyHistoryException(Exception):
    """Raised when undo/redo is requested on an empty stack."""


# Max number of undo states stored. 100 is a reasonable default, not specified in the MIS.
MAX_HISTORY_SIZE: int = 100


history_stack: List[ModelDelta] = []
redo_stack: List[ModelDelta] = []

def record_change(delta: ModelDelta) -> None:
    """Record a new model change and clear redo history."""
    history_stack.append(delta)
    if len(history_stack) > MAX_HISTORY_SIZE:
        history_stack.pop(0)
    redo_stack.clear()

def undo_request() -> ModelDelta:
    """Undo the most recent change and return its delta."""
    if not history_stack:
        raise EmptyHistoryException("No history to undo.")
    delta = history_stack.pop()
    redo_stack.append(delta)
    return delta

def redo_request() -> ModelDelta:
    """Redo the most recent undone change and return its delta."""
    if not redo_stack:
        raise EmptyHistoryException("No history to redo.")
    delta = redo_stack.pop()
    history_stack.append(delta)
    return delta

def is_undo_empty() -> bool:
    """Returns True if there is no history to undo."""
    if not history_stack: return True
    else: return False

def is_redo_empty() -> bool:
    """Returns True if there is no history to redo."""
    if not redo_stack: return True
    else: return False

def clear_history() -> None:
    """Clear both undo and redo history stacks."""
    history_stack.clear()
    redo_stack.clear()
