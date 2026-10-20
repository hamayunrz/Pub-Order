"""Maps unchecked ingredients to the text stored on an order item."""

REMOVED = {
    "no-onion": "No onion",
    "no-tomato": "No tomato",
    "no-pickles": "No pickles",
    "no-cheese": "No cheese",
}


def customization_text(option_ids: list[str]) -> str:
    seen: list[str] = []
    for option_id in option_ids:
        label = REMOVED.get(option_id)
        if label and label not in seen:
            seen.append(label)
    return ", ".join(seen)
