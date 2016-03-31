var GHOST_NOTE_VOLUME = 0.2;

function WebAudioApiPlayer()
{
    var context = new AudioContext();;
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
            context.decodeAudioData(
                request.response,
                function(buffer) {buffers[index] = buffer;});
        }
        request.send();
    }

    this.play = function()
    {
        for(var note of mainSheet.score.notes)
        {
            if(note.time >= startBeat - 1 && note.time < endBeat &&
               !note.muted)
            {
                this.playNote(note);
            }
        }
    }

    this.playNote = function(note, playNow)
    {
        var buffer = buffers[note.type];
        if(playNow)
        {
            var delay = null;
        }
        else
        {
            var delay = toSeconds(note.time - (startBeat - 1));
        }
        var source = context.createBufferSource();
        source.buffer = buffer;
        if(note.ghost)
        {
            var gainNode = context.createGain();
            gainNode.gain.value = GHOST_NOTE_VOLUME;
            source.connect(gainNode);
            gainNode.connect(context.destination);
        }
        else
        {
            source.connect(context.destination);
        }
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
