// plane.js — the Meridian Kestrel: a built-looking low-wing prop plane.
// Fuselage, canopy, tapered wings, tail, spinning prop, gear and nav lights —
// assembled from parts, never a triangle. Forward is -Z in local space.

function buildPlane() {
  const plane = new THREE.Group();
  plane.name = 'kestrel';
  plane.scale.setScalar(1.3); // read big in the chase view
  const orange = new THREE.MeshPhongMaterial({ color: 0xe85d1f, shininess: 55 });
  const white = new THREE.MeshPhongMaterial({ color: 0xf2ede2, shininess: 55 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x2c313a, shininess: 30 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x1d4e6e, shininess: 120, specular: 0xaaddff });

  // Fuselage: tapered cylinder + nose cone.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.62, 6.4, 14), orange);
  body.rotation.x = Math.PI / 2;
  body.position.z = 0.2;
  plane.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.6, 14), white);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.9;
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.8, 12), orange);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 4.2;
  plane.add(tailCone);

  // Canopy: tinted glass bubble the pilot sits under.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), glass);
  canopy.scale.set(0.85, 0.75, 1.7);
  canopy.position.set(0, 0.85, -0.9);
  plane.add(canopy);

  // Main wing: one wide box, slightly swept by scaling the tips via two panels.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 2.3), white);
  wing.position.set(0, -0.15, -0.3);
  plane.add(wing);
  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.06, 0.5), orange);
  wingStripe.position.set(0, -0.02, -1.1);
  plane.add(wingStripe);
  // Wingtip nav lights: red port, green starboard.
  const tipL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  tipL.position.set(-5.75, -0.1, -0.3);
  const tipR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
  tipR.position.set(5.75, -0.1, -0.3);
  plane.add(tipL); plane.add(tipR);

  // Tail: vertical fin + horizontal stabilisers.
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 1.5), orange);
  fin.position.set(0, 0.95, 4.4);
  fin.rotation.x = -0.25;
  plane.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.3), white);
  stab.position.set(0, 0.25, 4.5);
  plane.add(stab);

  // Propeller: hub + two blades, spins in updatePlaneVisual.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -4.85);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.22, 3.6, 0.12);
  const blade1 = new THREE.Mesh(bladeGeo, dark);
  const blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade1); prop.add(blade2);
  plane.add(prop);

  // Landing gear: two wheels + struts, plus a tail wheel.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    strut.position.set(side * 1.1, -0.9, -0.6);
    plane.add(strut);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(side * 1.1, -1.45, -0.6);
    plane.add(wheel);
  }

  // Soft blob shadow that follows the plane over the ground.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.name = 'blob-shadow';
  plane.add(shadow);

  plane.userData.prop = prop;
  plane.userData.shadow = shadow;
  return plane;
}

function updatePlaneVisual(plane, state, dt) {
  // Spin the prop faster with throttle; park it when the engine is out.
  const spin = state.engineOut ? 0.5 : 4 + state.throttle * 38;
  plane.userData.prop.rotation.z += spin * dt;
  // Blob shadow: stick it to the ground under the plane, fade with height.
  const ground = terrainHeight(state.pos.x, state.pos.z);
  const heightAbove = Math.max(0, state.pos.y - ground);
  plane.userData.shadow.position.set(0, -heightAbove + 0.4, 0);
  plane.userData.shadow.material.opacity = Math.max(0, 0.30 - heightAbove * 0.0011);
  // Bank the whole airframe with roll, pitch with pitch.
  plane.rotation.set(state.pitch, state.heading, state.roll, 'YXZ');
  plane.position.copy(state.pos);
}
