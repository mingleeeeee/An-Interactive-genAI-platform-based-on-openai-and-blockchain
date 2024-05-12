let sourceImage = document.getElementById('sourceImage');
let canvasMask = document.getElementById('canvasMask');
let ctx = canvasMask.getContext('2d');
let circleRadius = 50; // Initial radius of the circle (can be adjusted)
let centerX, centerY;
let isDrawing = false;
let dotInterval; // Interval variable for printing dots

// Function to set canvas size to match image dimensions
function setCanvasSize() {
    canvasMask.width = sourceImage.width;
    canvasMask.height = sourceImage.height;
    centerX = canvasMask.width / 2;
    centerY = canvasMask.height / 2;
}

// Ensure canvas size matches image size when image is loaded
sourceImage.onload = function() {
    setCanvasSize(); // Set canvas size based on image dimensions
    ctx.drawImage(sourceImage, 0, 0); // Draw the source image on the canvasMask
    drawMask(); // Draw the initial mask
};

// Function to draw the mask with a circular transparent area
function drawMask() {
    ctx.clearRect(0, 0, canvasMask.width, canvasMask.height); // Clear the canvas

    // Draw the original image
    ctx.drawImage(sourceImage, 0, 0);

    // Use compositing to make the area inside the circle transparent
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; // Reset composite mode
}

// Event listener for mouse wheel to change circle radius
canvasMask.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY); // Get scroll direction
    circleRadius += delta * 5; // Adjust circle radius (increase or decrease)
    circleRadius = Math.max(10, circleRadius); // Limit minimum radius
    circleRadius = Math.min(canvasMask.width / 2, circleRadius); // Limit maximum radius
    drawMask(); // Redraw mask with updated radius
});

// Event listener for mouse down to start drawing
canvasMask.addEventListener('mousedown', (e) => {
    isDrawing = true;
});

// Event listener for mouse move to update circle position (if drawing)
canvasMask.addEventListener('mousemove', (e) => {
    if (isDrawing) {
        centerX = e.offsetX;
        centerY = e.offsetY;
        drawMask(); // Update mask position
    }
});

// Event listener for mouse up to stop drawing
canvasMask.addEventListener('mouseup', () => {
    isDrawing = false;
});

// Function to confirm mask selection and save the masked image
function confirmMask() {
    // Apply the mask
    drawMask();

    // Create a new canvas to hold the masked image
    const maskedCanvas = document.createElement('canvas');
    maskedCanvas.width = sourceImage.width;
    maskedCanvas.height = sourceImage.height;
    const maskedCtx = maskedCanvas.getContext('2d');

    // Draw the original image on the masked canvas
    maskedCtx.drawImage(sourceImage, 0, 0);

    // Use compositing to apply the circular mask to create transparency
    maskedCtx.globalCompositeOperation = 'destination-out';
    maskedCtx.drawImage(canvasMask, 0, 0);

    // Convert the masked canvas to an image data URL
    const maskedImageURL = maskedCanvas.toDataURL('image/png');

    // Replace the original image with the masked image
    sourceImage.src = maskedImageURL;

    // Enable the download button for the new image
    const generateButton = document.getElementById('generateButton');
    generateButton.disabled = false;

    // Automatically save the new image on the server (replace '/saveImage' with your server endpoint)
    fetch('/saveImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: maskedImageURL })
    })
    .then(response => {
        console.log('Image saved successfully on the server.');
    })
    .catch(error => {
        console.error('Error saving image on the server:', error);
    });
}

// Function to download the new masked image
function downloadNewImage() {
    const downloadButton = document.getElementById('downloadButton');

    // Create an anchor element to trigger the download
    const a = document.createElement('a');
    a.href = sourceImage.src;
    a.download = 'masked_image.png';

    // Append the anchor element to the document body and trigger a click event
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Disable the download button after download
    downloadButton.disabled = true;
}

// Function to send text and masked image to recreateImage API
async function generateImage() {
    try {
        const textBox = document.getElementById('textBox');
        const text = textBox.value.trim();

        // Disable the Generate button and change button text to indicate loading
        const generateButton = document.getElementById('generateButton');
        generateButton.disabled = true;
        generateButton.textContent = 'Generate...';

        // Get the current masked image URL (assumes the masked image is already generated)
        const maskedImageURL = sourceImage.src;

        // Send text and masked image URL to recreateImage API
        const response = await fetch('/recreateImage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: text, mask_image: maskedImageURL })
        });

        if (response.ok) {
            const responseData = await response.json();

            // Update the sourceImage src attribute with the new image URL
            sourceImage.src = responseData.img_filename;
        } else {
            // Handle API error response
            const errorResponse = await response.json();

            if (errorResponse.error && errorResponse.error.code === 'content_policy_violation') {
                // If the error code is 'content_policy_violation', display the error message
                alert('Your request was rejected as a result of our safety system. Your prompt may contain text that is not allowed by our safety system.');
            } else {
                // Handle other types of errors here if needed
                alert('Error: ' + response.status + ' - ' + response.statusText);
            }
        }
    } catch (error) {
        console.error('Error generating image:', error);
        alert('Error: ' + error.message);
    } finally {
        // Re-enable the Generate button and change button text back to 'Generate'
        const generateButton = document.getElementById('generateButton');
        generateButton.disabled = false;
        generateButton.textContent = 'Generate';
    }
}

// Event listener for the Generate button
document.getElementById('generateButton').addEventListener('click', generateImage);

// Disable the Generate button initially
document.getElementById('generateButton').disabled = true;