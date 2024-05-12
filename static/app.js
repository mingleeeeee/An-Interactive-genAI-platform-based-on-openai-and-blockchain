// Create a native canvas to draw the image
const imageCanvas = document.createElement('canvas');
const imageCtx = imageCanvas.getContext('2d');

// Load your image
const img = new Image();
img.onload = function() {
    // Resize the canvas to match the image dimensions
    imageCanvas.width = img.width;
    imageCanvas.height = img.height;

    // Draw the image onto the canvas
    imageCtx.drawImage(img, 0, 0);

    // Create Konva stage and layer
    const stage = new Konva.Stage({
        container: 'container',
        width: imageCanvas.width,
        height: imageCanvas.height
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Create Konva Image object with the native canvas as its source
    const konvaImage = new Konva.Image({
        x: 0,
        y: 0,
        image: imageCanvas,
        width: imageCanvas.width,
        height: imageCanvas.height
    });
    layer.add(konvaImage);

    // Create the eraser (circle shape)
    const eraser = new Konva.Circle({
        x: 100, // Initial position X
        y: 100, // Initial position Y
        radius: 20,
        fill: 'red'
    });
    layer.add(eraser);

    // Handle eraser interactions
    let isDragging = false;
    eraser.on('mousedown touchstart', () => {
        isDragging = true;
        layer.draw();
    });
    eraser.on('mousemove touchmove', (e) => {
        if (!isDragging) return;
        const pos = stage.getPointerPosition();
        eraser.position(pos);
        layer.draw();
    });
    eraser.on('mouseup touchend', () => {
        isDragging = false;
    });

    // Apply globalCompositeOperation 'destination-out' to erase
    layer.on('draw', () => {
        const context = layer.getContext()._context;
        context.globalCompositeOperation = 'destination-out';
        context.beginPath();
        context.arc(eraser.x(), eraser.y(), eraser.radius(), 0, Math.PI * 2);
        context.fill();
        context.globalCompositeOperation = 'source-over';
    });

    layer.batchDraw();
};
img.src = 'chiikawa_rgba.png';
