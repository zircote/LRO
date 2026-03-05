---
title: "LRO Validation Experiment"
description: "Experiment plan for empirical validation of Large Result Offloading assumptions: access ratio measurement, descriptor ablation, threshold sensitivity, task completion benchmarking, and latency profiling."
---

> **Informative.** This document is non-normative. It defines an experiment plan to empirically validate the assumptions underlying the [Large Result Offloading](/atlatl-spec/specification/large-result-offloading) specification. No implementation requirements are stated here. Results MAY inform future revisions to the LRO specification.

## Overview

This section specifies an experiment plan for empirical validation of the assumptions and claims made in the Large Result Offloading (LRO) design paper. LRO's analysis (Sections 5.1-5.3 of the paper) relies on parametric models and qualitative comparisons rather than measured performance against task-completion benchmarks. The experiments below are designed to close that gap.

## Goals

The experiment addresses six questions, each corresponding to a core LRO assumption:

| # | Question | Paper Reference | Assumption Under Test |
|---|----------|----------------|-----------------------|
| E1 | What is the empirical access ratio *k/n* across task types? | Section 5.1, Table 1 | Agents consume a small fraction of returned records (`k/n < 0.10`) |
| E2 | Does each descriptor component contribute independently to task completion? | Section 4.3 | The descriptor's value exceeds that of a bare file pointer |
| E3 | Is the default threshold reasonable, and how sensitive are outcomes to its value? | Section 5.1, 5.4 | tau = 1600 tokens is a reasonable default for the offload/inline boundary |
| E4 | Does LRO preserve task completion quality relative to full inline injection? | Section 5.2 | Offloading does not degrade downstream reasoning |
| E5 | What latency does materialization introduce, and does reduced context compensate? | Section 5.6 | Materialization overhead is small relative to inference-time savings |
| E6 | How do agents interact with the extraction query library? | Section 4.3, 4.4 | Pre-computed recipes reduce agent planning burden, including when adapted rather than cited verbatim |

## Experiment Design

### E1: Access Ratio Measurement

**Objective.** Measure the empirical distribution of *k/n* (records consumed / records returned) across a representative set of memory retrieval tasks.

**Method.**

1. Instrument the LRO interceptor to log every offloaded result set and every subsequent extraction query executed against it.
2. For each offloaded file, record:
   - `n`: total records in the file (from `OffloadHeader.count`)
   - `k`: distinct records accessed by the agent (union of records returned by all extraction queries the agent executes against the file)
   - `task_type`: classification of the originating task (e.g., "question answering", "summary generation", "memory management", "debugging")
   - `operation`: the MCP tool that triggered offloading (`recall_memories`, `inject_context`, `list_memories`, search)
   - `detail_level`: Light, Medium, or Full
3. Run a minimum of 200 instrumented sessions across at least 4 task categories, using at least 2 distinct LLM models (e.g., Claude Sonnet, GPT-4o).
4. For each session, the agent operates normally against a seeded memory store containing 500-2000 memories spanning 5+ namespaces.

**Metrics.**

| Metric | Definition |
|--------|-----------|
| `k/n` | Access ratio per offloaded result set |
| `k/n` by task type | Access ratio stratified by task classification |
| `k/n` by operation | Access ratio stratified by originating MCP tool |
| Zero-access rate | Fraction of offloaded files where `k = 0` (agent used descriptor summary only) |
| Full-access rate | Fraction of offloaded files where `k/n > 0.50` |

**Acceptance criteria.**

