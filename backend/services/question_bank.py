"""
Local question bank used for instant responses.

This exists so /generate-question never has to depend on a slow or
rate-limited external LLM call. We try the AI model in the background
with a strict timeout (see llm_service.py); if it doesn't answer fast
enough, we instantly serve a curated question from here instead.
"""

import random

QUESTION_BANK = {
    "dsa": [
        "Explain how binary search works and what its time complexity is.",
        "What is the difference between an array and a linked list?",
        "How would you detect a cycle in a linked list?",
        "Explain the difference between BFS and DFS traversal.",
        "What is dynamic programming and when would you use it?",
        "How does a hash table handle collisions?",
        "Explain the time complexity of common sorting algorithms.",
        "What is a balanced binary search tree and why does it matter?",
        "How would you find the kth largest element in an array?",
        "Explain the difference between a stack and a queue, with a real use case for each.",
    ],
    "system design": [
        "How would you design a URL shortening service like bit.ly?",
        "How would you design a scalable notification system?",
        "Explain how you would design a rate limiter for an API.",
        "How would you design a chat application that supports millions of users?",
        "What tradeoffs would you consider between SQL and NoSQL for a new system?",
        "How would you design a caching layer for a high-traffic web application?",
        "How would you design a system to handle file uploads at scale?",
        "Explain how you'd shard a database as user traffic grows.",
        "How would you design a news feed like Twitter or Instagram?",
        "What is the CAP theorem and how does it influence system design decisions?",
    ],
    "hr": [
        "Tell me about yourself and your professional background.",
        "Why do you want to work for this company?",
        "Describe a time you faced a conflict at work and how you resolved it.",
        "What are your greatest strengths and weaknesses?",
        "Where do you see yourself in five years?",
        "Tell me about a time you failed and what you learned from it.",
        "How do you handle tight deadlines and pressure?",
        "Describe a situation where you had to work with a difficult teammate.",
        "Why should we hire you over other candidates?",
        "Tell me about a time you showed leadership.",
    ],
    "behavioral": [
        "Describe a time you had to make a decision without all the information you needed.",
        "Tell me about a project you're most proud of and why.",
        "Describe a time you disagreed with your manager. What did you do?",
        "How do you prioritize tasks when everything feels urgent?",
        "Tell me about a time you had to learn something new very quickly.",
        "Describe a situation where you went above and beyond for a project.",
        "Tell me about a time you received difficult feedback. How did you respond?",
    ],
    "frontend": [
        "Explain the difference between let, const, and var in JavaScript.",
        "What is the virtual DOM and why does React use it?",
        "Explain the difference between controlled and uncontrolled components in React.",
        "What are React hooks and why were they introduced?",
        "How does the browser's event loop work?",
        "Explain CSS specificity and how it's calculated.",
        "What is the difference between == and === in JavaScript?",
        "How would you optimize the performance of a slow-rendering React app?",
        "Explain what closures are in JavaScript with an example.",
        "What is the difference between CSS Grid and Flexbox, and when would you use each?",
    ],
    "backend": [
        "What is the difference between REST and GraphQL?",
        "Explain how JWT authentication works.",
        "What is database indexing and how does it improve performance?",
        "Explain the difference between SQL joins: INNER, LEFT, RIGHT, and FULL.",
        "How would you design an API to be idempotent?",
        "What is the difference between synchronous and asynchronous processing?",
        "Explain ACID properties in the context of databases.",
        "How would you handle versioning for a public API?",
        "What is connection pooling and why is it important?",
        "Explain the N+1 query problem and how you'd solve it.",
    ],
    "python": [
        "What is the difference between a list and a tuple in Python?",
        "Explain how Python's garbage collection works.",
        "What are Python decorators and why would you use one?",
        "Explain the difference between deep copy and shallow copy.",
        "What is the Global Interpreter Lock (GIL) in Python?",
        "How do generators differ from regular functions in Python?",
        "Explain the difference between *args and **kwargs.",
        "What are Python context managers used for?",
    ],
    "java": [
        "What is the difference between an interface and an abstract class in Java?",
        "Explain how garbage collection works in the JVM.",
        "What is the difference between == and .equals() in Java?",
        "Explain the concept of multithreading and synchronization in Java.",
        "What are Java Streams and how do they simplify collection processing?",
        "Explain the difference between checked and unchecked exceptions.",
    ],
    "sql": [
        "What is the difference between DELETE, TRUNCATE, and DROP?",
        "Explain database normalization and why it matters.",
        "What is a primary key versus a foreign key?",
        "How would you find duplicate rows in a SQL table?",
        "Explain the difference between a clustered and non-clustered index.",
        "What is a transaction and why is it important in databases?",
    ],
    "oop": [
        "Explain the four pillars of object-oriented programming.",
        "What is the difference between method overloading and overriding?",
        "Explain polymorphism with a real-world example.",
        "What is the difference between composition and inheritance?",
        "Explain the SOLID principles briefly.",
    ],
}

GENERIC_FALLBACK = [
    "Tell me about a recent project you worked on and the biggest challenge you faced.",
    "How do you approach debugging a problem you've never seen before?",
    "What excites you most about this field right now?",
    "Walk me through how you'd approach solving an unfamiliar technical problem.",
    "What's a technical decision you made that you'd approach differently today?",
    "How do you keep your skills up to date in a fast-changing field?",
    "Describe your ideal team and working environment.",
]

_recent_by_domain = {}


def _match_category(domain: str):
    domain = (domain or "").strip().lower()

    if not domain:
        return None

    for category in QUESTION_BANK:
        if category == domain or category in domain or domain in category:
            return category

    aliases = {
        "react": "frontend",
        "javascript": "frontend",
        "js": "frontend",
        "css": "frontend",
        "node": "backend",
        "api": "backend",
        "database": "sql",
        "db": "sql",
        "data structures": "dsa",
        "algorithms": "dsa",
        "algo": "dsa",
        "hr round": "hr",
        "human resources": "hr",
    }

    for key, category in aliases.items():
        if key in domain:
            return category

    return None


def get_fallback_question(domain: str) -> str:
    """Instantly return a curated question for the given domain."""

    category = _match_category(domain)
    pool = QUESTION_BANK.get(category, GENERIC_FALLBACK) if category else GENERIC_FALLBACK

    used = _recent_by_domain.setdefault(domain or "generic", set())

    choices = [q for q in pool if q not in used]
    if not choices:
        used.clear()
        choices = pool

    question = random.choice(choices)
    used.add(question)

    return question
