def keyword_score(question: str, answer: str):

    keywords = {
        "binary search": [
            "binary",
            "search",
            "sorted",
            "array",
            "log",
            "middle"
        ]
    }

    answer = answer.lower()

    expected = keywords.get(
        question.lower(),
        []
    )

    matched = []

    for word in expected:

        if word in answer:
            matched.append(word)

    score = 0

    if len(expected) > 0:
        score = int(
            (len(matched) / len(expected))
            * 100
        )

    return {
        "matched_keywords": matched,
        "score": score
    }