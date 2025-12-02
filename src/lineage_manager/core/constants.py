from enum import Enum


class SchedulingType(str, Enum):
    SELF_TYPE = "SELF-TYPE"
    REQUEST_TYPE = "=REQUEST-TYPE"
