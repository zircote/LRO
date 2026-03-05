# Paper Directory

This directory contains the source documents for the LRO paper.

## Files

| File | Description |
|------|-------------|
| `LRO-paper.md` | Full paper (arXiv version with empirical evaluation) |
| `specification.md` | Original design specification |
| `references.md` | Bibliography and project references |

## Status

**Pre-print** — actively seeking peer review.

This paper has not been submitted to a venue.
Feedback is welcome via
[GitHub Issues](https://github.com/zircote/LRO/issues)
and [Discussions](https://github.com/zircote/LRO/discussions).

## Abstract

Tool-augmented language models face a structural mismatch:
retrieval operations return result sets whose token cost
far exceeds what the model consumes downstream.
This paper formalizes and empirically evaluates
*Large Result Offloading* (LRO), a token-aware
materialization strategy that writes large tool outputs
to structured files and returns a compact descriptor
in place of the full payload.

## Citation

See [CITATION.cff](../CITATION.cff) in the repository root.