- Median `k/n` below 0.10 across all task types (validating the paper's "approximately 2%" representative scenario)
- Zero-access rate above 0.15 (validating that the descriptor summary alone is sufficient for some tasks)
- Full-access rate below 0.10 (validating that agents rarely need the majority of returned records)

**Null hypothesis.** H0: Median `k/n` >= 0.25, meaning agents routinely consume a quarter or more of returned records, reducing LRO savings below 75% for typical result sets.

### E2: Descriptor Ablation

**Objective.** Isolate the contribution of each descriptor component to task completion accuracy.

**Method.**

1. Define a task suite of 50 memory retrieval tasks with known correct answers. Tasks should span:
   - **Lookup tasks** (retrieve a specific memory by criteria): 15 tasks
   - **Aggregation tasks** (count, group, or rank memories): 15 tasks
   - **Synthesis tasks** (combine information from multiple memories): 10 tasks
   - **Filtering tasks** (select a subset matching complex criteria): 10 tasks

2. For each task, seed a memory store with 200-500 memories, of which 3-20 are relevant to the task. The correct answer is deterministic given the seeded data.

3. Run each task under five conditions, varying the descriptor content returned when LRO activates:

| Condition | Summary | Schema | Recipes | File Path | Guidance |
|-----------|---------|--------|---------|-----------|----------|
| **C1: Full LRO** | Yes | Yes | Yes | Yes | Yes |
| **C2: No recipes** | Yes | Yes | No | Yes | Yes (modified) |
| **C3: No schema** | Yes | No | Yes | Yes | Yes |
| **C4: Bare pointer** | No | No | No | Yes | Minimal |
| **C5: Full inline** | N/A | N/A | N/A | N/A | N/A |

- **C1** is the standard LRO descriptor as specified in [Large Result Offloading - Inline Response Format](/atlatl-spec/specification/large-result-offloading#inline-response-format).
- **C2** removes the `jq_recipes` array. The guidance prompt is modified to omit recipe references. The agent must formulate its own extraction strategy.
- **C3** removes the `line_schema` field. The agent must infer field structure from the file or from prior knowledge.
- **C4** returns only `{"offloaded": true, "file_path": "...", "count": N}`. The agent receives the file location and record count but no schema, recipes, or summary.
- **C5** is the no-offload baseline: the full result set is injected inline.

4. Each task x condition combination runs 3 times (to account for LLM non-determinism), using temperature 0 where supported.

5. Evaluate each run on:
   - **Correctness**: binary (correct/incorrect) against the known answer
   - **Tokens consumed**: total context tokens used during the task
   - **Tool calls**: number of shell/file tool invocations the agent makes
   - **Time to answer**: wall-clock time from task prompt to final answer

**Metrics.**

| Metric | Definition |
|--------|-----------|
| Task completion rate | Fraction of tasks answered correctly per condition |
| Token efficiency | Tokens consumed per correctly answered task |
| Extraction overhead | Number of tool calls per task (proxy for agent effort) |
| Completion time | Median wall-clock seconds per task |

**Acceptance criteria.**

- C1 (Full LRO) task completion rate within 5 percentage points of C5 (Full inline)
- C1 token consumption below 0.15x of C5 token consumption (validating 85%+ savings in practice)
- C1 exceeds C4 (bare pointer) on task completion rate by 10+ percentage points (validating descriptor value)
- C2 (no recipes) task completion rate measurably lower than C1, OR C2 tool call count measurably higher (validating recipe contribution)

**Null hypothesis.** H0: Task completion rate does not differ significantly between C1 and C4 (the descriptor components beyond a bare file pointer add no measurable value).

### E3: Threshold Sensitivity

**Objective.** Determine the relationship between the offload threshold tau and the combined metric of task completion quality + token efficiency.

**Method.**

1. Using the same task suite from E2, run condition C1 (Full LRO) with tau set to each of the following values:

| tau (tokens) | Approximate record count at t=155 | Rationale |
|-------------|-----------------------------------|-----------|
| 400 | ~3 records | Aggressive offloading; tests overhead at small n |
| 800 | ~5 records | Half of default |
| 1,600 | ~10 records | Current default |
| 3,200 | ~21 records | Double default |
| 6,400 | ~41 records | Conservative; most results returned inline |
| 12,800 | ~83 records | Very conservative; LRO rarely activates |

2. For each tau value, record:
   - Offload activation rate (fraction of tasks where LRO triggers)
   - Task completion rate
   - Median tokens consumed
   - Materialization overhead (file write time)

3. Additionally, run a sweep with adaptive threshold: tau_adaptive = min(tau_base, 0.10 * remaining_context_tokens). This tests the paper's suggestion (Section 5.4) that context-dependent thresholds may outperform static ones.

**Metrics.**

| Metric | Definition |
|--------|-----------|
| Activation rate | Fraction of tool calls where LRO triggers |
| Quality-efficiency frontier | Pareto curve of (task completion rate, median tokens consumed) across tau values |
| Optimal tau | Threshold value that maximizes task completion rate subject to token budget constraint |
| Adaptive vs static delta | Difference in quality-efficiency between adaptive and best static threshold |

**Acceptance criteria.**

- The default tau = 1600 falls within the Pareto-optimal region (not dominated by any other static threshold)
- tau values below 3200 show measurable increases in materialization overhead without proportional quality gains
- tau values above 25600 show measurable increases in token consumption without proportional quality gains
- Adaptive threshold either matches or exceeds the best static threshold

**Null hypothesis.** H0: Task completion rate and token efficiency are invariant to tau within the tested range (threshold selection does not matter).

### E4: Task Completion Benchmark

**Objective.** Compare LRO against baseline strategies on a standardized task suite with variable-length tool outputs.

**Method.**

1. Define a benchmark suite of 100 tasks organized into 4 difficulty tiers:

| Tier | Tasks | Result set size | Description |
|------|-------|----------------|-------------|
| Small | 25 | 10-40 records | Below default tau; LRO should not activate |
| Medium | 25 | 50-150 records | Above default tau; typical offload scenario |
| Large | 25 | 200-500 records | Well above tau; tests scaling behavior |
| Mixed | 25 | Variable (5-500) | Multiple tool calls per task with varying result sizes |

2. Run each task under four strategies:

| Strategy | Description |
|----------|-----------|
| **LRO** | Full LRO with default configuration (tau = 1600, full descriptor) |
| **Inline** | No offloading; full result set injected into context |
| **Truncation** | Result set truncated to tau tokens; no offloaded file |
| **Summary** | Result set replaced with an LLM-generated summary (lossy compression baseline) |

- The **Inline** strategy serves as the quality ceiling. If the full result set fits in context, all information is available.
- The **Truncation** strategy represents the naive approach: cut results to fit.
- The **Summary** strategy represents lossy compression: an LLM summarizes the result set before injecting into context. The summarization prompt requests preservation of key fields (id, title, namespace, confidence).

3. For the **Mixed** tier, tasks require multiple tool calls. The experiment measures whether LRO's per-result granularity (offloading large results while inlining small ones) outperforms strategies that apply uniformly.

4. Each strategy x task runs 3 times. Temperature 0 where supported.

**Metrics.**

| Metric | Definition |
|--------|-----------|
| Task completion rate | Correct answers / total tasks, per strategy per tier |
| Fidelity score | For tasks with structured answers, Jaccard similarity between predicted and gold answer fields |
| Token consumption | Total tokens consumed per task |
| Cost proxy | Token consumption * $/token (using published API pricing) |
| Failure modes | Categorization of incorrect answers: missing data, hallucination, wrong subset, timeout |

**Acceptance criteria.**

- LRO task completion rate at least 90% of Inline rate across all tiers
- LRO task completion rate exceeds Truncation rate by 15+ percentage points on Large tier
- LRO task completion rate meets or exceeds Summary rate on tasks requiring exact field values (where lossy compression drops precision)
- LRO token consumption below 0.20x Inline token consumption on Medium and Large tiers
- LRO failure modes do not include "hallucination" at higher rate than Inline (offloading should not cause the agent to fabricate data)

**Null hypothesis.** H0: LRO task completion rate is significantly lower than Inline (offloading degrades reasoning quality by removing information from context).

### E5: Latency and Throughput Profiling

**Objective.** Measure the end-to-end latency impact of LRO materialization and determine whether reduced context length compensates through faster inference.

**Method.**

1. Instrument the LRO interceptor with high-resolution timers at each stage:
   - `t_serialize`: time to serialize result set to JSONL string
   - `t_write`: time to write JSONL file to disk
   - `t_descriptor`: time to build the OffloadResponse (summary, schema, recipes)
   - `t_total_lro`: total LRO overhead (`t_serialize + t_write + t_descriptor`)

2. Instrument the MCP response path to measure:
   - `t_inline`: time to serialize and return an inline response (no-LRO path)
   - `t_response`: total time from operation completion to MCP response delivery

3. Measure inference-side timing:
   - `t_inference_lro`: time from MCP response receipt to agent's first action (with LRO descriptor)
   - `t_inference_inline`: time from MCP response receipt to agent's first action (with full inline result)
   - `t_extraction`: time for each extraction query execution (jq pipeline)
   - `t_task_total`: end-to-end wall-clock time per task

4. Run profiling across result set sizes: n = {25, 50, 100, 250, 500, 1000} records.

5. Run on two storage configurations:
   - Local SSD (typical development environment)
   - Network-attached storage (simulating shared filesystem deployments)

**Metrics.**

| Metric | Definition |
|--------|-----------|
| LRO overhead | Median `t_total_lro` across result set sizes |
| Overhead ratio | `t_total_lro / t_response` (fraction of response time consumed by LRO) |
| Inference speedup | `t_inference_inline / t_inference_lro` (inference time reduction from smaller context) |
| Net latency delta | `(t_total_lro + t_inference_lro + t_extraction) - t_inference_inline` (positive = LRO is slower, negative = LRO is faster) |
| Throughput | Tasks completed per minute under each strategy |
| Write throughput | MB/s for JSONL file writes across result set sizes |

**Acceptance criteria.**

- Median `t_total_lro` below 100ms for `n <= 500` on local SSD
- Median `t_total_lro` below 500ms for `n <= 500` on network-attached storage
- Net latency delta is negative (LRO is faster end-to-end) for `n >= 100`
- Overhead ratio below 0.05 (LRO adds less than 5% to total response time)

**Null hypothesis.** H0: Net latency delta is positive across all result set sizes (LRO's materialization overhead always exceeds inference-time savings from reduced context).

### E6: Query Composition Analysis

**Objective.** Characterize how agents interact with the extraction query library: which recipes they select, how they modify or combine them, and whether the library covers observed access patterns.

**Method.**

1. Using the instrumented sessions from E1, log every extraction query the agent executes against offloaded files. For each query, record:
   - `derivation_type`: one of `verbatim | parameterized | adapted | composed | novel` (see classification step 3 below)
   - `source_recipe_id`: recipe ID(s) the query derives from, or `null` for `novel` queries
   - `query_text`: the resolved jq filter expression applied to the file (for `lro_extract` invocations, the value of the `query` parameter; for shell-based extraction, the full shell command)
   - `result_size`: number of records returned by the query
   - `task_context`: the agent's stated reason for the extraction (from the preceding reasoning step, if available)

2. Additionally, run a controlled experiment with two conditions:
   - **Recipe condition**: agent receives the standard 10-recipe library
   - **No-recipe condition**: agent receives the file path and schema but no recipes (condition C2 from E2)

   In the no-recipe condition, log every extraction command the agent formulates independently.

3. Classify each extraction query in both conditions against the standard recipe library:
   - **Verbatim**: the agent invoked a recipe exactly as provided, without any modification
   - **Parameterized**: the agent invoked a recipe with substituted argument values — either via `lro_extract(recipe=N, params={...})` or by replacing filter literals in a shell jq command — without altering operators or pipeline structure
   - **Adapted**: the query is structurally based on a standard recipe but modifies operators, adds or removes pipeline stages, or combines fields beyond what the recipe specifies. Queries that pipeline multiple recipes and modify at least one are classified as Adapted.
   - **Composed**: the query pipelines two or more standard recipes without altering either recipe's operators
   - **Novel**: the query requires capabilities or structure not expressible from the standard library

When classification is performed by human raters, inter-rater reliability SHOULD achieve κ ≥ 0.80 on a calibration set of 50 pre-labeled queries before full classification begins.

**Metrics.**

| Metric | Definition |
|--------|-----------|
| Recipe usage distribution | Frequency of each recipe ID (via `source_recipe_id`) across all extractions |
| Recipe adoption rate | Fraction of extractions classified as non-Novel |
| Derivative usage rate | Fraction of extractions classified as Parameterized + Adapted + Composed |
| Novel query rate | Fraction of recipe-condition extractions classified as Novel |
| Composition rate | Fraction of extractions classified as Composed |
| Library coverage | Fraction of no-recipe-condition queries classifiable as any non-Novel class |
| Novel query catalog | Enumeration of Novel queries, candidates for library expansion |

**Acceptance criteria.**

- Recipe adoption rate > 0.70 (agents use the provided library for the majority of extractions)
- Derivative usage rate >= 0.20 (at least 20% of extractions modify or combine recipes rather than citing them verbatim)
- Novel query rate below 0.20 in the recipe condition
- Library coverage > 0.85 (the standard 10-recipe set covers 85%+ of observed access patterns across both conditions)
- The novel query catalog contains fewer than 5 distinct query patterns not coverable by the current library

**Null hypothesis.** H0: Recipe adoption rate below 0.40 (agents formulate unrelated queries at least 60% of the time, even when derivative usage is counted).

## Infrastructure Requirements

### Memory Store Seeding

All experiments require a reproducible seeded memory store. The seed corpus MUST:

- Contain 500-2000 memories (configurable per experiment)
- Span at least 5 namespaces (`_semantic/knowledge`, `_semantic/decisions`, `_procedural/patterns`, `_episodic/incidents`, `_episodic/sessions`)
- Include all memory types (`semantic`, `episodic`, `procedural`)
- Have realistic distributions of confidence scores (0.3-1.0, median ~0.7)
- Include enrichment data (entities, tags, relationships) on at least 60% of memories
- Be deterministic: same seed produces identical corpus across runs

The seed generator SHOULD produce corpora from a template domain (e.g., a simulated software project with architecture decisions, bug reports, patterns, and session logs) to ensure tasks have realistic retrieval patterns.

### Instrumentation

Implementations SHOULD provide a `LroExperimentLogger` that captures all metrics defined above without affecting the critical path. The logger:

- Writes structured JSONL event logs to a configurable directory
- Timestamps all events with microsecond precision
- Includes a session ID and task ID on every event for cross-referencing
- Operates asynchronously (log writes MUST NOT block the MCP response path)

> **Clarification:** The JSONL event types defined below are a **separate instrumentation layer** for experiment data collection. They are NOT [EventBus](/atlatl-spec/specification/events#eventbus-trait) `DomainEvent` variants and are not published through the `EventBus::publish()` mechanism. The EventBus carries operational domain events (e.g., `OffloadFileExpired`, `OffloadWriteFailed`) defined in [Events](/atlatl-spec/specification/events); the experiment logger writes observational records to flat files for offline analysis.

Event types:

```
lro.offload           - LRO activation (n, estimated_tokens, tau, detail_level, file_path)
lro.extraction        - Agent extraction query (derivation_type, source_recipe_id, query_text, result_size, file_path)
lro.access_complete   - Session summary (n, k, k/n, task_type, operation)
lro.timing            - Timing checkpoint (stage, duration_us)
lro.inline_fallback   - LRO not triggered; inline response returned (n, estimated_tokens, tau)
```

### Task Suite Construction

The 100-task benchmark suite (E4) MUST be:

- Published as a JSONL file with one task per line
- Each task includes: `task_id`, `prompt`, `expected_answer`, `tier`, `task_type`, `relevant_memory_ids`, `seed_corpus_id`
- Answers are deterministic given the seed corpus
- Tasks are reviewed for ambiguity (each task has exactly one correct answer given the seeded data)
- The suite is versioned and immutable once published (new tasks get new IDs; existing tasks are never modified)

Task format:

```json
{
  "task_id": "E4-001",
  "tier": "medium",
  "task_type": "lookup",
  "prompt": "What was the architecture decision about caching strategy?",
  "expected_answer": {
    "memory_ids": ["01JDEF..."],
    "fields": {"title": "ADR-007: Redis caching for session data", "namespace": "_semantic/decisions"}
  },
  "seed_corpus_id": "corpus-v1",
  "relevant_memory_count": 1,
  "total_recall_count": 247
}
```

### Model Configuration

Experiments SHOULD run against at least two LLM backends to control for model-specific effects:

| Model | Role | Rationale |
|-------|------|-----------|
| Claude Sonnet (latest) | Primary | Strong tool-use, representative of coding agent deployments |
| GPT-4o (latest) | Secondary | Different architecture, validates cross-model generalizability |

All model calls use temperature 0 (or lowest available) and a fixed system prompt containing only the standard atlatl MCP tool descriptions. No task-specific few-shot examples.

## Analysis Plan

### Statistical Methods

- **E1 (access ratio):** Report median, mean, interquartile range, and kernel density estimate of k/n. Stratify by task type and operation. Use Kruskal-Wallis test for between-group differences.
- **E2 (ablation):** Chi-squared test for task completion rate differences between conditions. Mann-Whitney U for token consumption and tool call count. Bonferroni correction for multiple comparisons across 5 conditions.
- **E3 (threshold):** Plot the quality-efficiency Pareto frontier. Identify the convex hull of (completion rate, 1/tokens) across tau values. Report whether tau = 1600 is Pareto-optimal.
- **E4 (benchmark):** Two-proportion z-test for completion rate differences between LRO and each baseline. Report effect sizes (Cohen's h). Stratify by tier.
- **E5 (latency):** Report median and 95th percentile for all timing metrics. Paired t-test for net latency delta. Plot latency components as stacked bar charts across result set sizes.
- **E6 (query analysis):** Descriptive statistics on `derivation_type` distribution. Report recipe adoption rate, derivative usage rate, and novel query rate with 95% binomial confidence intervals. Break down derivative usage by sub-class. Chi-squared test for recipe adoption rate vs. H0 threshold (0.40).

### Reporting

Results MUST be reported as a structured document containing:

1. **Summary table:** One row per experiment, showing primary metric, acceptance criterion, observed value, and pass/fail.
2. **Detailed results:** Per-experiment section with methodology notes, raw data references, statistical tests, and visualizations.
3. **Threats to validity:** Internal (task suite bias, model-specific effects), external (synthetic vs. real workloads), construct (access ratio as proxy for "usefulness").
4. **Recommendations:** Concrete changes to the LRO specification based on findings (threshold adjustment, recipe library modifications, descriptor changes).

## Execution Timeline

| Phase | Duration | Activities |
|-------|----------|-----------|
| **Setup** | 2 weeks | Build seed corpus generator, task suite, instrumentation harness |
| **E1 + E6** | 2 weeks | Instrumented sessions (run concurrently; E6 piggybacks on E1 logs) |
| **E2** | 1 week | Ablation study (250 task x condition runs) |
| **E3** | 1 week | Threshold sweep (300 task x threshold runs) |
| **E4** | 2 weeks | Full benchmark (1200 task x strategy runs across 2 models) |
| **E5** | 1 week | Latency profiling (standalone; can overlap with E4) |
| **Analysis** | 2 weeks | Statistical analysis, visualization, report writing |
| **Total** | ~10 weeks | |

## Relationship to Specification

This experiment plan is non-normative. It does not define implementation requirements. Results from these experiments MAY inform future revisions to the LRO specification, including:

- Adjustment of the default threshold (tau = 1600)
- Modifications to the standard recipe library (additions, removals, reordering)
- Changes to descriptor content (adding or removing fields from OffloadResponse)
- Refinement of conformance requirements based on which components prove essential

Cross-references:

- [Large Result Offloading](/atlatl-spec/specification/large-result-offloading) - the specification under test
- [Conformance Levels](/atlatl-spec/specification/conformance) - conformance requirements that may be adjusted based on findings
- [Configuration](/atlatl-spec/specification/configuration) - threshold and TTL defaults that may be revised
