# AI Blogger Workflow Reference

Last updated: 2026-05-12

This document explains the AI Blogger generation workflow, where AI/API calls happen, what each stage does, how blocker fixing works, and how rerunning grounded research works.

## Main Generation Workflow

| Step | AI API Call? | What It Does |
| --- | --- | --- |
| 1. Website Intelligence | No | Crawls the website and extracts services, money pages, headings, FAQs, CTAs, proof points, previous blog topics, and internal-link targets. This is the foundation for topic fit, links, business fit, and later prompts. |
| 2. Topic Opportunity Gate | Sometimes | Checks Google Trends first. If no strict website-fit trend is found, it tries Search Console rising queries, then free internet/SERP trend research, then AI fallback only when needed. It rejects unrelated viral topics instead of forcing them into the blog. |
| 3. SERP Analysis | No LLM | Gets search results, competitors, People Also Ask, headings, related searches, dominant intent, and ranking difficulty. This uses search/trend APIs, not the blog-writing AI model. |
| 4. Grounded Research | No LLM | Fetches trusted source URLs, filters weak or unrelated sources, checks source-topic and source-service relevance, and saves sources for citations. |
| 5. Performance Feedback | No | Looks at stored Search Console/page performance snapshots to find refresh opportunities, CTR gaps, visibility decay, or useful query context. |
| 6. Deep Research | Yes | AI converts website context, SERP data, grounded sources, and topic context into research insights and source notes. |
| 7. Keywords | Yes | AI selects primary keyword, secondary keywords, meta keywords, section keyword angles, and winnability scores. |
| 8. SEO Analysis | Yes | AI builds the SEO plan: score target, word count target, meta direction, keyword usage guidance, and search-intent coverage. |
| 9. Brief Pack | Yes | AI creates the business-fit brief: audience, intent, CTA angle, content type, entity list, strategy score, and business-fit warnings. |
| 10. Outline Pack | Yes | AI creates article structure and headings before writing the full draft. |
| 11. Metadata Pack | Yes | AI writes title, meta title, meta description, excerpt, slug/social direction. |
| 12. FAQ Pack | Yes | AI writes structured FAQs from search intent, People Also Ask, related searches, and competitor gaps. |
| 13. Internal Links | No | Selects relevant service, offer, and blog links from website intelligence and existing posts. |
| 14. Write Blog | Yes | AI writes the full blog using the approved topic, brief, keywords, sources, internal links, FAQs, and SEO plan. |
| 15. Final AI Checker | Yes | AI reviews and improves the draft for SEO, citations, claim safety, link usage, tone, structure, and metadata. |
| 16. Quality Repair | Yes, when useful | AI tries to fix final quality blockers. The system accepts the repair only if the revised draft is safer or better. |
| 17. Quality Review | No | Deterministic scoring of intent satisfaction, original value, proof strength, cluster fit, conversion fit, and structure. |
| 18. Image | Sometimes | If image generation is enabled, AI creates an image prompt and/or generates a featured image. If disabled, the step is skipped. |

## Topic Selection Priority

Topic selection is designed to be dynamic for any website type.

1. Google Trends is checked first.
2. If a live Google trend strictly fits the website authority lane, it can be selected.
3. If Google Trends has viral topics but none fit the website, they are rejected.
4. Search Console rising queries are tried next when Search Console OAuth is connected or refreshable.
5. If Search Console is unavailable or produces no usable topic, free internet/SERP trend research is used inside the website authority lanes.
6. SERP comparison can rerank the best candidates for winnability, search intent, internal-link support, and duplicate risk.
7. If no website-fit topic can be found, the workflow should stop or save for review instead of writing an unrelated blog.

## Where AI API Calls Happen

Most deterministic data collection stages do not call the writing AI model. AI calls are used when reasoning, summarization, drafting, or rewriting is needed.

AI-backed stages:

- Topic discovery AI fallback, only when deterministic trend/source methods cannot provide a usable topic.
- Deep Research.
- Keywords.
- SEO Analysis.
- Brief Pack.
- Outline Pack.
- Metadata Pack.
- FAQ Pack.
- Write Blog.
- Final AI Checker.
- Quality Repair.
- AI Blocker Resolver.
- Cannibalization Retarget.
- Grounded Draft Refresh during rerun grounded research.
- Image prompt/image generation when enabled.

All normal AI text stages go through the same stage runner. The runner:

- Uses the configured stage provider/model.
- Retries provider failures.
- Uses the fallback API key when fallback is enabled and the primary key fails.
- Logs tokens, model/runtime config, raw output, and fallback-key usage.

## Final AI Checker

