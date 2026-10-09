import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/components/homeagent/prototype-machines.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { initialHome, homeTransition: home, initialWarehouse, warehouseTransition: warehouse } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
let assertions = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); assertions++; };
function createHome(fault = "none") {
  let state = home(initialHome(), { type: "start" });
  state = home(state, { type: "review", item: "book", destination: "bedside", fault });
  return home(state, { type: "execute", authorized: true });
}
let h = home(initialHome(), { type: "start" });
h = home(h, { type: "review", item: "", destination: "", fault: "none" });
equal(h.phase, "create", "Missing item and destination must block review");
h = home(h, { type: "review", item: "book", destination: "bedside", fault: "none" });
equal(home(h, { type: "execute", authorized: false }).phase, "confirm", "Authorization is required");
h = createHome();
equal(home(h, { type: "receive" }).phase, "execute", "Receipt cannot bypass execution");
for (let i = 0; i < 4; i++) h = home(h, { type: "advance" });
equal(h.phase, "receipt", "Delivery must wait for user confirmation");
equal(home(h, { type: "advance" }).phase, "receipt", "Delivery must not auto-complete");
h = home(h, { type: "receive" });
equal(h.phase, "success", "User confirmation completes the task");
equal(home(h, { type: "reset" }).phase, "intro", "Reset clears a completed flow");
for (const [fault, failureStep] of [["missing", 1], ["occupied", 3]]) {
  h = createHome(fault);
  for (let i = 0; i <= failureStep; i++) h = home(h, { type: "advance" });
  equal(h.phase, "error", `${fault} must pause the task`);
  equal(home(h, { type: "receive" }).phase, "error", "An error cannot be marked successful");
  equal(home(h, { type: "manual" }).phase, "manual", "Manual handling is separate from success");
  equal(home(h, { type: "cancel" }).phase, "cancelled", "An error can be cancelled");
  h = home(h, { type: "retry" });
  equal(h.step, failureStep, "Retry returns to the failed step without skipping it");
  while (h.phase === "execute") h = home(h, { type: "advance" });
  equal(h.phase, "receipt", "Recovery still requires user receipt");
  equal(home(h, { type: "receive" }).phase, "success", "Recovered task can complete");
}

function requestWarehouse(options = {}) {
  let state = warehouse(initialWarehouse(), { type: "start" });
  state = warehouse(state, { type: "request" });
  return warehouse(state, { type: "submit", target: "B", strategy: "finish", permitted: true, available: true, failCalibration: false, ...options });
}
function reachCalibration(failCalibration = false) {
  let state = warehouse(requestWarehouse({ failCalibration }), { type: "check" });
  equal(state.phase, "exiting", "A must exit safely before moving");
  state = warehouse(state, { type: "next" });
  equal(state.phase, "migrating", "Migration is a visible phase");
  state = warehouse(state, { type: "next" });
  equal(state.phase, "configuring", "Arrival is not readiness");
  equal(warehouse(state, { type: "configure", confirmed: false }).phase, "configuring", "Configuration must be confirmed");
  return warehouse(state, { type: "configure", confirmed: true });
}
equal(requestWarehouse({ target: "" }).phase, "request", "Target selection is required");
equal(requestWarehouse({ strategy: "" }).phase, "request", "Task policy is required");
for (const options of [{ permitted: false }, { available: false }]) {
  const blocked = warehouse(requestWarehouse(options), { type: "check" });
  equal(blocked.phase, "blocked", "Missing authorization or unavailable station blocks migration");
  equal(warehouse(blocked, { type: "next" }).phase, "blocked", "Blocked checks cannot be skipped");
  equal(warehouse(blocked, { type: "run", authorized: true }).phase, "blocked", "Blocked request cannot run B");
  equal(warehouse(blocked, { type: "edit" }).phase, "request", "Blocked checks can be edited");
}
let w = reachCalibration();
equal(warehouse(w, { type: "run", authorized: true }).phase, "calibrating", "Calibration must precede startup");
w = warehouse(w, { type: "validate" });
equal(w.phase, "b-ready", "Successful checks produce explicit B readiness");
equal(warehouse(w, { type: "run", authorized: false }).phase, "b-ready", "B startup requires final authorization");
w = warehouse(w, { type: "run", authorized: true });
equal(w.phase, "b-running", "Full successful switch starts B");
equal(warehouse(w, { type: "stop" }).phase, "safe-stop", "B can be stopped");
equal(warehouse(w, { type: "reset" }).calibrated, false, "Reset clears prior safety confirmation");
w = warehouse(reachCalibration(true), { type: "validate" });
equal(w.phase, "fault", "Calibration failure blocks readiness");
equal(w.calibrated, false, "Failed calibration cannot retain a pass flag");
equal(warehouse(w, { type: "run", authorized: true }).phase, "fault", "Failure cannot be bypassed to B running");
equal(warehouse(w, { type: "recover", corrected: false }).phase, "fault", "Recovery requires corrective action");
equal(warehouse(w, { type: "stop" }).phase, "safe-stop", "Failure can terminate safely");
w = warehouse(w, { type: "recover", corrected: true });
equal(w.phase, "calibrating", "Recovery must repeat the safety check");
equal(w.calibrated, false, "Recovery itself does not grant readiness");
w = warehouse(w, { type: "validate" });
equal(w.phase, "b-ready", "Repeated check enables readiness");
equal(warehouse(w, { type: "run", authorized: true }).phase, "b-running", "Recovered flow can run B");
console.log(`Prototype state checks passed: ${assertions} assertions (success, validation, failure, recovery, reset).`);
