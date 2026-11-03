import fractions
from fastapi.encoders import jsonable_encoder
from backend.app.utils.serialization import sanitize_for_json

def test_sanitize_fraction():
    f = fractions.Fraction(72, 1)
    data = {
        "dpi": (f, f),
        "nested": {
            "ratio": fractions.Fraction(1, 3),
            "tags": [fractions.Fraction(100, 2), "string_val", 42, 3.14]
        }
    }
    sanitized = sanitize_for_json(data)
    encoded = jsonable_encoder(sanitized)
    
    assert encoded["dpi"] == [72, 72]
    assert encoded["nested"]["tags"][0] == 50
    assert isinstance(encoded["nested"]["ratio"], float)

