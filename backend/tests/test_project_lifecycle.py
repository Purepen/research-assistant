"""Regression tests for Bug #1: GET /projects/{id} returned current_phase "Unknown".

The DB layer (app.models.database.ProjectStatus) and the domain layer
(app.core.domain.project.ProjectStatus) are distinct enum classes with
identical values. ProjectLifecycle's internal dicts are keyed by the domain
enum, so passing a DB enum member silently fell through to "Unknown".
"""

import pytest

from app.core.domain.project import ProjectLifecycle
from app.core.domain.project import ProjectStatus as DomainStatus
from app.models.database import ProjectStatus as DBStatus


def test_enum_value_sets_match():
    """The two ProjectStatus enums must not drift apart."""
    assert {s.value for s in DBStatus} == {s.value for s in DomainStatus}


@pytest.mark.parametrize("db_status", list(DBStatus), ids=lambda s: s.value)
def test_every_db_status_maps_to_a_real_phase(db_status):
    lifecycle = ProjectLifecycle(db_status)
    assert lifecycle.get_phase_description() != "Unknown"


@pytest.mark.parametrize("db_status", list(DBStatus), ids=lambda s: s.value)
def test_db_status_coerces_to_domain_member(db_status):
    lifecycle = ProjectLifecycle(db_status)
    assert lifecycle.current_status is DomainStatus(db_status.value)


def test_progress_percentage_uses_coerced_status():
    assert ProjectLifecycle(DBStatus.COMPLETE).get_progress_percentage() == 100
    assert ProjectLifecycle(DBStatus.REVIEWING).get_progress_percentage() == 80


def test_raw_string_status_accepted():
    assert ProjectLifecycle("generating").get_phase_description() == "Generating specification"


def test_transitions_accept_db_enum_members():
    lifecycle = ProjectLifecycle(DBStatus.QUEUED)
    assert lifecycle.can_transition_to(DBStatus.GENERATING)
    assert lifecycle.transition_to(DBStatus.GENERATING)
    assert lifecycle.current_status is DomainStatus.GENERATING
    assert not lifecycle.can_transition_to(DBStatus.DRAFT)
