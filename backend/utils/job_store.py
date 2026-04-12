import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


class JobStore:
    def __init__(self, db_path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._initialize()

    @contextmanager
    def _connection(self):
        conn = sqlite3.connect(self.db_path, timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _initialize(self):
        with self._lock, self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS video_jobs (
                    job_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    status TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0,
                    result_json TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_video_jobs_updated_at ON video_jobs(updated_at)")
            conn.commit()

    def create_job(self, *, job_id, filename, status="queued", stage="queued", progress=0):
        now = _utc_now()
        with self._lock, self._connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO video_jobs
                (job_id, filename, status, stage, progress, result_json, error_message, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)
                """,
                (job_id, filename, status, stage, int(progress), now, now),
            )
            conn.commit()

    def update_job(self, job_id, **fields):
        if not fields:
            return

        allowed = {"filename", "status", "stage", "progress", "result", "error_message"}
        unknown = sorted(set(fields) - allowed)
        if unknown:
            raise ValueError(f"Unsupported job fields: {', '.join(unknown)}")

        updates = []
        values = []
        for key, value in fields.items():
            if key == "result":
                updates.append("result_json = ?")
                values.append(json.dumps(value, ensure_ascii=False))
            elif key == "progress":
                updates.append("progress = ?")
                values.append(int(value))
            else:
                updates.append(f"{key} = ?")
                values.append(value)

        updates.append("updated_at = ?")
        values.append(_utc_now())
        values.append(job_id)

        with self._lock, self._connection() as conn:
            cursor = conn.execute(
                f"UPDATE video_jobs SET {', '.join(updates)} WHERE job_id = ?",
                values,
            )
            conn.commit()
            return cursor.rowcount

    def get_job(self, job_id):
        with self._lock, self._connection() as conn:
            row = conn.execute("SELECT * FROM video_jobs WHERE job_id = ?", (job_id,)).fetchone()

        if row is None:
            return None

        return self._row_to_dict(row)

    def list_jobs(self, limit=20):
        safe_limit = max(1, min(int(limit), 100))
        with self._lock, self._connection() as conn:
            rows = conn.execute(
                "SELECT * FROM video_jobs ORDER BY updated_at DESC LIMIT ?",
                (safe_limit,),
            ).fetchall()

        return [self._row_to_dict(row) for row in rows]

    @staticmethod
    def _row_to_dict(row):
        result = None
        if row["result_json"]:
            try:
                result = json.loads(row["result_json"])
            except json.JSONDecodeError:
                result = None

        return {
            "job_id": row["job_id"],
            "filename": row["filename"],
            "status": row["status"],
            "stage": row["stage"],
            "progress": row["progress"],
            "result": result,
            "error_message": row["error_message"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }