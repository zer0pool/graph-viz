from sqlalchemy import types
from sqlalchemy.types import TypeDecorator

class LowerCaseString(TypeDecorator):
    """
    SQLAlchemy type that automatically lowercases strings on both read (filtering) 
    and write (insert/update).
    """
    impl = types.String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Lowercase the value before it goes to the DB."""
        if value is not None:
            return value.lower()
        return value

    def process_result_value(self, value, dialect):
        """Ensure values coming back from DB are also lowercase (redundant but safe)."""
        if value is not None:
            return value.lower()
        return value

    def copy(self, **kw):
        return LowerCaseString(self.impl.length)
