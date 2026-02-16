from app.services.idempotency import build_job_idempotency_key


def test_idempotency_key_stable_for_same_input() -> None:
    fp = "a" * 64
    params = {"language": "en", "whisper_model": "small"}
    k1 = build_job_idempotency_key(fp, params)
    k2 = build_job_idempotency_key(fp, params)
    assert k1 == k2


def test_idempotency_key_changes_when_params_change() -> None:
    fp = "a" * 64
    k1 = build_job_idempotency_key(fp, {"language": "en"})
    k2 = build_job_idempotency_key(fp, {"language": "ar"})
    assert k1 != k2