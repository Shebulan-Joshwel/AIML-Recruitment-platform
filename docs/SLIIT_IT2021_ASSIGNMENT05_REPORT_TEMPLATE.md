# IT2021 AIML Project – Assignment 05 Final Report (skeleton for Word)

**How to use:** Copy sections into Microsoft Word. Apply **Styles**: Heading 1 for chapters, Heading 2 / 3 for subsections. Insert **Table of Contents** (References → Table of Contents) after you apply headings. Set font **Times New Roman 11**, line spacing **1.2**, paragraph **Justify**, page size **A4**, default margins. Pre-body pages: **Roman numerals**; from Chapter 1: restart **Arabic 1, 2, 3…**

Replace all text in [brackets].

---

## PRE-BODY (pages i, ii, iii, …)

### Title Page

**Department of IT**  
**Faculty of Computing**  
**Sri Lanka Institute of Information Technology**

**IT2021: AIML Project**  
**2nd Year, Semester 2, 2026**

**Assignment 05 – Final Report**

**[Project title, e.g. AI-Assisted Recruitment Platform]**

**ITP Group Number:** [e.g. ITP-XX]  
**Campus:** [Matara / Malabe / …]

| Name | Student ID |
|------|------------|
| [Member 1] | [ITxxxxxxxxx] |
| [Member 2] | [ITxxxxxxxxx] |
| [Member 3] | [ITxxxxxxxxx] |
| [Member 4] | [ITxxxxxxxxx] |
| [Member 5] | [ITxxxxxxxxx] |
| [Member 6] | [ITxxxxxxxxx] |

**Date of submission:** [DD Month 2026]

---

### Declaration

We declare that this report is our own original work except where indicated by proper citation, and that it has not been submitted elsewhere for assessment. We confirm that we have participated equitably in the group project and that the contribution percentages in Appendix A reflect our agreement.

| Name | Student ID | Signature |
|------|------------|-----------|
| [Name] | [ID] | |
| [Name] | [ID] | |
| [Name] | [ID] | |
| [Name] | [ID] | |
| [Name] | [ID] | |
| [Name] | [ID] | |

**Date:** [DD Month 2026]

---

### Abstract (maximum one page)

[150–250 words. Summarize: problem, approach (including AIML role), main features, key results, and conclusion. No citations in abstract (optional: one sentence on evaluation).]

---

### Acknowledgement (maximum one page)

[Thank supervisors, lecturers, teammates, family, open-source projects, and data/tools. Keep professional tone.]

---

### Table of Contents

*(In Word: use built-in TOC; delete this placeholder.)*

---

### List of Tables

*(Insert after tables exist: References → Insert Table of Figures → choose Tables.)*

---

### List of Figures

*(Insert after figures exist.)*

---

### List of Abbreviations (alphabetical)

| Abbreviation | Meaning |
|--------------|---------|
| AIML | Artificial Intelligence and Machine Learning |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| JWT | JSON Web Token |
| REST | Representational State Transfer |
| [Add yours] | […] |

---

## MAIN BODY (page 1 = start of Chapter 1; Arabic numbering)

---

# Chapter 1: Introduction

## 1.1 Problem and motivation

[Describe hiring pain points: volume of CVs, bias, time cost, need for explainable matching. Why this project matters.]

## 1.2 Literature review

[Survey 4–8 credible sources: recruitment AI, resume parsing, matching/ranking, fairness/transparency. Use IEEE in-text citations [1], [2].]

## 1.3 Aim and objectives

**Overall aim:** [One paragraph.]

**Objectives:** (numbered)

1. [Objective 1 – e.g. secure role-based access]
2. [Objective 2 – e.g. AIML-based candidate–job matching/ranking]
3. [Objective 3 – e.g. recruiter workflows: jobs, billing, interviews]
4. [Add as needed]

## 1.4 Solution overview

[Describe the system in plain language: React frontend, Django REST API, PostgreSQL, JWT, main modules (resume, jobs, billing, ranking, career, interviews, optional RAG). Explain **where AIML fits** (e.g. TF–IDF, scoring, analytics).]

