"""
History Manager (M8) implementation.
"""

from __future__ import annotations

from typing import Any, List, TypeAlias

# Placeholder alias for modelDelta (per MIS).
modelDelta: TypeAlias = Any


class EmptyHistoryError(Exception):
    """Raised when undo/redo is requested on an empty stack."""


class HistoryManager:
    """Tracks model edit history with undo/redo support."""

    # Max number of undo states stored. 100 is a reasonable default, not specified in the MIS.
    MAX_HISTORY_SIZE: int = 100

    def __init__(self) -> None:
        self.historyStack: List[modelDelta] = []
        self.redoStack: List[modelDelta] = []

    def recordChange(self, delta: modelDelta) -> None:
        """Record a new model change and clear redo history."""
        self.historyStack.append(delta)
        if len(self.historyStack) > self.MAX_HISTORY_SIZE:
            self.historyStack.pop(0)
        self._clearRedo()

    def undoRequest(self) -> modelDelta:
        """Undo the most recent change and return its delta."""
        if not self.historyStack:
            raise EmptyHistoryError("No history to undo.")
        delta = self.historyStack.pop()
        self.redoStack.append(delta)
        return delta

    def redoRequest(self) -> modelDelta:
        """Redo the most recent undone change and return its delta."""
        if not self.redoStack:
            raise EmptyHistoryError("No history to redo.")
        delta = self.redoStack.pop()
        self.historyStack.append(delta)
        return delta

    def clearHistory(self) -> None:
        """Clear both undo and redo history stacks."""
        self.historyStack.clear()
        self.redoStack.clear()

    def _clearRedo(self) -> None:
        """Clear only the redo stack."""
        self.redoStack.clear()
