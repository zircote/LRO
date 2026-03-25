# Large Result Offloading: Demand-Driven Context Management for Tool-Augmented Language Models

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Paper](https://img.shields.io/badge/Paper-Read_Online-4263eb.svg)](https://zircote.com/LRO/paper/)
[![Specification](https://img.shields.io/badge/Spec-Formal_Specification-7950f2.svg)](https://zircote.com/LRO/paper/specification/)
[![Status](https://img.shields.io/badge/Status-Independent_Research-22b8cf.svg)]()

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme-infographic-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/readme-infographic.svg">
  <img alt="LRO infographic: inline delivery collapses to 0-7% accuracy at scale, LRO achieves 73-100% accuracy with 40-62% token savings" src=".github/readme-infographic.svg" width="800">
</picture>

## About

This repository hosts an independent research paper on managing large tool outputs within the finite context windows of language models. The paper documents 126 evaluation runs across two models, three corpus scales, and two task types — real experiments with measurable results.

**Read the paper online:** [https://zircote.com/LRO](https://zircote.com/LRO)

### The honest version

I'm an independent researcher — no lab, no institution, no grant funding. I spent my own time and money exploring what the academic research process looks like, largely in cheat mode (LLM-assisted experimentation, AI-driven analysis, the works). I wanted to understand the process, validate some assumptions I had about context window management, and see if the ideas held up under scrutiny.

The assumptions largely held up. The findings are real. But I've run out of both the funds and the f's to give to push this through a formal academic pipeline. I'm not pursuing publication or patent. The itch to be first faded somewhere between the API bills and the realization that properly validating these things in a laboratory setting costs more time and money than I had left to spend.

So here it is. Take it for what it's worth.

## Why It's Here

Not because I think this is going to change the field. It's here because:

- **I did the work and it shouldn't rot in a private repo.** 126 eval runs, two models, actual findings — that's worth sharing even without a formal stamp.
- **Someone might find it useful.** If you're building tool-augmented LLM systems and hitting context limits, the LRO pattern works. I know because I use it in production.
- **I learned a lot about the process** and maybe this helps someone else who's curious about independent research without institutional backing.

If you want to try LRO yourself, there's a reference implementation at [`zircote/fastmcp-lro`](https://github.com/zircote/fastmcp-lro). I'll be sharing other related work as well.

## Repository Structure

| Path | Description |
|------|-------------|
| [`paper/LRO-paper.md`](paper/LRO-paper.md) | Main paper |
| [`paper/specification.md`](paper/specification.md) | Formal specification |
| [`paper/references.md`](paper/references.md) | Bibliography |
| [`CITATION.cff`](CITATION.cff) | Citation metadata |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to contribute |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Community guidelines |
| [`LICENSE`](LICENSE) | CC BY 4.0 |

## Feedback

I make no claims of formal academic rigor or laboratory-grade validity. I made a serious attempt to validate my assumptions, and they largely held — but I couldn't fund or sustain the kind of controlled study that would satisfy a review board.

If you have constructive feedback, corrections, ideas, or want to collaborate — genuinely welcome:

- **General feedback**. Use the [Feedback issue template](../../issues/new?template=feedback.yml)
- **Error reports / corrections**. Use the [Errata issue template](../../issues/new?template=errata.yml)
- **Collaboration proposals**. Use the [Collaboration issue template](../../issues/new?template=collaboration.yml)
- **Open discussion**. Visit [GitHub Discussions](../../discussions)

If you just want to bash the work without contributing anything, this isn't the repo for that.

## Citation

If you reference this work, please use the citation metadata provided in [CITATION.cff](CITATION.cff):

```bibtex
@misc{zircote2026lro,
 title = {Large Result Offloading: Demand-Driven Context Management for Tool-Augmented Language Models},
 author = {zircote},
 year = {2026},
 url = {https://zircote.com/LRO}
}
```

## License

This work is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE).

You are free to share and adapt this material for any purpose, including commercially, as long as appropriate credit is given.
