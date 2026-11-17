// ============================================================
//  STUDY CONFIGURATION — edit this file only
// ============================================================
window.STUDY_CONFIG = {
  // Where responses.csv is written (one row per participant, like Google Forms).
  // The token is NOT here: enter it once per lab computer at  …/?setup  (stored only in that browser).
  DATA_REPO: "AnonAuthor-26/XAI-ARHUD-data",   // create it as a PRIVATE repo (GDPR)
  DATA_BRANCH: "main",
  DATA_DIR: "data",

  // Conditions and their clips. Put the files in /videos.
  // Each condition can hold one or more clips, played in sequence.
  // `briefing` = interface description from Participant_briefing_interfaces.pdf, shown before each drive
  // after CLIP_INTRO. Take-over sentences are removed: the clips are recordings, not interactive.
  // Labels are never shown to participants (protocol §9: "Drive 1/2/3" only).
  CONDITIONS: {
    baseline: {
      code: "N", label: "Without interface (N)", clips: ["videos/XAI_none.mp4"], sus: false,
      briefing: "In this drive, the car drives itself and you will not see any extra information. Watch the road as you normally would."
    },
    arhud: {
      code: "A", label: "Augmented reality (A)", clips: ["videos/XAI_ARHD.mp4"], sus: true,
      briefing: "In this drive, you will see what the car perceives and what it plans to do, drawn directly on the scene. A blue band on the road shows the path the car is going to follow. Boxes appear around the road users and obstacles the car has detected, such as cars, trucks, pedestrians, cyclists and roadworks. A yellow box means the car is aware of it. A red box means the car is reacting to it, for example braking or giving way. Some boxes also have an arrow showing where that road user is moving."
    },
    textual: {
      code: "T", label: "Text (T)", clips: ["videos/XAI_text.mp4"], sus: true,
      briefing: "In this drive, a short sentence appears in front of you, telling you what the car is doing and why. For example: “Pedestrian on the road ahead: braking”, or “Car crossing the junction: giving way”. The sentence changes whenever the car's reason changes."
    }
  },

  // Shown first in every briefing, identical in all three conditions.
  CLIP_INTRO: "In this clip you will see an automated driving session. During this session the vehicle will encounter various obstacles autonomously. Some of these encounters will result in a system failure. Press the SPACE bar as soon as you notice a situation the car is not handling safely.",

  // Short descriptions used only in the final ranking (end of session).
  RANK_LABELS: {
    baseline: "No extra information",
    arhud: "Information drawn on the scene (path, boxes)",
    textual: "Short sentence describing what the car does and why"
  },

  // Counterbalanced orders. Baseline is always first.
  // Versions alternate A, B, A, B… on each new session.
  VERSIONS: {
    A: ["baseline", "arhud", "textual"],
    B: ["baseline", "textual", "arhud"]
  },

  // Participant must watch each clip to the end before continuing.
  REQUIRE_FULL_VIEW: true,
  // Disable seeking in the player.
  BLOCK_SEEKING: true,
  // Zoom of the video inside its frame (1 = none). 1.1 crops 5 % on each side.
  VIDEO_ZOOM: 1.1,
  // Playback speed (1 = normal). Press times are logged on the video clock, so they stay in clip time.
  PLAYBACK_RATE: 1.25,

  // Informed consent shown before any data is recorded (GDPR, Reg. EU 2016/679).
  // Replace every [BRACKETED] placeholder before real sessions, and have it checked by your DPO / ethics committee.
  // (Institution details are left out of this public repo on purpose, for anonymity.)
  CONSENT: {
    version: "v1-2026-11",
    study: "This study evaluates how different in-vehicle interfaces (none, AR head-up display, text) affect the perceived workload, trust and usability of an automated vehicle. It is run by [DEPARTMENT, INSTITUTION]. Participation is voluntary and takes about 40 minutes.",
    procedure: "You will watch three short driving clips and answer questionnaires after each one. There are no right or wrong answers. You can stop at any time without giving a reason and without any consequence.",
    data: "We collect: a pseudonymous participant code (assigned by the experimenter), age, gender, driving experience and your questionnaire answers. We do not collect your name, e-mail, IP address, audio or video of you. The link between your code and your identity, if any, is kept only by the research team offline, separately from the data.",
    controller: "Data controller: [INSTITUTION, ADDRESS]. Study contact: [STUDY CONTACT E-MAIL]. Privacy information: [PRIVACY E-MAIL]. Data Protection Officer: [DPO E-MAIL].",
    legalBasis: "Your data are processed on the basis of your explicit consent (Art. 6(1)(a) GDPR), solely for scientific research (Art. 89 GDPR). Results are published only in aggregated, anonymous form.",
    storage: "Answers are stored as a CSV file in a private GitHub repository of the research team (GitHub acts as data processor; data may be processed outside the EU under the EU–US Data Privacy Framework / Standard Contractual Clauses). The website is hosted on GitHub Pages, which, like any web host, may log technical data such as IP addresses for security (see GitHub’s privacy statement). Data are kept until [DATE / e.g. 5 years after publication] and then deleted or fully anonymised.",
    rights: "You have the right to access, rectify and erase your data, to restrict or object to processing and to data portability (Art. 15–21 GDPR). You can withdraw your consent at any time (Art. 7(3) GDPR) by e-mailing [STUDY CONTACT E-MAIL] with your participant code; withdrawal does not affect processing done before it. You may lodge a complaint with your supervisory authority ([NATIONAL SUPERVISORY AUTHORITY, WEBSITE]).",
    statements: [
      "I have read and understood the information above and had the chance to ask questions.",
      "I am at least 18 years old and take part voluntarily; I know I can withdraw at any time.",
      "I consent to the processing of my pseudonymised data for the purposes described, in accordance with the GDPR."
    ]
  }
};
