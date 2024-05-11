from flask import Flask, request, jsonify, session
from flask_cors import CORS
from openai import OpenAI
from pathlib import Path
from datetime import datetime
import os
import requests
import base64
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

app = Flask(__name__, static_folder='static')
app.secret_key = 'thisisasecret'
# Define the directory for storing audio files
AUDIO_DIR = os.path.join(app.root_path, 'static')
client = OpenAI(
      api_key="sk-proj-VxmcADlPTZpqUac2a2YZT3BlbkFJ6ob4iHf5xHqtVTA5xeYL"
)
CORS(app)  # Enable CORS for all routes of the Flask app
variables={}
variables["ori_image"]= "static/chiikawa_rgba.png"
variables["mask_image"]=""

@app.route('/')
def static_file():
    if 'mask' in session:
        # Clear the variable from the session
        session.pop('mask')
        variables["ori_image"]= "static/chiikawa_rgba.png"
        variables["mask_image"]=""
        print('mask cleared')
    else:
        # Set the variable in the session
        session['mask'] = 'set'
        print('mask set')
    return app.send_static_file('mask.html')
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(AUDIO_DIR, filename, mimetype='audio/wav')

# Route to handle saving the masked image
@app.route('/saveImage', methods=['POST'])
def save_image():
    try:
        # Get the data sent in the request
        data = request.get_json()
        # Extract the image data URL from the JSON data
        imageDataUrl = data['image']

        # Decode the image data URL (remove the 'data:image/png;base64,' prefix)
        _, encoded = imageDataUrl.split(',', 1)
        image_data = base64.b64decode(encoded)

        # Generate a unique filename based on the current timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f'masked_image_{timestamp}.png'

        # Define the server path to save the image (adjust as needed)
        save_path = os.path.join('static', filename)

        # Save the image to the server
        with open(save_path, 'wb') as f:
            f.write(image_data)
        # Current image ready to mask
        variables["mask_image"] = save_path

        # Respond with the URL of the saved image
        saved_image_url = f'/static/{filename}'
        return jsonify({'message': 'Image saved successfully.', 'imageUrl': saved_image_url}), 200

    except Exception as e:
        print(e)
        # Respond with error message if saving fails
        return jsonify({'error': f'Error saving image: {str(e)}'}), 500

# Route to handle recreate image
@app.route('/recreateImage', methods=['POST'])
def img_recreate():
    try:
        # Get the JSON data from the request
        data = request.get_json()
        prompt = data['prompt']

                # Call your image processing logic here (example using placeholders)
        # Replace this with your actual image processing logic
        response = client.images.edit(
            model="dall-e-2",
            image=open(variables["ori_image"], "rb"),
            mask=open(variables["mask_image"], "rb"),
            prompt=prompt,
            n=1,
            size="256x256"
        )

        # Get the image URL from the response (replace with your actual logic)
        image_url = response.data[0].url

        # Download the generated image
        response = requests.get(image_url)
        # Generate a new filename based on the current timestamp
        timestamp_now = datetime.now().strftime('%Y%m%d%H%M%S')
        gen_image_filename = f'gen_{timestamp_now}.png'

        # Define the path to save the generated image
        gen_image_path = os.path.join('static', gen_image_filename)

        # Save the downloaded image to the server
        with open(gen_image_path, 'wb') as file:
            file.write(response.content)
        # Resize the image to 248x248 using the ANTIALIAS resampling method
        input_image_path = gen_image_path
        output_image_path = gen_image_path
        image = Image.open(gen_image_path)
        resized_image = image.resize((248, 248), Image.Resampling.LANCZOS)
        resized_image.save(gen_image_path)

        # Update origin image to mask
        variables["ori_image"] = gen_image_path
        # Respond with the generated image filename and URL
        gen_image_url = f'/static/{gen_image_filename}'
        return jsonify({'img_filename': gen_image_url}), 200

    except Exception as e:
        # Handle any errors that occur during image processing
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/role-play', methods=['POST'])
def role_play():
    data = request.get_json()
    prompt = data['prompt']

    try:
        # Use OpenAI's Completion API to generate a text response based on the prompt
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "一人称が「ちいかわ」で、口癖は「「○○…ってこと！？」「泣いちゃった」等。語尾に「コト！？」を付けるだけで大丈夫です。その後に、「これってさぁ、絶対○○じゃん！」が続くこともよくあります。"},
                {"role": "user", "content": prompt}
            ]
            )
        # Extract the generated text response from the OpenAI API response
        generated_text = completion.choices[0].message.content
        #generated_text = completion['choices'][0]['message']['content']

        # Use OpenAI's TTS API to convert text to speech
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=generated_text
        )
        # Generate a unique filename for the audio file using current timestamp
        audio_filename = f"speak_{datetime.now().strftime('%Y%m%d%H%M%S')}.wav"
        # Save the audio stream to the unique filename
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        response.stream_to_file(audio_path)

        return jsonify({'response': generated_text, 'audio_filename': audio_filename})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
