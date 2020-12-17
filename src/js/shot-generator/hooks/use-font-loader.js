import * as THREE from 'three'
import React, { useState, useEffect, useMemo } from 'react'
import createGeometry from 'three-bmfont-text'
import loadFont from 'load-bmfont'
import SDFShader from '../shaders/sdf-shader'



const useFontLoader = (fontPath, fontPngPath) => {

    const key = useMemo(() => ({}), [fontPath])
    const [cache] = useState(() => new WeakMap())
    const [loader] = useState(() => new THREE.TextureLoader())
    const [_, forceUpdate] = useState(false)
    
    let mounted
    useEffect(() => {
        mounted = true
        return () => {
            mounted = false
        }
    }, [])
    
    useEffect(() => {
        if (!cache.has(key)) {
            loadFont(fontPath, (err, font) => {
                // create a geometry of packed bitmap glyphs,
                // word wrapped to 300px and right-aligned
                var geometry = createGeometry({
                    width: 1000,
                    align: 'left',
                    font: font,
                    color: '#000',
                    threshold:0.1
                })
                // the texture atlas containing our glyphs
                loader.load(fontPngPath, function (texture) {
                // we can use a simple ThreeJS material
                    texture.minFilter = THREE.LinearMipMapLinearFilter
                    texture.magFilter = THREE.LinearFilter
                    texture.generateMipmaps = true

                    var material = new THREE.ShaderMaterial({
                        uniforms: THREE.UniformsUtils.clone( SDFShader.uniforms ),
                        fragmentShader: SDFShader.fragmentShader,
                        vertexShader: SDFShader.vertexShader,
                        side: THREE.DoubleSide,
                        transparent: true,
                        depthTest: false
                    })

                    material.uniforms.map.value = texture;
                    material.uniforms.color.value = new THREE.Color( '#000000' );

                    material.needsUpdate = true
                    let mesh = new THREE.Mesh(geometry, material)
                    mesh.textGeometry = geometry
                    cache.set(key, mesh)
                    mounted && forceUpdate(i => !i)
                })
            })
        }
        
        
    }, [fontPath])
    return cache.get(key) || null
}

export default useFontLoader
