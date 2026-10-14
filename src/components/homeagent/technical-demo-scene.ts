import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type {
	DemoBox,
	DemoScene,
	DemoSnapshot,
	Vec3,
} from "./technical-demo-model";

export interface DemoView {
	render(state: DemoSnapshot): void;
	resetCamera(): void;
	dispose(): void;
}
export function createDemoView(host: HTMLElement, config: DemoScene): DemoView {
	const home = config.product === "homeagent";
	const accent = home ? 0xb57a45 : 0x9172ab;
	const world = new THREE.Scene();
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.domElement.setAttribute(
		"aria-label",
		home
			? "家庭取书三维场景：机器人、取书台、床边交付台及规划取送路线"
			: "跨工位搬运与分类三维场景：A 搬运台、B 类别分拣区、授权避障区域与移动机器人",
	);
	renderer.domElement.setAttribute("role", "img");
	host.append(renderer.domElement);
	const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.minPolarAngle = 0.25;
	controls.maxPolarAngle = Math.PI / 2.2;
	controls.target.set(0, 0.3, 0);
	world.add(new THREE.HemisphereLight(0xffffff, 0xa69e92, 2.3));
	const sunlight = new THREE.DirectionalLight(0xffffff, 2.1);
	sunlight.position.set(-4, 9, 6);
	world.add(sunlight);
	const material = (color: number, opacity = 1) =>
		new THREE.MeshStandardMaterial({
			color,
			roughness: 0.85,
			transparent: opacity < 1,
			opacity,
		});
	const floorMat = material(0xe5e0d7);
	const bodyMat = material(home ? 0xe9e2d7 : 0x666475);
	const armMat = material(home ? 0xa18d77 : 0x9387a3);
	const darkMat = material(0x46444e);
	const itemMat = material(accent);
	const dangerMat = material(0xb96559);
	function cuboid(
		size: Vec3,
		point: Vec3,
		mat: THREE.Material,
		parent: THREE.Object3D = world,
	): THREE.Mesh {
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(size.x, size.y, size.z),
			mat,
		);
		mesh.position.set(point.x, point.y, point.z);
		parent.add(mesh);
		return mesh;
	}
	function label(text: string, point: Vec3, color = "#514750"): void {
		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = 96;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.fillStyle = "rgba(255,255,255,0.94)";
		ctx.roundRect(4, 4, 504, 88, 18);
		ctx.fill();
		ctx.fillStyle = color;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = '500 34px "Microsoft YaHei", sans-serif';
		ctx.fillText(text, 256, 49);
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		const sprite = new THREE.Sprite(
			new THREE.SpriteMaterial({ map: texture, depthTest: false }),
		);
		sprite.position.set(point.x, point.y, point.z);
		sprite.scale.set(2.2, 0.42, 1);
		world.add(sprite);
	}
	cuboid(config.supports[0].size, config.supports[0].center, floorMat);
	const grid = new THREE.GridHelper(12, 24, 0xb9afa2, 0xd1c8ba);
	grid.position.y = 0.005;
	world.add(grid);
	function table(box: DemoBox): void {
		cuboid(box.size, box.center, material(home ? 0xbfb09d : 0xb7b2be));
		for (const dx of [-0.42, 0.42])
			for (const dz of [-0.29, 0.29])
				cuboid(
					{ x: 0.07, y: 0.65, z: 0.07 },
					{ x: box.center.x + dx, y: 0.325, z: box.center.z + dz },
					darkMat,
				);
		label(box.name, { x: box.center.x, y: 0.1, z: box.center.z - 0.9 });
	}
	for (const box of config.supports.slice(1)) table(box);
	if (!home) {
		for (const [category, box] of Object.entries(config.sortTargets)) {
			const color = category === "blue" ? 0x678dad : 0xc69c56;
			const top = box.center.y + box.size.y / 2;
			const categoryPad = new THREE.Mesh(
				new THREE.PlaneGeometry(1.1, 0.8),
				material(color, 0.7),
			);
			categoryPad.rotation.x = -Math.PI / 2;
			categoryPad.position.set(box.center.x, top + 0.006, box.center.z);
			world.add(categoryPad);
		}
	}
	for (const box of config.obstacles) {
		cuboid(box.size, box.center, dangerMat);
		label(
			box.name,
			{
				x: box.center.x,
				y: box.center.y + box.size.y / 2 + 0.4,
				z: box.center.z,
			},
			"#9f443c",
		);
	}
	const destination = config.targetB;
	const pad = new THREE.Mesh(
		new THREE.PlaneGeometry(destination.size.x * 0.8, destination.size.z * 0.8),
		material(accent, 0.5),
	);
	pad.rotation.x = -Math.PI / 2;
	pad.position.set(destination.center.x, 0.755, destination.center.z);
	world.add(pad);
	if (home) {
		cuboid(
			{ x: 1.3, y: 0.45, z: 2.1 },
			{ x: 4.65, y: 0.225, z: -0.75 },
			material(0xbab1c1),
		);
		cuboid(
			{ x: 1.25, y: 0.1, z: 0.45 },
			{ x: 4.65, y: 0.5, z: -1.45 },
			material(0xf4efe7),
		);
		label("卧室 · 用户休息", { x: 4.65, y: 0.15, z: 0.7 });
		cuboid(
			{ x: 0.5, y: 0.9, z: 0.55 },
			{ x: -4.85, y: 0.45, z: -2.1 },
			darkMat,
		);
		label("独立中控机箱", { x: -4.85, y: 1.2, z: -2.1 });
	} else {
		const b = config.routeBounds;
		const allowed = new THREE.Mesh(
			new THREE.PlaneGeometry(b.maxX - b.minX, b.maxZ - b.minZ),
			material(0x68938b, 0.09),
		);
		allowed.rotation.x = -Math.PI / 2;
		allowed.position.set((b.minX + b.maxX) / 2, 0.012, (b.minZ + b.maxZ) / 2);
		world.add(allowed);
		const corners = [
			[b.minX, b.minZ],
			[b.maxX, b.minZ],
			[b.maxX, b.maxZ],
			[b.minX, b.maxZ],
			[b.minX, b.minZ],
		];
		const edge = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(
				corners.map(([x, z]) => new THREE.Vector3(x, 0.018, z)),
			),
			new THREE.LineDashedMaterial({
				color: 0x68938b,
				dashSize: 0.12,
				gapSize: 0.12,
			}),
		);
		edge.computeLineDistances();
		world.add(edge);
		label("授权局部避障区域", { x: 0, y: 0.1, z: 3.5 }, "#4c756e");
		cuboid(
			{ x: 0.55, y: 0.85, z: 0.5 },
			{ x: -4.85, y: 0.425, z: -2.1 },
			darkMat,
		);
		label("工位任务中控", { x: -4.85, y: 1.2, z: -2.1 });
		const marker = new THREE.Mesh(
			new THREE.RingGeometry(0.39, 0.45, 32),
			new THREE.MeshBasicMaterial({ color: accent, side: THREE.DoubleSide }),
		);
		marker.rotation.x = -Math.PI / 2;
		marker.position.set(config.stationB.x, 0.018, config.stationB.z);
		world.add(marker);
	}
	function drawRoute(points: Vec3[]): void {
		const geometry = new THREE.BufferGeometry().setFromPoints(
			points.map((point) => new THREE.Vector3(point.x, 0.025, point.z)),
		);
		const route = new THREE.Line(
			geometry,
			new THREE.LineDashedMaterial({
				color: accent,
				dashSize: 0.14,
				gapSize: 0.11,
			}),
		);
		route.computeLineDistances();
		world.add(route);
	}
	if (home) drawRoute(config.routeA);
	drawRoute(config.routeB);
	const robot = new THREE.Group();
	world.add(robot);
	cuboid({ x: 0.68, y: 0.23, z: 0.7 }, { x: 0, y: 0.26, z: 0 }, bodyMat, robot);
	cuboid(
		{ x: 0.42, y: 0.55, z: 0.38 },
		{ x: 0, y: 0.63, z: 0 },
		bodyMat,
		robot,
	);
	cuboid(
		{ x: 0.33, y: 0.13, z: 0.23 },
		{ x: 0, y: 0.98, z: 0 },
		darkMat,
		robot,
	);
	for (const x of [-0.37, 0.37])
		for (const z of [-0.22, 0.22]) {
			const wheel = new THREE.Mesh(
				new THREE.CylinderGeometry(0.16, 0.16, 0.09, 14),
				darkMat,
			);
			wheel.rotation.z = Math.PI / 2;
			wheel.position.set(x, 0.17, z);
			robot.add(wheel);
		}
	function rod(): THREE.Mesh {
		const mesh = new THREE.Mesh(
			new THREE.CylinderGeometry(
				home ? 0.055 : 0.085,
				home ? 0.055 : 0.085,
				1,
				12,
			),
			armMat,
		);
		world.add(mesh);
		return mesh;
	}
	const upperArm = rod();
	const foreArm = rod();
	const gripper = new THREE.Group();
	world.add(gripper);
	for (const x of [-0.3, 0.3])
		cuboid(
			{ x: 0.06, y: 0.22, z: 0.24 },
			{ x, y: 0.035, z: 0 },
			darkMat,
			gripper,
		);
	const itemA = cuboid(config.itemSize, config.sourceA, itemMat);
	const itemB = cuboid(
		config.itemSize,
		config.sourceB,
		material(config.sortCategory === "blue" ? 0x678dad : 0xc69c56),
	);
	itemB.visible = !home;
	function setRod(
		mesh: THREE.Mesh,
		from: THREE.Vector3,
		to: THREE.Vector3,
	): void {
		const axis = to.clone().sub(from);
		mesh.position.copy(from).add(to).multiplyScalar(0.5);
		mesh.scale.y = axis.length();
		mesh.quaternion.setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			axis.normalize(),
		);
	}
	let state: DemoSnapshot | undefined;
	let localRoute: THREE.Line | undefined;
	let renderedDetours = 0;
	function paint(): void {
		renderer.render(world, camera);
	}
	function resize(): void {
		const width = Math.max(host.clientWidth, 1);
		const height = Math.max(host.clientHeight, 1);
		const halfHeight = width < 500 ? 7 : 4.8;
		camera.left = (-halfHeight * width) / height;
		camera.right = (halfHeight * width) / height;
		camera.top = halfHeight;
		camera.bottom = -halfHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);
		paint();
	}
	function resetCamera(): void {
		camera.position.set(9, 11, 13);
		controls.target.set(0, 0.3, 0);
		controls.update();
		paint();
	}
	controls.addEventListener("change", paint);
	const observer = new ResizeObserver(resize);
	observer.observe(host);
	resetCamera();
	resize();
	return {
		resetCamera,
		render(next) {
			if (!home && next.detours !== renderedDetours) {
				if (localRoute) {
					world.remove(localRoute);
					localRoute.geometry.dispose();
					for (const mat of Array.isArray(localRoute.material)
						? localRoute.material
						: [localRoute.material])
						mat.dispose();
				}
				const geometry = new THREE.BufferGeometry().setFromPoints(
					next.activeRoute.map(
						(point) => new THREE.Vector3(point.x, 0.045, point.z),
					),
				);
				localRoute = new THREE.Line(
					geometry,
					new THREE.LineBasicMaterial({ color: 0x3c8b7d }),
				);
				world.add(localRoute);
				renderedDetours = next.detours;
			}
			if (
				state &&
				Math.hypot(next.robot.x - state.robot.x, next.robot.z - state.robot.z) >
					1e-5
			)
				robot.rotation.y = Math.atan2(
					next.robot.x - state.robot.x,
					next.robot.z - state.robot.z,
				);
			robot.position.set(next.robot.x, 0, next.robot.z);
			const shoulder = new THREE.Vector3(next.robot.x, 0.85, next.robot.z);
			const end = new THREE.Vector3(
				next.grip.x,
				next.grip.y + 0.05,
				next.grip.z,
			);
			const elbow = shoulder.clone().lerp(end, 0.45);
			elbow.y += 0.52;
			setRod(upperArm, shoulder, elbow);
			setRod(foreArm, elbow, end);
			gripper.position.copy(end);
			itemA.position.set(
				next.itemA.position.x,
				next.itemA.position.y,
				next.itemA.position.z,
			);
			itemB.position.set(
				next.itemB.position.x,
				next.itemB.position.y,
				next.itemB.position.z,
			);
			state = { ...next, robot: { ...next.robot } };
			paint();
		},
		dispose() {
			observer.disconnect();
			controls.removeEventListener("change", paint);
			controls.dispose();
			const geometries = new Set<THREE.BufferGeometry>();
			const materials = new Set<THREE.Material>();
			world.traverse((object) => {
				if (
					object instanceof THREE.Mesh ||
					object instanceof THREE.Line ||
					object instanceof THREE.Sprite
				) {
					if ("geometry" in object) geometries.add(object.geometry);
					for (const mat of Array.isArray(object.material)
						? object.material
						: [object.material])
						materials.add(mat);
				}
			});
			for (const mat of materials) {
				if ("map" in mat && mat.map instanceof THREE.Texture) mat.map.dispose();
				mat.dispose();
			}
			for (const geometry of geometries) geometry.dispose();
			renderer.dispose();
			renderer.domElement.remove();
		},
	};
}
