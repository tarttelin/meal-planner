import json
import logging
from datetime import datetime, timezone


class CloudRunJsonFormatter(logging.Formatter):
    severity_map = {
        "CRITICAL": "CRITICAL",
        "ERROR": "ERROR",
        "WARNING": "WARNING",
        "INFO": "INFO",
        "DEBUG": "DEBUG",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "severity": self.severity_map.get(record.levelname, record.levelname),
            "message": record.getMessage(),
            "logger": record.name,
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
        }

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)

        return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
