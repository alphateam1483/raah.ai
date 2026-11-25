# First message to paste into Antigravity

Open this folder as the workspace, then paste the text below as the first message.

---

You are building the Raah.ai prototype in this workspace. Read these files first, in order: `AGENTS.md`, `README.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DATA_SPEC.md`, `docs/SEAT_MOCK_SPEC.md`, `docs/UX_SPEC.md`, `docs/DESIGN_SYSTEM.md`, `docs/TEST_PLAN.md`. Obey `AGENTS.md`.

Work in three phases and stop after each one so I can check:

**Phase 1: Logic.** Create a Vite + React project. Port `reference/search.py` to `src/lib/search.js` and `src/lib/time.js`, and write `src/lib/mockSeats.js` per `docs/SEAT_MOCK_SPEC.md`. Copy `data/corridor.json` to `public/data/`. Write Vitest tests for every parity row and unit test in `docs/TEST_PLAN.md`. Run them and show me the output. Do not build UI yet.

**Phase 2: UI.** Build the Search and Results screens exactly per `docs/UX_SPEC.md` using `src/styles/tokens.css` and the assets in `assets/`. Mobile first at 360 px. Show the prototype banner and the word "Simulated" as specified.

**Phase 3: Verify.** Run the UI acceptance tests in `docs/TEST_PLAN.md` in a browser: SSM to NDLS, NDLS to SSM, PNBE to NDLS, GAYA to ALD, BSB to CNB (class 3A, date 2026-11-12). Report what passed and what failed, with screenshots. Check there are no network requests other than the page and `corridor.json`.

If anything in the docs is unclear or conflicts, tell me what you assumed. Do not invent data, prices or features.
