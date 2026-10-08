declare module "draco3dgltf" {
  interface Draco3D {
    createDecoderModule(options?: any): Promise<any>;
    createEncoderModule(options?: any): Promise<any>;
  }
  const draco3d: Draco3D;
  export default draco3d;
}
