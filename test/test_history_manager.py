import pytest
from backend.app.services.history_management_service import HistoryManager, EmptyHistoryError  # noqa: E402

def test_initialization_stacks_empty() -> None:
    manager = HistoryManager()
    assert manager.historyStack == []
    assert manager.redoStack == []


def test_record_change_adds_to_history() -> None:
    manager = HistoryManager()
    manager.recordChange("delta-1")
    assert manager.historyStack == ["delta-1"]
    assert manager.redoStack == []


def test_undo_request_moves_to_redo_and_returns_delta() -> None:
    manager = HistoryManager()
    manager.recordChange("delta-1")
    manager.recordChange("delta-2")

    delta = manager.undoRequest()

    assert delta == "delta-2"
    assert manager.historyStack == ["delta-1"]
    assert manager.redoStack == ["delta-2"]


def test_redo_request_moves_to_history_and_returns_delta() -> None:
    manager = HistoryManager()
    manager.recordChange("delta-1")
    manager.recordChange("delta-2")
    manager.undoRequest()

    delta = manager.redoRequest()

    assert delta == "delta-2"
    assert manager.historyStack == ["delta-1", "delta-2"]
    assert manager.redoStack == []


def test_record_after_undo_clears_redo_stack() -> None:
    manager = HistoryManager()
    manager.recordChange("A")
    manager.undoRequest()
    manager.recordChange("B")

    assert manager.historyStack == ["B"]
    assert manager.redoStack == []


def test_capacity_limit_drops_oldest_change() -> None:
    manager = HistoryManager()
    max_size = manager.MAX_HISTORY_SIZE

    for i in range(max_size):
        manager.recordChange(f"delta-{i}")

    manager.recordChange("delta-overflow")

    assert len(manager.historyStack) == max_size
    assert manager.historyStack[0] == "delta-1"
    assert manager.historyStack[-1] == "delta-overflow"


def test_undo_request_raises_on_empty_history() -> None:
    manager = HistoryManager()
    with pytest.raises(EmptyHistoryError):
        manager.undoRequest()


def test_redo_request_raises_on_empty_redo() -> None:
    manager = HistoryManager()
    with pytest.raises(EmptyHistoryError):
        manager.redoRequest()


def test_clear_history_empties_both_stacks() -> None:
    manager = HistoryManager()
    manager.recordChange("delta-1")
    manager.undoRequest()

    manager.clearHistory()

    assert manager.historyStack == []
    assert manager.redoStack == []
