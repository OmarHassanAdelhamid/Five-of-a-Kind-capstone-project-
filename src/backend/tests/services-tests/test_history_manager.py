import pytest
import app.services.history_management_service as hm
from app.models.schemas import ModelDelta

def test_initialization_stacks_empty() -> None:
    hm.clear_history()
    assert hm._return_history_stack() == []
    assert hm._return_redo_stack() == []


def test_record_change_adds_to_history() -> None:
    hm.clear_history()
    delta = ModelDelta(old_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.5)])
    hm.record_change(delta)
    assert hm._return_history_stack() == [delta]
    assert hm._return_redo_stack() == []


def test_undo_request_moves_to_redo_and_returns_delta() -> None:
    hm.clear_history()
    delta_1 = ModelDelta(old_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.5)])
    delta_2 = ModelDelta(old_voxels=[(0, 1, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 1, 0, 1, 1.0, 1.0, 1.5)])

    hm.record_change(delta_1)
    hm.record_change(delta_2)

    delta_t = hm.undo_request()

    assert delta_t == delta_2
    assert hm._return_history_stack() == [delta_1]
    assert hm._return_redo_stack() == [delta_2]


def test_redo_request_moves_to_history_and_returns_delta() -> None:
    hm.clear_history()
    delta_1 = ModelDelta(old_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.5)])
    delta_2 = ModelDelta(old_voxels=[(0, 1, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 1, 0, 1, 1.0, 1.0, 1.5)])
    hm.record_change(delta_1)
    hm.record_change(delta_2)
    hm.undo_request()

    delta_t = hm.redo_request()

    assert delta_t == delta_2
    assert hm._return_history_stack() == [delta_1, delta_2]
    assert hm._return_redo_stack() == []


def test_record_after_undo_clears_redo_stack() -> None:
    hm.clear_history()
    delta_1 = ModelDelta(old_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.5)])
    delta_2 = ModelDelta(old_voxels=[(0, 1, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 1, 0, 1, 1.0, 1.0, 1.5)])
    hm.record_change(delta_1)
    hm.undo_request()
    hm.record_change(delta_2)

    assert hm._return_history_stack() == [delta_2]
    assert hm._return_redo_stack() == []


def test_capacity_limit_drops_oldest_change() -> None:
    hm.clear_history()
    max_size = hm._return_max_history()

    delta_max = ModelDelta(old_voxels=[(9, 9, 9, 1, 1.0, 1.0, 1.0)], new_voxels=[(9, 9, 9, 1, 1.0, 1.0, 1.0)])
    for i in range(max_size):
        hm.record_change(ModelDelta(old_voxels=[(1, 1, 1, i, 1.0, 1.0, 1.0)], new_voxels=[(1, 1, 1, i+1, 1.0, 1.0, 1.0)]))

    hm.record_change(delta_max)

    assert len(hm._return_history_stack()) == max_size
    assert hm._return_history_stack()[0] == ModelDelta(old_voxels=[(1, 1, 1, 1, 1.0, 1.0, 1.0)], new_voxels=[(1, 1, 1, 2, 1.0, 1.0, 1.0)])
    assert hm._return_history_stack()[-1] == delta_max


def test_undo_request_raises_on_empty_history() -> None:
    hm.clear_history()
    with pytest.raises(hm.EmptyHistoryException):
        hm.undo_request()


def test_redo_request_raises_on_empty_redo() -> None:
    hm.clear_history()
    with pytest.raises(hm.EmptyHistoryException):
        hm.redo_request()


def test_clear_history_empties_both_stacks() -> None:
    hm.clear_history()
    delta_1 = ModelDelta(old_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.0)], new_voxels=[(0, 0, 0, 1, 1.0, 1.0, 1.5)])
    hm.record_change(delta_1)
    hm.undo_request()

    hm.clear_history()

    assert hm._return_history_stack() == []
    assert hm._return_redo_stack() == []
