function WebAudioApiPlayer()
{
    var context = new AudioContext();;
    var myAudioBuffer = null;
    var buffers = [];
    var sources = [];

    this.updateSounds = function()
    {
        for(var type in mainSheet.score.noteTypes)
        {
            var path = mainSheet.score.noteTypes[type];
            this.loadSound(type, path);
        }
    }

    this.loadSound = function(index, path)
    {
        var request = new XMLHttpRequest();
        request.open('GET', path, true);
        request.responseType = 'arraybuffer';
        request.onload = function()
        {
            context.decodeAudioData(request.response).
                then(function(buffer) {buffers[index] = buffer;});
        }
        request.send();
    }

    this.play = function()
    {
        for(var note of mainSheet.score.notes)
        {
            this.playNote(note);
        }
    }

    this.playNote = function(note)
    {
        var buffer = buffers[note.type];
        var delay = toSeconds(note.time);
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        var time = context.currentTime;
        if(delay != null)
        {
            time += delay;
        }
        source.start(time);
        sources.push(source);
    }

    this.stop = function()
    {
        for(var source of sources)
        {
            source.stop();
        }
        sources = [];
    }
}