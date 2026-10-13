import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/components/homeagent/technical-demo-model.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { DemoSimulation, samples, boxesOverlap, sweptCollision, stepGravity, distance, selectLocalRoute, insideRouteBounds } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
let count = 0;
const check = (condition, message) => { assert.ok(condition, message); count++; };
function finish(sim, dt = 1 / 60) {
  for (let i = 0; i < 6000 && sim.state.status === "running"; i++) sim.step(dt);
  check(sim.state.status !== "running", "Every sample must reach a terminal result");
  return sim.state;
}
for (const product of ["homeagent", "retask"]) {
  for (const sample of samples[product]) {
    const sim = new DemoSimulation(product, sample.id);
    sim.step(10);
    check(sim.state.status === "idle", "No sample executes before user submits");
    sim.start();
    const result = finish(sim);
    check(result.status === ((sample.id === "normal" || sample.id === "obstacle") ? "success" : "fault"), `${product}/${sample.id}: expected result`);
    const terminals = sim.terminals();
    check(terminals.map((terminal) => terminal.name).join("/") === "机器人本体端/中控端/用户端", "All three terminal panels are present");
    check(terminals[2].status.includes((sample.id === "normal" || sample.id === "obstacle") ? "完成通知" : "未完成通知"), "User terminal receives actual result");
    const before = JSON.stringify(sim.snapshot());
    sim.step(0.2);
    check(JSON.stringify(sim.snapshot()) === before, "Terminal states do not continue executing");
    if (sample.id === "normal" || sample.id === "obstacle") {
      check(result.completed === (product === "homeagent" ? 1 : 2), "Every required placement is physically verified");
      check(result.itemA.landed === (product === "homeagent" ? "床边交付台" : "A 补料台"), "Item A rests on the correct surface");
      if (product === "retask") check(result.itemB.landed === sim.scene.targetB.name, "B must complete its own placement");
    }
    if (sample.id === "occupied") {
      check(result.held === "A" && !result.itemA.landed, "Occupied zone must not release the book");
      check(result.completed === 0, "Occupied delivery cannot count as success");
    }
    if (sample.id === "dropped") {
      check(result.itemA.landed === "地面" && result.held === null, "Lost holding force produces an actual gravity drop");
      check(result.itemA.position.y === sim.scene.itemSize.y / 2, "Dropped book contacts floor at correct height");
    }
    if (sample.id === "obstacle") {
      check(result.detours === 1, "A local detour is computed without user intervention"); check(result.activeRoute.every(point => insideRouteBounds(point, sim.scene.routeBounds)), "Every planned point respects the authorization boundary"); for (let i = 1; i < result.activeRoute.length; i++) check(!sim.scene.obstacles.some(box => sweptCollision(result.activeRoute[i - 1], result.activeRoute[i], box)), "Every planned segment clears the base footprint");
      check(result.completed === 2 && result.itemB.landed === "B 琥珀色分拣区", "Detour completes A transport and amber sorting");
    }
    if (sample.id === "sort-full") {
      check(result.completed === 1 && result.reason.includes("满载"), "Selected sorting area being full preserves A and fails B");
      check(result.itemB.position.y === sim.scene.sourceB.y, "B remains untouched when its category zone is full");
    }
  }
}
for (const product of ["homeagent", "retask"]) {
  const sim = new DemoSimulation(product);
  sim.start();
  sim.step(0.2);
  sim.stop();
  const before = JSON.stringify(sim.snapshot());
  sim.step(0.2);
  check(JSON.stringify(sim.snapshot()) === before, "Active stop freezes task and physical motion");
  check(sim.terminals()[2].status.includes("未完成通知"), "Stopped task must not claim success");
}
const box = { name: "obstacle", center: { x: 0, y: 0.5, z: 0 }, size: { x: 1, y: 1, z: 1 } };
check(sweptCollision({ x: -5, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, box), "Fast motion cannot tunnel through obstacles");
check(!sweptCollision({ x: -5, y: 0, z: 2 }, { x: 5, y: 0, z: 2 }, box), "Nearby but clear route is allowed");
check(!boxesOverlap(box, { ...box, center: { x: 3, y: 0.5, z: 0 } }), "Separated boxes do not overlap");
const body = { position: { x: 0, y: 2, z: 0 }, velocity: 0, landed: "" };
stepGravity(body, { x: 0.5, y: 0.1, z: 0.3 }, 0.1, []);
check(Math.abs(body.position.y - (2 - 0.5 * 9.81 * 0.01)) < 1e-8, "Gravity uses actual time integration");
const floor = { name: "floor", center: { x: 0, y: -0.1, z: 0 }, size: { x: 10, y: 0.2, z: 10 } };
for (let i = 0; i < 60; i++) stepGravity(body, { x: 0.5, y: 0.1, z: 0.3 }, 1 / 60, [floor]);
check(body.landed === "floor" && body.position.y === 0.05 && body.velocity === 0, "Contacts prevent penetration and settle the object");
// Modify geometry and force values independently of sample names.
const blocked = new DemoSimulation("retask", "normal");
blocked.scene.obstacles.push({ name: "new obstacle", center: { x: 0, y: 0.5, z: 2 }, size: { x: 1, y: 1, z: 1 } });
blocked.start();
check(finish(blocked).status === "success" && blocked.state.detours === 1, "Geometry change in a normal sample triggers a successful local detour");
const noSupport = new DemoSimulation("homeagent", "normal");
noSupport.scene.supports = noSupport.scene.supports.filter((support) => support.name !== "床边交付台");
noSupport.start();
check(finish(noSupport).status === "fault", "Missing physical support cannot be validated as successful placement");
const weakGrip = new DemoSimulation("homeagent", "normal");
weakGrip.scene.holdForce = 0.5;
weakGrip.start();
check(finish(weakGrip).itemA.landed === "地面", "Force calculation, not sample label, determines dropping");
for (const dt of [1 / 30, 1 / 120]) {
  const sim = new DemoSimulation("retask");
  sim.start();
  const state = finish(sim, dt);
  check(state.status === "success" && state.itemB.landed === sim.scene.targetB.name, "Frame rate does not alter normal result");
}
const wall = new DemoSimulation("retask", "normal");
wall.scene.obstacles.push({ name: "full corridor wall", center: { x: 0, y: 0.5, z: 1 }, size: { x: 0.7, y: 1, z: 5 } });
check(selectLocalRoute(wall.scene.stationA, wall.scene.stationB, wall.scene.localRoutes, wall.scene.obstacles, wall.scene.routeBounds) === null, "Blocked authorization corridor cannot be bypassed outside its boundary");
wall.start();
check(finish(wall).status === "fault" && wall.state.completed === 1, "No authorized detour stops before B while preserving completed A");
const live = new DemoSimulation("retask", "obstacle");
live.start();
let continuous = true;
let confined = true;
for (let i = 0; i < 3000 && live.state.status === "running"; i++) {
  const previousPosition = { ...live.state.robot };
  live.step(1 / 60);
  continuous &&= distance(previousPosition, live.state.robot) < 0.045;
  confined &&= insideRouteBounds(live.state.robot, live.scene.routeBounds);
}
check(continuous, "Route switching and tracking cannot teleport the robot across any frame");
check(confined, "Base footprint stays inside its authorized boundary throughout execution");
check(live.state.status === "success", "Continuous local route tracking completes");
const mislabelled = new DemoSimulation("retask", "normal");
mislabelled.scene.sortCategory = "amber";
mislabelled.start();
check(finish(mislabelled).itemB.landed === "B 琥珀色分拣区", "Classification reads item category rather than the sample name");
const full = new DemoSimulation("retask", "normal");
full.scene.obstacles.push({ name: "full sorting area", center: { x: 4.2, y: 1, z: -1.4 }, size: { x: 1, y: 0.5, z: 0.7 } });
full.start();
check(finish(full).status === "fault" && full.state.held === null, "Actual target occupancy prevents picking and wrong-category substitution");
console.log(`Technical demo checks passed: ${count} assertions (six samples, three terminals, authorized local route switching/tracking, sorting, gravity/contact, stop, frame rates).`);