**Git repository (clickable in PDF):** [https://github.com/your-org/your-repo]  
*(In Word: Insert → Link → URL. Verify link works before PDF export.)*

---

# Chapter 2: Requirement Analysis

## 2.1 Stakeholder analysis

[Candidates, recruiters, admins, optional: subscription/billing. Table: stakeholder | needs | pain points.]

## 2.2 Feasibility and SWOT analysis

**Feasibility:** [Technical (stack), economic (tools cost), operational (team skills), schedule.]

**SWOT:**

| Strengths | Weaknesses |
|-----------|------------|
| … | … |

| Opportunities | Threats |
|---------------|---------|
| … | … |

## 2.3 Requirements modelling

**Functional:** [List or bullet: register/login, upload resume, post job, apply, rank, subscribe, schedule interview, …]

**Non-functional:** [Security JWT, performance, usability, maintainability.]

**Use cases / diagrams:** [Reference Figure 2.1 – use case diagram; Figure 2.2 – simple context diagram if applicable. **Explain** each figure in text.]

---

# Chapter 3: Design and Development

## 3.1 System / component architecture

[High-level: browser → REST API → services/apps → DB. Figure 3.1: architecture diagram. Explain layers and data flow.]

## 3.2 Process or workflow diagrams

[Examples: registration flow, apply → rank → shortlist → interview. Figure 3.2, 3.3. Explain steps.]

## 3.3 Database design

[ER diagram or logical schema – Figure 3.4. Describe main entities: User, Job, JobApplication, Resume, Subscription, InterviewSlot, … Relate to normalization briefly.]

## 3.4 AIML / development models

[Describe pipeline: text preprocessing, feature extraction, ranking/scoring, evaluation. Figure 3.5: workflow of AIML module. Tie to code modules / files at high level.]

## 3.5 API and security design

[REST resources, JWT, roles, HTTPS in production note.]

---

# Chapter 4: Results and Evaluation

## 4.1 System outcomes

[What was delivered; list major features with screenshots referenced (e.g. Figure 4.1 Recruiter dashboard).]

## 4.2 Functional testing

[Table: Test ID | scenario | expected | result (Pass/Fail). Reference test case documents if team has them.]

## 4.3 AIML evaluation

[Metrics: e.g. ranking consistency, example scores, limitations, manual review of explanations. If no formal dataset, state honestly and use qualitative evaluation / expert walkthrough.]

## 4.4 Performance or usability (optional)

[Load time, API latency rough notes, or heuristic usability.]

## 4.5 User feedback or expert evaluation (if any)

[Short summary of feedback from demo or peer review.]

---

# Chapter 5: Conclusion

## 5.1 Objectives revisited

[Map each objective from §1.3 to evidence (feature + outcome).]

## 5.2 Achievement of overall aim

[Two–three paragraphs.]

## 5.3 Key achievements

[Bulleted: technical, teamwork, documentation.]

## 5.4 Future work

[Scale, mobile app, stronger models, fairness audits, production deployment, monitoring.]

---

# References

[Use IEEE style. Number in order of appearance [1], [2], …]

[1] A. Author, “Title of paper,” *Journal*, vol. x, no. x, pp. xx–xx, year.  
[2] …

*(Use Zotero, Mendeley, or Word’s References tool to keep format consistent.)*

---

## POST-BODY

### Appendix A – Team contribution (1–2 pages)

**Instructions:** Agree percentages as a team; link to **evidence** (GitHub username/merged PRs, test cases, diagrams).

| Member | ID | Main responsibilities | Contribution % | Evidence (commits / PRs / artefacts) |
|--------|-----|-------------------------|----------------|--------------------------------------|
| [Name] | [ID] | [e.g. Resume + preprocessing] | [%] | [e.g. PR #3,4; `resume_management/`] |
| … | … | … | … | … |
| **Total** | | | **100%** | |

**Declaration:** We confirm the percentages above were agreed by all members on [date].

Signatures: _______________ _______________ …

---

### Appendix B – Supporting material (optional)

[Screenshots of main UIs, extended test tables, user guide excerpt, **sanitized** git log snippet. Label figures B.1, B.2. Refer from main text: “see Appendix B, Figure B.1”.]

---

## Formatting checklist (quick)

| Item | Setting |
|------|---------|
| Page | A4, default margins |
| Body font | Times New Roman 11 |
| Line spacing | Multiple 1.2 |
| Paragraph | Justify |
| Chapter heading | Heading 1: 16 pt, Bold, Center, lower border (per coursework) |
| Heading 2 | 12 pt, Bold, Underlined, left |
| Heading 3 | 11 pt, Bold, Underlined, left |
| Pre-body numbering | i, ii, iii, … |
| Main body numbering | From Introduction = page 1 (Arabic) |
| Figures/tables | “Figure 3.1: …” / “Table 4.1: …” per chapter |

---

*Word count for main body: target **20–30 pages** as per brief; adjust depth per chapter.*
