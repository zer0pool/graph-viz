"""
Logging configuration and custom formatters for the Graph Manager application.
"""

import datetime
import logging
import os


class N8nStyleFormatter(logging.Formatter):
    """
    Custom formatter to follow an n8n-inspired, structured, and human-readable logging format,
    using standard log levels.

    Format:
    [ISO_TIMESTAMP] | LEVEL | REQUEST_ID | PROCESS_ID | file:line::func() | MESSAGE

    Features:
    - ISO 8601 timestamp in UTC.
    - Log level (e.g., INFO, ERROR).
    - Request ID (RID) for tracing (defaults to "N/A" if not provided).
    - Process ID (PID) for identifying the process.
    - Source location (file:line::function()) for debugging.
    - Message for the log content.
    """

    def __init__(self):
        super().__init__()
        # ANSI color codes
        self.colors = {
            "ERROR": "\033[91m",  # Red
            "WARNING": "\033[93m",  # Yellow
            "INFO": "\033[97m",  # White
            "DEBUG": "\033[90m",  # Gray
            "CRITICAL": "\033[95m",  # Magenta
        }
        self.reset = "\033[0m"  # Reset color

    def format(self, record):
        # 1. Standardized ISO Timestamp
        # Convert the record's timestamp to UTC and format as ISO 8601 (YYYY-MM-DDTHH:MM:SS.mmmZ)
        dt = datetime.datetime.fromtimestamp(record.created, tz=datetime.timezone.utc)
        timestamp = dt.strftime("%Y-%m-%dT%H:%M:%S") + f".{int(record.msecs):03d}Z"

        # 2. Get Standard Level Name
        level = f"{self.colors.get(record.levelname, self.reset)}{record.levelname}{self.reset}"

        # 3. Get Process ID
        # Use the process ID from the record (without the "PID:" prefix)
        pid = f"{record.process}"

        # 4. Get Request ID (Crucial for Tracing)
        # Use "N/A" if request_id is not provided
        request_id = getattr(record, "request_id", "N/A")

        # 5. Get Source Location (file:line::function())
        # Extract the filename, line number, and function name from the record
        filename = os.path.basename(record.pathname)
        source_loc = f"{filename}:{record.lineno}::{record.funcName}()"

        # 6. Get Message
        # Retrieve the log message from the record
        message = record.getMessage()

        # Construct the final line using the pipe '|' separator
        # Padding ensures columns are aligned for easier visual scanning
        log_line = f"[{timestamp}] | {level:<16} | {request_id:<8} | {pid:<6} | {source_loc:<30} | {message}"

        return log_line


def setup_logging(log_level: str = "INFO"):
    """
    Configure logging with the concise formatter.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Configure logging with concise format
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        handlers=[logging.StreamHandler()],
    )

    # Apply custom formatter to all handlers
    for handler in logging.root.handlers:
        handler.setFormatter(N8nStyleFormatter())
