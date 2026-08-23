var AUTOMATION_CONFIG = {
  writePrsHandler: "write_prs",
  writePrsHour: 0,
  writePrsMinute: 5,
  timeZone: "America/New_York",
  statusPropertyPrefix: "automation_status_",
};

var PUBLIC_STATS_CONFIG = {
  tokenProperty: "PUBLIC_STATS_TOKEN",
  timeZone: "America/New_York",
  lifts: [
    { id: "squat", name: "Squat", trainingMaxColumn: 11 },
    { id: "bench", name: "Bench", trainingMaxColumn: 1 },
    { id: "deadlift", name: "Deadlift", trainingMaxColumn: 21 },
  ],
};
