import traverseMeshMaterials from "../../../shot-generator/helpers/traverse-mesh-materials"

export default (ref, isSelected, defaultColor = 0xcccccc, defaultTintColor = 0x000000) => {
  traverseMeshMaterials(ref.current, material => {
    if (material.emissive) {
      if (isSelected) {
        material.emissive = new THREE.Color( 0x755bf9 )
        material.color = new THREE.Color( 0x222222 )
      } else {
        material.emissive = new THREE.Color( defaultTintColor )
        material.color = new THREE.Color( defaultColor )
      }
    }
  })
}