from __future__ import annotations
from typing import Optional


class ApplicationGenerator:
    """Facade for generating DIN 5008 compliant German application letters.

    Internally delegates to a provided helper instance to keep the refactor incremental.
    This helper is expected to expose a ``generate_anschreiben`` method compatible with
    ``TurboBewerbungsHelfer`` from *booster_turbo.py*.

    The long-term goal is to migrate the implementation fully into this module, but
    exposing the façade early allows other parts of the codebase to depend on a clean,
    testable interface without pulling in the full *booster_turbo* dependency tree.
    """

    def __init__(self, helper: "TurboBewerbungsHelfer") -> None:  # noqa: F821 – forward ref
        self.helper = helper

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def generate_letter(self, job_description: str, *, extra_prompt: Optional[str] = None, job_data: Optional[dict] = None) -> str:
        """Generate a German cover letter for *job_description*.

        Parameters
        ----------
        job_description:
            Raw job description text (can be trimmed beforehand).
        extra_prompt:
            Additional instructions for the LLM.
        job_data:
            Job metadata including title, company, location for proper subject line extraction.

        Returns
        -------
        str
            Generated application letter (DIN 5008 compliant).
        """
        return self.helper.generate_anschreiben(job_description, extra_prompt, job_data=job_data or {}) 