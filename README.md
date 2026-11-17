# AR HUD — Conceptual Evaluation (video study)

A fully self-contained GitHub site: GitHub Pages serves the study, and the answers are written to a CSV file in a GitHub repo,
**one row per participant, filled in page by page, like a Google Form**. There is no other server, and participants can't download anything.

## Session flow
Participant ID → **GDPR consent** → demographics → three drives → final forced-choice ranking.

Each drive:
1. The briefing (`CLIP_INTRO`, the same in all three conditions) followed by the interface description.
2. The clip, muted, at 1.25× speed and zoomed 1.1×. SPACE presses are logged as "I notice a problem".
3. Open questions on the system failures.
4. TiA → NASA-TLX → SUS (A and T only), in the order of protocol §9.

- Explanation Satisfaction (§8) is left out on purpose: in a video study it would only be self-reported understanding. The open questions are coded instead.
- SSQ is skipped because there is no headset.
- Participants only ever see "Drive 1/2/3", never condition names (§9).
- Nothing is recorded before consent. If the participant declines, nothing is saved.
- **Fill in the `[BRACKETED]` placeholders in `config.js → CONSENT`** and have the text checked by your DPO or ethics committee.

**Order:** baseline (N) is always first. Version **A** is N → A → T and version **B** is N → T → A, alternating A, B, A, B…
The alternation is decided by the number of sessions already in `responses.csv`, so no separate counter is needed.
Force a version with `?v=A` or `?v=B`.

## 1. Publish
1. **Site repo** (public), e.g. `XAI-ARHUD`. The videos go in with **Git LFS** (files over 100 MB aren't allowed in plain Git):
   ```
   git lfs install                 # once per computer
   git add .gitattributes          # already tracks videos/*.mp4
   git add videos/*.mp4 && git commit -m "videos" && git push
   ```
   Then go to **Settings → Pages → Source: GitHub Actions**. The workflow `.github/workflows/pages.yml` publishes the site *with* the real videos;
   "Deploy from a branch" would serve LFS pointer files instead. Check the run in the **Actions** tab.
   Limits: the published site must be **≤ 1 GB**, and the workflow stops with an error if it's bigger.
   Each deploy that isn't cached downloads the videos once from LFS, which counts against your monthly LFS bandwidth.
2. **Data repo** (PRIVATE), e.g. `XAI-ARHUD-data`: create it empty. It holds `data/responses.csv`.
   Keep it separate: a Pages repo on a free account must be public, and the answers would then be public (GDPR).
   If your account or organisation can serve Pages from a private repo, you can use a single private repo.
3. Set `DATA_REPO: "AnonAuthor-26/XAI-ARHUD-data"` (already set) in `config.js`.

## 2. Connect each lab computer (once)
1. On GitHub, go to **Settings → Developer settings → Fine-grained tokens → Generate new token**.
   Give it access to the data repo only, with the permission **Contents: Read and write**, and set an expiry date after the study ends.
2. On the lab computer, open `https://anonauthor-26.github.io/XAI-ARHUD/?setup`, paste the token, then click **Save and test**.
   The page should say "Connected ✓ (private repo)".

The token is stored only in that browser and is never committed to a repo. GitHub automatically revokes tokens pushed to
public repos, and anyone could read one from the page. This is why sessions run on prepared lab computers, not on participants' own devices.
After the study, click **Disconnect this device**, or delete the token on GitHub.

## 3. The data: `data/responses.csv`
- **One row per participant.** It's created on the first page and updated after every page; each update is one commit.
- **Columns:** `started_at, participant_id, session_id, version, order, mode, consent_at, consent_version, completed, last_update, …`,
  then `<interface>_<questionnaire>_<item>` with interface = N / A / T, fixed whatever the order. For example:
  `A_TiA_tia09`, `T_NASA-TLX_rtlx_1to10`, `A_SUS_sus_score`, `N_Presses_press_times_s`, `T_Understanding_why_failure`, `Final_rank`.
  `<interface>_position` holds the drive number (1–3).
- **New columns** are appended on the right, as in a Google Form.
- **Updates merge:** a filled cell is never blanked. Two computers writing at once are handled by re-reading and retrying.
- **Upload queue:** until GitHub confirms a save, the latest snapshot waits in the browser. If the connection drops, it retries,
  including the next time the page is opened. The final page shows "All answers saved ✓"; don't close it before that.
- `completed = yes` once the final ranking is submitted. Abandoned sessions stay in the file with `completed = no`.

**Analysis notes**
- **SPACE presses** (`*_Presses_press_times_s`, separated by `;`) are in clip time, unaffected by the 1.25× speed. Compare them with the failure times in each clip.
- **Open answers** (`*_Understanding_*`): code them against the clip's actual failures as correct, partial, wrong or not noticed.

## Scales (same as the simulator-study Google Forms)
- **NASA-TLX:** 1–10, Very low → Very high, for all six subscales. `rtlx_1to10` is the mean.
- **SUS:** 1 = Strongly agree … 5 = Strongly disagree, the reverse of standard SUS coding. Raw answers are stored as given;
  `sus_score` (0–100) recodes them as 6 − raw first. Apply the same recoding to the simulator data before comparing.
- **TiA:** 5 labelled points + "No response". Stored as 1–5, and "No response" as `NR`. The Google Form exports text labels, so map them before merging.
- **Demographics:** the form's first five questions. Two added items (AR use, driver-assistance experience) are marked in `questionnaires.js`.

## Test mode
`…/?test` adds a **Skip video (test)** button on each clip and **Autofill (test)** on each questionnaire, plus an orange banner.
Test answers go to `data/TEST_responses.csv`, so real data and the A/B alternation are untouched. Add `&v=B` to test the other order.
`?debug` also disables the "watch to end" and required-answer checks.

## Videos
Put them in `/videos` as `XAI_none.mp4`, `XAI_ARHD.mp4` and `XAI_text.mp4`. Export settings are in `videos/README.md`.
- `PLAYBACK_RATE` (1.25) and `VIDEO_ZOOM` (1.1) are set in `config.js`. A 1.1× zoom crops 5 % on each side.
- Clips are always muted.

## Other
- **Dark mode:** it follows the device's setting by default; the **◐ Theme** button switches it manually.
- **Where to edit:** conditions, clips, orders and consent are in `config.js`; items are in `questionnaires.js`.

| URL | Effect |
|---|---|
| `?setup` | Connect this computer to the data repo (experimenter) |
| `?test` | Test mode |
| `?debug` | Test mode without validation |
| `?v=A` / `?v=B` | Force a version |
