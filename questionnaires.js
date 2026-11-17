// Items taken verbatim from the simulator-study Google Forms.
// TiA: same 6 columns as the simulator Google Form. Stored as 1–5, "No response" stored as "NR".
const TIA_SCALE = ["Strongly disagree", "Rather disagree", "Neither disagree nor agree", "Rather agree", "Strongly agree", "No response"];
const TIA_CODES = [1, 2, 3, 4, 5, "NR"];

window.QUESTIONNAIRES = {
  anagraphic: {
    title: "Anagraphic Data",
    sheet: "Anagraphic",
    items: [
      { id: "age", text: "Age", type: "number", min: 16, max: 100 },
      { id: "gender", text: "Gender", type: "choice",
        options: ["Male", "Female", "Other", "I prefer not to reply"] },
      { id: "driving_years", text: "Driving years (years with a valid driving licence)", type: "number", min: 0, max: 80 },
      { id: "shift", text: "Do you usually use a manual or automatic shift vehicle?", type: "choice",
        options: ["Manual", "Automatic", "Both"] },
      { id: "drive_freq", text: "How often do you drive?", type: "choice", vertical: true,
        options: ["More than 1500 kms monthly", "Between 1000 and 1500 kms monthly", "Between 500 and 1000 kms monthly",
                  "Between 200 and 500 kms monthly", "Less than 200 kms monthly"] },
      // Added for the conceptual study (not in the simulator form) — delete if not wanted.
      { id: "ar_freq", text: "How often do you use AR (e.g. head-up displays, AR glasses, AR apps)?", type: "linear",
        min: 1, max: 5, lo: "Never used", hi: "Daily" },
      { id: "adas", text: "Have you ever driven a car with driver-assistance or automated driving functions (e.g. adaptive cruise control, lane keeping, autopilot)?", type: "choice",
        options: ["Never", "Rarely", "Sometimes", "Often"] }
    ]
  },

  tlx: {
    title: "NASA-TLX",
    sheet: "NASA-TLX",
    intro: "Rate the workload you experienced while watching the clip(s), imagining you were the driver.",
    items: [
      { id: "mental", text: "Mental Demand", hint: "How mentally demanding was the task?", type: "linear", min: 1, max: 10, lo: "Very low", hi: "Very high" },
      { id: "physical", text: "Physical Demand", hint: "How physically demanding was the task?", type: "linear", min: 1, max: 10, lo: "Very low", hi: "Very high" },
      { id: "temporal", text: "Temporal Demand", hint: "How hurried or rushed was the pace of the task?", type: "linear", min: 1, max: 10, lo: "Very low", hi: "Very high" },
      { id: "performance", text: "Performance", hint: "How successful were you in accomplishing what you were asked to do?", type: "linear", min: 1, max: 10, lo: "Very low", hi: "Very high" },
      { id: "effort", text: "Effort", hint: "How hard did you have to work to accomplish your level of performance?", type: "linear", min: 1, max: 10, lo: "Very low", hi: "Very high" },
      { id: "frustration", text: "Frustration", hint: "How insecure, discouraged, irritated, stressed, and annoyed were you?", type: "linear", min: 1, max: 10, lo: "Very low", hi: "Very high" }
    ]
  },

  tia: {
    title: "Trust in Automation (TiA)",
    sheet: "TiA",
    intro: "Rate each item with reference to the automated vehicle shown in the clip(s).",
    scale: TIA_SCALE,
    codes: TIA_CODES,
    items: [
      "The system is capable of interpreting situations correctly.",
      "The system state was always clear to me.",
      "I already know similar systems.",
      "The developers are trustworthy.",
      "One should be careful with unfamiliar automated systems.",
      "The system works reliably.",
      "The system reacts unpredictably.",
      "The developers take my well-being seriously.",
      "I trust the system.",
      "A system malfunction is likely.",
      "I was able to understand why things happened.",
      "I rather trust a system than I mistrust it.",
      "The system is capable of taking over complicated tasks.",
      "I can rely on the system.",
      "The system might make sporadic errors.",
      "It is difficult to identify what the system will do next.",
      "I have already used similar systems.",
      "Automated systems generally work well.",
      "I am confident about the system’s capabilities."
    ].map((t, i) => ({ id: "tia" + String(i + 1).padStart(2, "0"), text: t, type: "likert" }))
  },

  sus: {
    title: "System Usability Scale (SUS)",
    sheet: "SUS",
    intro: "Rate each statement with reference to the interface shown in the clip(s).",
    // Same as the simulator form: 1 = Strongly agree … 5 = Strongly disagree (reversed vs. standard SUS).
    // Raw values are stored as in the form; sus_score recodes them before scoring.
    items: [
      "I think that I would like to use this system frequently.",
      "I found the system unnecessarily complex.",
      "I thought the system was easy to use.",
      "I think that I would need the support of a technical person to be able to use this system.",
      "I found the various functions in this system well-integrated.",
      "I thought there was too much inconsistency in this system.",
      "I would imagine that most people would learn to use this system very quickly.",
      "I found the system very cumbersome to use.",
      "I felt very confident using the system.",
      "I needed to learn a lot of things before I could get going with this system."
    ].map((t, i) => ({ id: "sus" + String(i + 1).padStart(2, "0"), text: t, type: "linear",
      min: 1, max: 5, lo: "Strongly agree", hi: "Strongly disagree" }))
  },

  // Open questions on the system failures, right after each clip.
  // `interfaceOnly` items are shown only for conditions with an interface (A, T).
  understanding: {
    title: "About the system failures",
    sheet: "Understanding",
    intro: "Think about the moments in the clip when the system failed.",
    items: [
      { id: "why_failure", type: "text",
        text: "What do you think went wrong? For each failure you remember, describe what happened and what the system failed to do." },
      { id: "anticipated", type: "text", interfaceOnly: true,
        text: "Did the information shown (path, boxes or sentence) help you notice the problem before it became critical? Why or why not?" },
      { id: "unclear", type: "text", optional: true,
        text: "Was anything in the clip unclear or surprising? (optional)" }
    ]
  },

  // Hoffman, Mueller, Klein & Litman (2018), arXiv:1812.04608, Appendix C. [software] -> "the system".
  // Displayed in the original order (agree strongly first); stored 5 = agree strongly … 1 = disagree strongly.
  expsat: {
    title: "Explanation Satisfaction",
    sheet: "ExpSat",
    intro: "Rate each statement with reference to the information shown during the drive you just watched.",
    scale: ["I agree strongly", "I agree somewhat", "I'm neutral about it", "I disagree somewhat", "I disagree strongly"],
    codes: [5, 4, 3, 2, 1],
    items: [
      "From the explanation, I understand how the system works.",
      "This explanation of how the system works is satisfying.",
      "This explanation of how the system works has sufficient detail.",
      "This explanation of how the system works seems complete.",
      "This explanation of how the system works tells me how to use it.",
      "This explanation of how the system works is useful to my goals.",
      "This explanation of the system shows me how accurate the system is.",
      "This explanation lets me judge when I should trust and not trust the system."
    ].map((t, i) => ({ id: "es" + String(i + 1).padStart(2, "0"), text: t, type: "likert" }))
  },

  // Forced-choice ranking (protocol §8). Options are filled in from config RANK_LABELS.
  final: {
    title: "Final ranking",
    sheet: "Final",
    items: [
      { id: "rank", text: "Rank the three drives by which interface you would prefer in an automated vehicle (1 = most preferred). Each rank can be used only once.", type: "rank" },
      { id: "why", text: "Why? (optional)", type: "text", optional: true },
      { id: "comments", text: "Any other comments (optional)", type: "text", optional: true }
    ]
  }
};
