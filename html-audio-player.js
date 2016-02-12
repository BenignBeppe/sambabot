function HtmlAudioPlayer()
{
    this.sounds = [];
    this.timeouts = [];

    this.updateSounds = function()
    {
        this.sounds = [];
        for(var note of mainSheet.score.notes)
        {
            var sound = new Audio(mainSheet.score.noteTypes[note.type]);
            this.sounds.push(sound);
        }
    }

    this.play = function(looping)
    {
        this.resetSounds();
        for(var i = 0; i < mainSheet.score.notes.length; i ++)
        {
            var delay = toSeconds(mainSheet.score.notes[i].time) * 1000;
            var timeout = this.callDelayed("playNote", delay, i);
            this.timeouts.push(timeout);
        }
    }

    this.callDelayed = function(functionToCall, delay, ...args)
    {
        var timeout = setTimeout(
            function(obj, args) {obj[functionToCall](args);},
            delay, this, args);
        return timeout;
    }

    this.playNote = function(noteIndex)
    {
        var sound = this.sounds[noteIndex];
        sound.play();
    }

    this.stop = function()
    {
        for(var timeout of this.timeouts)
        {
            clearTimeout(timeout);
        }
    }

    this.addSound = function(path)
    {
        this.sounds.push(new Audio(path));
    }

    this.resetSounds = function()
    {
        for(var sound of this.sounds)
        {
            sound.load();
        }
    }
}
