$(document).ready(function() {
    $('#chatButton').click(function(e) {
        e.preventDefault();
        var prompt = $('#prompt').val();

        $.ajax({
            url: 'http://localhost:5000/role-play',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt }),
            success: function(data) {
                $('#response').text(data.response);

                // Update audio source URL to retrieve from Flask server
                var audioUrl = `http://localhost:5000/static/${data.audio_filename}`;
                $('#audioPlayer source').attr('src', audioUrl);

                // Wait for audio file to be loaded and then play it
                waitForAudioFile(audioUrl)
                    .then(function() {
                        $('#audioPlayer')[0].load(); // Reload audio player
                        $('#audioPlayer')[0].play(); // Play audio
                    })
                    .catch(function(error) {
                        console.error('Error loading audio file:', error);
                    });
            },
            error: function(err) {
                $('#response').text('Error: ' + err.responseJSON.error);
            }
        });
    });

    // Function to wait for audio file to be loaded
    function waitForAudioFile(audioUrl) {
        return new Promise(function(resolve, reject) {
            var audio = new Audio(audioUrl);
            audio.onloadeddata = function() {
                resolve();
            };
            audio.onerror = function(error) {
                reject(error);
            };
        });
    }
});
