import math
from typing import Any

def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively converts arbitrary complex or forensic data types (Fractions, IFDRational,
    Ratio, NumPy scalars/arrays, bytes, sets, etc.) into JSON-compliant standard Python types.
    Ensures FastAPI jsonable_encoder never crashes on arbitrary image metadata.
    """
    if obj is None:
        return None
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, int):
        return obj
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return str(obj)
        return obj
    if isinstance(obj, str):
        return obj

    # Containers must be handled before duck-typing attributes
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}

    if isinstance(obj, (list, tuple, set, frozenset)):
        return [sanitize_for_json(v) for v in obj]

    # Handle fractions.Fraction or any object with numerator/denominator
    if hasattr(obj, "numerator") and hasattr(obj, "denominator"):
        try:
            den = float(obj.denominator)
            if den == 0:
                return 0.0
            num = float(obj.numerator)
            val = num / den
            return round(val, 4) if val % 1 != 0 else int(val)
        except Exception:
            return str(obj)

    # ExifRead Ratio (has num and den)
    if hasattr(obj, "num") and hasattr(obj, "den"):
        try:
            den = float(obj.den)
            if den == 0:
                return 0.0
            num = float(obj.num)
            val = num / den
            return round(val, 4) if val % 1 != 0 else int(val)
        except Exception:
            return str(obj)

    # ExifRead Tag (has non-callable .values attribute)
    if hasattr(obj, "values") and not callable(getattr(obj, "values")):
        try:
            return sanitize_for_json(obj.values)
        except Exception:
            return str(obj)

    # NumPy scalars
    if hasattr(obj, "item") and callable(getattr(obj, "item")):
        try:
            return sanitize_for_json(obj.item())
        except Exception:
            pass

    # NumPy arrays
    if hasattr(obj, "tolist") and callable(getattr(obj, "tolist")):
        try:
            return sanitize_for_json(obj.tolist())
        except Exception:
            pass

    # Bytes / bytearray
    if isinstance(obj, (bytes, bytearray)):
        try:
            return obj.decode("utf-8")
        except UnicodeDecodeError:
            return obj.hex()

    # Fallback to string representation
    try:
        return str(obj)
    except Exception:
        return repr(obj)
