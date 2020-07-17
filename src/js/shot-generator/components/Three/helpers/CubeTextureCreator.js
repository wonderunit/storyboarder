import * as THREE from 'three'

class CubeTextureCreator {
    constructor() {
        this.drawingCanvas = document.createElement('canvas');
        this.croppedCanvas = document.createElement('canvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.croppedCtx = this.croppedCanvas.getContext('2d');
        this.faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
        this.imageElements = [];
        this.gltf;
        this.boardPath;
    }

    // Saves cube map changes back to texture
    // It takes same elements positions which were initialized in getCubeMapTexture
    // Require getCubeMapTexture to be launch first
    combineImages( texture) {
        if( !this.imageElements.length || !this.gltf ) return;
        let image = this.gltf.image;
        this.drawingCanvas.width = image.width;
        this.drawingCanvas.height = image.height;
        this.drawingCtx.drawImage(image, 0, 0, image.width, image.height);

        for( let i = 0; i < this.imageElements.length; i++ ) {
            let element = this.imageElements[i];
            let croppedImage = texture.image[i];
            this.saveFace(croppedImage, element.x, element.y, element.width, element.height, element.name, this.boardPath );
        }
        let dataUrl = this.drawingCtx.canvas.toDataURL("image/jpeg");
        return dataUrl
    }

    // Draw the specific mesh on drawingContext which contains original texture image
    saveFace( image, x, y, width, height, name, boardPath) {         
        this.croppedCtx.canvas.width = width;
        this.croppedCtx.canvas.height = height;
        this.drawingCtx.drawImage(image, x, y, width, height); 
    }

    // Parses/crops passed cube texture and loading cube texture from them
    // Require Cube map to be one of the recognizable patterns see "recognizeTexturePattern"
    getCubeMapTexture( gltf, boardPath ) {
        this.gltf = gltf;
        this.boardPath = boardPath;
        let image = gltf.image;
        this.drawingCanvas.width = image.width;
        this.drawingCanvas.height = image.height;
    
        this.recognizeTexturePattern(image);
        let cubeTexture = new THREE.CubeTexture();
        if( !this.imageElements.length ) return;
        for( let i = 0; i < this.imageElements.length; i++ ) {
            let element = this.imageElements[i];
            let texture = this.crop(image, element.x, element.y, element.width, element.height, element.name, boardPath);
            cubeTexture.images[i] = texture;
        }
        cubeTexture.needsUpdate = true;
        
        return cubeTexture
    }

    // Tries to recognize image(Cube Texture) pattern if pattern is recognized it creates image element
    // image element knows it's position and size plus knows name for future use in "getCubeMapTexture" and "saveCubeMapTexture"
    // In order to recognize pattern image should have square elements (element should have same width and height) 
    // and Texture shouldn't have any leftover pixels. e.g. image is 4 columns by 3 rows, element size is 64 by 64(pixels) then image size
    // supposed to be 256 by 192(pixels)
    recognizeTexturePattern( image ) {
        this.imageElements = [];
        // 4 by 3 pattern when cubetexture has 4 columns and 3 rows 
        // -  py -  -
        // nx pz px nz
        // -  ny -  -
        if( image.width / 4 === image.height / 3 ) {
            let elementSize = image.width / 4;
            this.croppedCanvas.width = elementSize;
            this.croppedCanvas.height = elementSize;
            this.imageElements.push({x:elementSize * 2, y: elementSize,     width: elementSize, height:elementSize, name:"px"});
            this.imageElements.push({x:0,               y: elementSize,     width: elementSize, height:elementSize, name:"nx"});
            this.imageElements.push({x:elementSize,     y: 0,               width: elementSize, height:elementSize, name:"py"});
            this.imageElements.push({x:elementSize,     y: elementSize * 2, width: elementSize, height:elementSize, name:"ny"});
            this.imageElements.push({x:elementSize,     y: elementSize,     width: elementSize, height:elementSize, name:"pz"});
            this.imageElements.push({x:elementSize * 3, y: elementSize,     width: elementSize, height:elementSize, name:"nz"});
        }
        // 3 by 4 pattern when cubetexture has 3 columns and 4 rows
        // -  py -
        // pz px nz
        // -  ny -
        // -  nx -
        if( image.width / 3 === image.height / 4 ) {
            let elementSize = image.width / 3;
            this.croppedCanvas.width = elementSize;
            this.croppedCanvas.height = elementSize;
            this.imageElements.push({x:elementSize,     y: elementSize,         width: elementSize, height:elementSize, name:"px"});
            this.imageElements.push({x:elementSize,     y: elementSize * 3,     width: elementSize, height:elementSize, name:"nx"});
            this.imageElements.push({x:elementSize,     y: 0,                   width: elementSize, height:elementSize, name:"py"});
            this.imageElements.push({x:elementSize,     y: elementSize * 2,     width: elementSize, height:elementSize, name:"ny"});
            this.imageElements.push({x:0,               y: elementSize,         width: elementSize, height:elementSize, name:"pz"});
            this.imageElements.push({x:elementSize * 2, y: elementSize,         width: elementSize, height:elementSize, name:"nz"});
        }
    
        let row = image.width / 6 === image.height;
        let column = image.width === image.height / 6;
        // 1 by 6 pattern when either we have 1 column or 1 row
        // px nx py ny pz nz
        if( row || column ) {
            let elementSize = row ? image.height : image.width;
            this.croppedCanvas.width = elementSize;
            this.croppedCanvas.height = elementSize;
            for( let i = 0; i < this.faces.length; i++ ) {
                this.imageElements.push({x:elementSize * row * i, y: elementSize * i * column, width: elementSize, height:elementSize, name:this.faces[i]});
            }
        }
    }

    // Crops a segment from images and saves it with passed name
    crop( image, x, y, width, height, name, boardPath ) {
        this.drawingCtx.drawImage(image, 0, 0, image.width, image.height);
        let imageData = this.drawingCtx.getImageData(x, y, width, height);                                   
        let croppedCanvas = document.createElement('canvas');
        let croppedCtx = croppedCanvas.getContext('2d');
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        croppedCtx.putImageData(imageData, 0, 0);   
        let texture = new THREE.Texture(croppedCtx.canvas);
        return texture.image;
    }
}

export default CubeTextureCreator;