The Final AI Checker is a full draft reviewer. It receives the generated draft plus the SEO audit, grounded sources, internal-link plan, keyword plan, and business context.

It can improve:

- Title and meta fields.
- Claim wording and citation usage.
- Internal-link placement.
- Section flow and heading clarity.
- FAQ alignment.
- Tone and readability.
- SEO score and keyword coverage.

The system does not blindly trust it. The revised draft is compared with the original, and the revision is accepted only when it improves SEO/blockers safely.

CMS-only issues such as canonical URL are not treated as content-fixable blockers.

## Quality Repair

Quality Repair runs after the deterministic final quality judge finds blockers or when a repair pass is useful.

It receives the final draft and final quality assessment. It must directly fix the listed blockers instead of merely explaining them.

It is allowed to adjust:

- Unsupported claims.
- Weak source support.
- Intent mismatch.
- Missing original value asset.
- Thin structure.
- AI-style phrasing.
- Poor conversion fit.

It should preserve:

- Same core topic.
- Same audience.
- Same search intent.
- Same business fit.
- Same CTA direction.

The app accepts the repair only if the deterministic quality score/blocker result is better or at least safer. If the repair is weaker, the app keeps the original stronger draft.

## Fix Blocker With AI

The AI blocker resolver is a separate editor action for unpublished drafts. It does not publish, schedule, or advance workflow state.

Before calling AI, the system collects:

- Current SEO audit.
- Publish validation blockers.
- Website intelligence.
- SERP context.
- Grounded source context.
- Internal-link suggestions.
- Cannibalization report.

Blockers are grouped into:

- AI-fixable blockers: metadata, short content, missing FAQ, weak title, missing internal links, tone issues, unsupported claims, citation cleanup, source softening.
- Human-review blockers: issues needing editorial judgment or business approval.
- System/config blockers: webhook setup, scheduling, canonical/config, permissions, or other settings-level issues.

The AI returns a complete revised draft JSON, but the system does not automatically accept the entire rewrite.

Acceptance checks compare before and after:

- Did AI-fixable blockers reduce?
- Did publish blockers reduce?
- Did SEO improve or stay safe?
- Did word count remain valid?
- Did human/system blockers avoid getting worse?
- Did cannibalization risk avoid increasing?
- Did the draft preserve topic, audience, and business fit?

If the revision improves safely, the changed draft fields are saved. If not, the original draft is kept and the remaining blockers are reported.

## Cannibalization Retarget

Cannibalization retarget is a special blocker workflow for high overlap with an existing connected post.

It can change:

- Keyword target.
- Angle.
- Title.
- Metadata.
- Section framing.

It should keep:

- Same website/business relevance.
- Same overall commercial lane.
- A distinct search purpose from the overlapping post.

The system compares cannibalization risk before and after before saving.

## Rerun Grounded Research

Rerun Grounded Research is a separate editor action for unpublished drafts.

It is used when sources are missing, weak, stale, unrelated, or claims need better support.

How it works:

1. Uses the post primary keyword or title as the research query.
2. Runs SERP source discovery to collect fresh source URLs.
3. If SERP source discovery fails but stored sources exist, it can retry with stored source URLs.
4. Fetches source pages with cache bypass.
5. Filters sources by relevance, trust, freshness, and configured grounded-research rules.
6. Saves refreshed external sources and research notes.
7. If the draft has body content, it can call AI for a grounded draft refresh.
8. The AI refresh rewrites only as needed to align the draft with refreshed sources and clear claim-support blockers.
9. The system accepts the refreshed draft only if it improves claim grounding, blockers, or SEO safely.

If the AI draft refresh fails, the system can still save the refreshed source pack and keep the existing draft body unchanged.

Rerun Grounded Research is not a topic-selection tool. It improves the source pack and source alignment for an existing draft.

## What Happens When Quality Review Finds Blockers

The workflow should not waste the entire generation if the draft is otherwise useful.

Current intended behavior:

- Run Quality Repair when blockers are present.
- Re-score the repaired draft.
- If blockers remain, save the draft for SEO Review instead of discarding it.
- Show the blockers clearly so the user can fix or use the AI blocker resolver.

This prevents a long generation run from being lost at the last step.

## Important Notes

- Google Trends and SERP are not the same signal.
- Google Trends finds live viral topics.
- Search Console rising queries find website-specific demand growth.
- SERP/internet trend research finds website-fit SEO opportunities and recent public interest.
- The best traffic topic is usually a balance of trend momentum, website authority fit, search demand, low difficulty, and internal-link support.
- A viral topic with no website fit is rejected to protect authority.
- A website-fit topic with weak trend momentum can still be good for SEO, but it should not be described as a Google Trends topic.

