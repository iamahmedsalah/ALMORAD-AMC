'use client';
import {Suspense, useEffect, useMemo, useRef} from 'react';
import {Canvas, useFrame, useLoader, useThree} from '@react-three/fiber';
import {Box3, Group, MathUtils, PMREMGenerator, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
function StudioEnvironment() {
  const {gl,scene} = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room,.04);
    // Three.js owns this mutable scene outside React's rendering state.
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = environment.texture;
    return () => {scene.environment=null;environment.dispose();room.dispose();pmrem.dispose();};
  },[gl,scene]);
  return null;
}
function Mark({active, onReady}: {active:boolean;onReady:()=>void}) {
  const asset = useLoader(GLTFLoader,'/3d/mc-logo.glb');const group=useRef<Group>(null);
  const model = useMemo(() => {
    const scene = asset.scene.clone(true);scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);const size=box.getSize(new Vector3());const center=box.getCenter(new Vector3());
    const scale = 5.2/Math.max(size.x,size.y,size.z);scene.scale.multiplyScalar(scale);scene.position.sub(center.multiplyScalar(scale));
    return scene;
  },[asset]);
  useEffect(() => {onReady();},[onReady]);
  useFrame(({clock,pointer},delta) => {
    if (!active || !group.current) return;
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y,pointer.x*.16,3,delta);
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x,-pointer.y*.1,3,delta);
    group.current.position.y = Math.sin(clock.elapsedTime*.65)*.09;
  });
  return <group ref={group} rotation={[.06,-.12,0]}><primitive object={model}/></group>;
}
export default function LogoScene({active,onReady,onFailure}: {active:boolean;onReady:()=>void;onFailure:()=>void}) {
  return <Canvas aria-hidden="true" dpr={[1,1.5]} camera={{position:[0,0,9],fov:36}} frameloop={active?'always':'never'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} onCreated={({gl}) => {gl.domElement.addEventListener('webglcontextlost',onFailure,{once:true});}}>
    <ambientLight intensity={.7}/><directionalLight position={[3,4,5]} intensity={3}/><directionalLight position={[-4,0,2]} intensity={1.2}/>
    <Suspense fallback={null}><StudioEnvironment/><Mark active={active} onReady={onReady}/></Suspense>
  </Canvas>;
}
