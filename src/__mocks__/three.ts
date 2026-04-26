const THREE = {
  WebGLRenderer: jest.fn().mockImplementation(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
    dispose: jest.fn(),
  })),
  Scene: jest.fn().mockImplementation(() => ({ add: jest.fn(), remove: jest.fn() })),
  PerspectiveCamera: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
  })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn().mockImplementation(() => ({ position: { set: jest.fn() } })),
  Color: jest.fn(),
  Vector3: jest.fn().mockImplementation(() => ({ x: 0, y: 0, z: 0 })),
  Box3: jest.fn().mockImplementation(() => ({
    setFromObject: jest.fn().mockReturnThis(),
    getCenter: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    getSize: jest.fn().mockReturnValue({ x: 1, y: 1, z: 1 }),
  })),
  MeshStandardMaterial: jest.fn(),
  BufferGeometry: jest.fn(),
  Mesh: jest.fn(),
  Group: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
  STLLoader: jest.fn(),
  OBJLoader: jest.fn(),
  GLTFLoader: jest.fn(),
}

export default THREE
export const WebGLRenderer = THREE.WebGLRenderer
export const Scene = THREE.Scene
export const PerspectiveCamera = THREE.PerspectiveCamera
export const AmbientLight = THREE.AmbientLight
export const DirectionalLight = THREE.DirectionalLight
export const Color = THREE.Color
export const Vector3 = THREE.Vector3
export const Box3 = THREE.Box3
export const MeshStandardMaterial = THREE.MeshStandardMaterial
export const BufferGeometry = THREE.BufferGeometry
export const Mesh = THREE.Mesh
export const Group = THREE.Group
