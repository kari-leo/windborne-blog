import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(
	new URL("../src/components/homeagent/prototype-machines.ts", import.meta.url),
	"utf8",
);
const compiled = ts.transpileModule(source, {
	compilerOptions: {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ES2022,
	},
}).outputText;
const {
	initialHome,
	homeTransition: home,
	initialWarehouse,
	warehouseTransition: warehouse,
} = await import(
	`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
let assertions = 0;
const equal = (actual, expected, message) => {
	assert.equal(actual, expected, message);
	assertions++;
};
const homeTask = {
	type: "submit",
	item: "book",
	destination: "bedside",
	fault: "none",
	authorized: true,
};
const warehouseTask = {
	type: "submit",
	target: "B",
	strategy: "finish",
	permitted: true,
	available: true,
	failCalibration: false,
};
const tick = { type: "tick" };

// One task submission must be enough; all later actions come from the system clock.
equal(
	home(initialHome(), tick).phase,
	"create",
	"Idle clocks cannot start a home task",
);
for (const override of [
	{ item: "" },
	{ destination: "" },
	{ authorized: false },
])
	equal(
		home(initialHome(), { ...homeTask, ...override }).phase,
		"create",
		"Invalid or unauthorized home task cannot execute",
	);
let h = home(initialHome(), homeTask);
equal(h.phase, "execute", "One submission begins home execution");
equal(
	home(h, { ...homeTask, fault: "occupied" }).fault,
	"none",
	"Another submission cannot alter a running task",
);
for (let i = 0; i < 3; i++) {
	h = home(h, tick);
	equal(h.phase, "execute", "Completion must wait for placement verification");
}
h = home(h, tick);
equal(
	h.phase,
	"success",
	"System verification completes delivery without user receipt",
);
equal(home(h, tick).phase, "success", "Completed task remains completed");
equal(
	home(h, { type: "reset" }).phase,
	"create",
	"Reset returns to initial task setting",
);
for (const [fault, step] of [
	["missing", 1],
	["occupied", 3],
]) {
	h = home(initialHome(), { ...homeTask, fault });
	for (let i = 0; i <= step; i++) h = home(h, tick);
	equal(
		h.phase,
		"error",
		"An unresolvable fault ends execution without success",
	);
	equal(h.step, step, "Failure preserves the failed stage");
	equal(Boolean(h.error), true, "System reports the failure reason");
	for (let i = 0; i < 5; i++) h = home(h, tick);
	equal(h.phase, "error", "Automatic ticks cannot bypass a fault");
	equal(
		home(h, { type: "reset" }).fault,
		"none",
		"Reset clears the simulated fault",
	);
}
for (let step = 0; step < 4; step++) {
	h = home(initialHome(), homeTask);
	for (let i = 0; i < step; i++) h = home(h, tick);
	h = home(h, { type: "cancel" });
	equal(
		home(h, tick).phase,
		"cancelled",
		"User stop must prevent all later auto-completion",
	);
	equal(
		home(home(h, { type: "reset" }), tick).phase,
		"create",
		"Reset prevents stale clock ticks from starting a new task",
	);
}

equal(
	warehouse(initialWarehouse(), tick).phase,
	"request",
	"Idle clocks cannot start a warehouse task",
);
for (const override of [{ target: "" }, { strategy: "" }])
	equal(
		warehouse(initialWarehouse(), { ...warehouseTask, ...override }).phase,
		"request",
		"Missing task fields must block submission",
	);
for (const override of [{ permitted: false }, { available: false }]) {
	let w = warehouse(initialWarehouse(), { ...warehouseTask, ...override });
	w = warehouse(w, tick);
	equal(
		w.phase,
		"blocked",
		"System checks permissions and station availability",
	);
	equal(w.configLoaded, false, "Rejected task cannot load B configuration");
	for (let i = 0; i < 8; i++) w = warehouse(w, tick);
	equal(w.phase, "blocked", "Clock cannot bypass failed preconditions");
	equal(w.calibrated, false, "Rejected task cannot acquire calibration");
}
const expected = [
	"checking",
	"exiting",
	"migrating",
	"configuring",
	"calibrating",
	"b-ready",
	"b-running",
];
for (const strategy of ["finish", "safe-stop"]) {
	let w = warehouse(initialWarehouse(), { ...warehouseTask, strategy });
	for (const phase of expected) {
		equal(w.phase, phase, "System executes the full safe switch in order");
		if (phase === "calibrating")
			equal(
				w.configLoaded,
				true,
				"Configuration loads automatically before calibration",
			);
		if (phase === "b-ready")
			equal(w.calibrated, true, "Startup must follow successful calibration");
		w = warehouse(w, tick);
	}
	equal(
		w.phase,
		"b-running",
		"System starts B using the original task authorization",
	);
	equal(
		warehouse(w, { type: "stop" }).phase,
		"safe-stop",
		"Running B can be stopped",
	);
	equal(
		warehouse(w, { type: "reset" }).calibrated,
		false,
		"Reset clears previous calibration",
	);
}
let w = warehouse(initialWarehouse(), {
	...warehouseTask,
	failCalibration: true,
});
for (let i = 0; i < 5; i++) w = warehouse(w, tick);
equal(w.phase, "fault", "Failed calibration prevents B startup");
equal(w.calibrated, false, "Failed calibration never grants readiness");
equal(Boolean(w.error), true, "Calibration failure reports a reason");
for (let i = 0; i < 8; i++) w = warehouse(w, tick);
equal(w.phase, "fault", "Fault cannot auto-progress to running B");
for (const phase of expected) {
	w = warehouse(initialWarehouse(), warehouseTask);
	for (let i = 0; i < expected.indexOf(phase); i++) w = warehouse(w, tick);
	w = warehouse(w, { type: "stop" });
	equal(
		warehouse(w, tick).phase,
		"safe-stop",
		"Stopping at any execution stage prevents subsequent automatic work",
	);
	equal(
		warehouse(warehouse(w, { type: "reset" }), tick).phase,
		"request",
		"Reset cannot retain an active task",
	);
}
// A ready label alone cannot bypass system checks.
for (const override of [
	{ calibrated: false },
	{ configLoaded: false },
	{ permitted: false },
	{ available: false },
])
	equal(
		warehouse(
			{
				...initialWarehouse(),
				...warehouseTask,
				phase: "b-ready",
				configLoaded: true,
				calibrated: true,
				...override,
			},
			tick,
		).phase,
		"b-ready",
		"Readiness cannot bypass startup guards",
	);
console.log(
	`Prototype state checks passed: ${assertions} assertions (single submission, autonomous execution, system validation, faults, stop, reset).`,
);
