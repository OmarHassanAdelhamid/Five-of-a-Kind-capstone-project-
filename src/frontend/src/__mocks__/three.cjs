class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  negate() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }
  add() { return this; }
}
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}
class Raycaster {
  constructor() {}
  setFromCamera() {}
  intersectObjects() { return []; }
}
class Box3 {
  constructor() {
    this.min = new Vector3(Infinity, Infinity, Infinity);
    this.max = new Vector3(-Infinity, -Infinity, -Infinity);
  }
  expandByPoint(p) {
    return this;
  }
  getSize(target) {
    target.x = 1;
    target.y = 1;
    target.z = 1;
    return target;
  }
  getCenter(target) {
    target.x = 0.5;
    target.y = 0.5;
    target.z = 0.5;
    return target;
  }
}
class Color {
  constructor(hex) {
    this.hex = hex;
  }
  setHex(h) {
    this.hex = h;
    return this;
  }
  getHex() {
    return this.hex;
  }
}
class MeshStandardMaterial {
  constructor(opts) {
    this.color = new Color(opts?.color ?? 0xffffff);
  }
}

module.exports = {
  Vector3,
  Vector2,
  Raycaster,
  Box3,
  Color,
  MeshStandardMaterial,
  Scene: function () {
    this.add = function () {};
    this.remove = function () {};
    this.traverse = function (cb) { if (typeof cb === 'function') cb(this); };
  },
  PerspectiveCamera: function () {
    this.position = { set: function () {} };
    this.near = 0.1;
    this.far = 100;
    this.updateProjectionMatrix = function () {};
  },
  WebGLRenderer: function () {
    this.setPixelRatio = function () {};
    this.setSize = function () {};
    this.domElement = {};
    this.shadowMap = { enabled: false };
    this.dispose = function () {};
  },
  AmbientLight: function () {},
  DirectionalLight: function () {
    this.position = { set: function () {} };
    this.castShadow = false;
  },
  GridHelper: function () {
    this.position = { y: 0 };
    this.scale = { setScalar: function () {} };
  },
  BoxGeometry: function () {},
  InstancedMesh: function (geometry, material, count) {
    this.geometry = geometry;
    this.material = material;
    this.count = count;
    this.instanceMatrix = { setUsage: function () {}, needsUpdate: false };
    this.instanceColor = { needsUpdate: false };
    this.setMatrixAt = function () {};
    this.setColorAt = function () {};
    this.computeBoundingSphere = function () {};
    this.castShadow = false;
    this.receiveShadow = false;
  },
  Object3D: function () {
    const pos = { set: function () { return pos; }, add: function () { return pos; }, x: 0, y: 0, z: 0 };
    this.position = pos;
    this.matrix = {};
    this.updateMatrix = function () {};
  },
  Material: function () {
    this.dispose = function () {};
  },
  StaticDrawUsage: 1,
  Mesh: function () {
    this.rotation = { x: 0, y: 0, z: 0 };
    this.castShadow = false;
    this.receiveShadow = false;
  },
};
