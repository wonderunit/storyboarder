

const chooseLoader = ({appLoaders, id}) => { 

    const exts = /(\.(glb|gltf|obj|dae|fbx|stl|png|jpeg|jpg|3ds|ply|exr|hdr|json))$/gim 
    const match = id.match(exts) 
    const ext = match ? match[0].toLowerCase() : null

    return { loader: appLoaders[ext], ext }
}

export default chooseLoader 