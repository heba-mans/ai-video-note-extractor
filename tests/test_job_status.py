from app.db.models.job import JobStatus


def test_job_status_values() -> None:
    assert JobStatus.QUEUED.value == "QUEUED"
    assert JobStatus.FAILED.value == "FAILED"