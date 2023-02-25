/*List of features, commands, etc. Bugs, what's unfinished, things to add
Commands: !play, !queue, !next, !nowplaying, !fav, !listfavs, !playfavs, !remfav, !clearfavs, !shuffle, !swap, !logvars (testing), !test (testing)
!play: Working! No bugs.
!queue: Working! No bugs.
!next: Working! No bugs.
!nowplaying: Working! No bugs.
!fav: Working! No bugs.
!listfavs: Working! No bugs.
!playfavs: Working! Hopefully no bugs!!
!remfav: Working! No bugs.
!clearfavs: Untested?
!shuffle: Untested.
!swap: Untested.

Things to add:
  !remove:
    -Ability to remove more than one song at a time
  

*/

const fs = require('node:fs');
const path = require('node:path');
const Database = require("@replit/database")
const {
    Client,
    Events,
    GatewayIntentBits,
    Collection,
    PermissionsBitField
} = require('discord.js');
const yts = require("yt-search");
const {
    prefix,
    token,
} = require('./config.json');
const ytdl = require('ytdl-core');
const client = new Client({
    intents: 131071
});
var queue = new Array();
const {
    joinVoiceChannel
} = require('@discordjs/voice');
client.commands = new Collection();
const {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
} = require('@discordjs/voice');
const ytSearch = require('yt-search');
const player = createAudioPlayer();
var connection = "";
var nowPlay = "";
var connectionDestroyed = 0;
const db = new Database();
var playerListener = "";

client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    let args = message.content.split(" ");
    if (message.content.startsWith("!play")) {
        await play(message);
    }
    if (message.content.startsWith("!queue")) {
        queueDisplay(message);
    }
    if (message.content.startsWith("!next")) {
        next();
    }
    if (message.content.startsWith("!nowplaying")) {
        nowPlaying(message);
    }
    if (args[0] == "!fav") {
        await addFavorite(message);
    }
    if (message.content.startsWith("!listfavs")) {
        await listFavorites(message);
    }
    if (message.content.startsWith("!playfavs")) {
        await playFavorites(message);
    }
    if (message.content.startsWith("!remfav")) {
        await removeFavorite(message);
    }
    if (message.content.startsWith("!clearfavs")) {
        await clearFavorites(message);
    }
    if (message.content.startsWith("!shuffle")) {
        shuffle(message);
    }
    if (message.content.startsWith("!swap")) {
        swap(message);
    }
    if (message.content.startsWith("!logvars")) {
        logVar(message);
    }
    if (message.content.startsWith("!test")) {
        test(message);
    }
})

//Utility functions
async function joinVoice(message) {
    connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.member.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
    });
}

async function userVoiceChannelCheck(message) {
    let voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.channel.send("You must be in a voice channel");
    let permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak)) return message.channel.send("I need permissions to join your voice channel.");
    return true;
}

async function checkVoice(message) {
    if (!await userVoiceChannelCheck(message)) return false;
    if (!client.voice.channel) {
        await joinVoice(message);
    };
    return true;
}

async function searchYoutube(search) {
    let videoResults = await ytSearch(search);
    if (videoResults.videos.length > 1) {
        return videoResults.videos;
    } else {
        return false;
    }
}

//Actual bot functions
async function play(message) {
    let args = message.content.split(" ");
    let searchResults = "";
    if (args[0] == "!play") {
        console.log("Is !play");
        if (checkVoice(message)) {
            console.log("Check Voice");
            args = args.splice(1);
            args = args.join(" ");
            searchResults = await ytSearch(args);
            console.log(player.state.status);
            //If bot is currently playing something, add this song to the queue. Otherwise, play now
            if (player.state.status == 'idle') {
                console.log("Player state");
                let stream = ytdl(searchResults.videos[0].url, {
                    filter: 'audioonly',
                    quality: 'highestaudio'
                });
                let resource = createAudioResource(stream);
                player.play(resource);
                connection.subscribe(player);
                nowPlay = searchResults.videos[0];
                message.channel.send("Now playing: " + searchResults.videos[0].title);
                if (playerListener == 0) {
                    console.log("Created player listener");
                    playerListener = 1;
                    player.on('error', (error) => console.error(error));
                    player.on(AudioPlayerStatus.Idle, () => {
                        console.log("Player idle");
                        if (queue.length > 0) {
                            stream = ytdl(queue[0].url, {
                                filter: 'audioonly',
                                quality: 'highestaudio'
                            });
                            nowPlay = queue[0];
                            queue.splice(0, 1);
                            resource = createAudioResource(stream);
                            player.play(resource);
                            connection.subscribe(player);
                        } else {
                            connection.disconnect();
                        }
                    })
                }

            } else if (player.state.status == 'playing') {
                let vid = searchResults.videos[0];
                queue.push(vid);
                message.channel.send("Adding " + vid.title + " to queue at position " + queue.length + ".");
            }
        }
    }
}

function queueDisplay(message) {
    let queueMessage = "Currently in queue: ";
    if (queue.length > 0) {
        for (i = 0; i < queue.length; i++) {
            let songNumber = i + 1;
            queueMessage += "\n" + songNumber + ".) " + queue[i].title;
        }
        message.channel.send(queueMessage);
    } else {
        message.channel.send("Nothing in the queue.");
    }
}

function next() {
    console.log("Next command");
    if (queue.length > 0) {
        let stream = ytdl(queue[0].url, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });
        let resource = createAudioResource(stream);
        player.play(resource);
    } else {
        console.log("End of queue");
        player.stop();
    }
    nowPlay = queue[0];
    queue.splice(0, 1);
}

function nowPlaying(message) {
    message.channel.send("Currently Playing: " + nowPlay.title);
}

async function addFavorite(message) {
    let key = message.author.id;
    let favs = new Array();
    let keyList = await db.list();
    keyList = Array.from(keyList);
    let expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
    let regex = new RegExp(expression);
    let args = message.content.split(" ");
    favs = await db.get(key);
//Check if user has a favorites list already
    if (keyList.includes(key)) {
        console.log("Has favorites already");
        if (regex.test(message.content)) {
            for (i = 0; i < favs.length; i++) {
                if (favs[i].url == args[1]) {
                    return message.channel.send(`${favs[i]} is already in your favorites.`);
                }
            }
            let searchResults = await ytSearch(args[0]);
            if (searchResults.length > 0) {
                favs.push(searchResults.videos[0]);
                message.channel.send(searchResults.videos[0].title + " was added to your favorites.");
            }
        } else {
            for (i = 0; i < favs.length; i++) {
                if (favs[i].url == nowPlay.url) {
                    return message.channel.send(`${favs[i].title} is already in your favorites.`);
                }
            }
            favs.push(nowPlay);
            message.channel.send(nowPlay.title + " was added to your favorites.");
        }
        await db.set(key, favs);
    } else {
      //Doesn't have a favorites list already
        console.log("Doesn't have favorites yet");
        if (regex.test(message.content)) {
            let searchResults = await ytSearch(args[0]);
            if (regex.test(message.content)) {
                for (i = 0; i < favs.length; i++) {
                    if (favs[i].url == args[1]) {
                        return message.channel.send(`${favs[i].title} is already in your favorites.`);
                    }
                }
                if (searchResults.length > 0) {
                    favs.push(searchResults.videos[0]);
                    message.channel.send(searchResults.videos[0].title + " was added to your favorites.");
                }
            } else {
                for (i = 0; i < favs.length; i++) {
                    if (favs[i].url == nowPlay.url) {
                        return message.channel.send(`${nowPlay.title} is already in your favorites.`);
                    }
                }
                favs.push(nowPlay);
                message.channel.send(nowPlay.title + " was added to your favorites.");
            }
            console.log(key);
            console.log(favs);
            await db.set(key, favs);
            message.channel.send(nowPlay.title + " was added to your favorites.");
        }
    }
}
///^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/

async function listFavorites(message) {
    let key = message.author.id;
    let favs = new Array();
    let keyList = await db.list();
    keyList = Array.from(keyList);
    console.log("Key List: " + keyList);
    if (keyList.includes(key)) {
        favs = await db.get(key);
        console.log(favs);
        let favMsg = "Your Favorites: ";
        let counter = 1;
        for (i = 0; i < favs.length; i++) {
            favMsg += "\n" + counter + ".) " + favs[i].title;
            counter++;
        }
        message.channel.send(favMsg);
    } else {
        message.channel.send("You do not have any favorites yet! Add one by typing !fav or !favorite when you like a song!");
    }
}

async function playFavorites(message) {
    let key = message.author.id;
    let favs = new Array();
    let keyList = await db.list();
    keyList = Array.from(keyList);
    let voiceCon = await checkVoice(message);
    if (keyList.includes(key)) {
        favs = await db.get(key);
        queue.length = 0;
        for (i = 0; i < favs.length; i++) {
            queue.push(favs[i]);
        }
        nowPlay = queue[0];
        queue.splice(0, 1);
        if (voiceCon == true) {
            let stream = ytdl(favs[0].url, {
                filter: 'audioonly',
                quality: 'highestaudio'
            });
            let resource = createAudioResource(stream);
            player.play(resource);
            connection.subscribe(player);
            if (playerListener == 0) {
                console.log("created player listener");
                playerListener = 1;
                player.on('error', (error) => console.error(error));
                player.on(AudioPlayerStatus.Idle, () => {
                    console.log("Player idle");
                    if (queue.length > 0) {
                        stream = ytdl(queue[0].url, {
                            filter: 'audioonly',
                            quality: 'highestaudio'
                        });
                        nowPlay = queue[0];
                        queue.splice(0, 1);
                        resource = createAudioResource(stream);
                        player.play(resource);
                        connection.subscribe(player);
                    } else {
                        connection.disconnect();
                    }
                });
            }
        }
    }
}

async function removeFavorite(message) {
    let key = message.author.id;
    let favs = new Array();
    let keyList = await db.list();
    let args = message.content.split(" ");
    let favNum = args[1];
    keyList = Array.from(keyList);
    if (keyList.includes(key)) {
        favs = await db.get(key);
        message.channel.send(favs[favNum - 1].title + " removed from your favorites.");
        favs.splice(favNum - 1, 1);
        await db.set(key, favs);
    }
}

async function clearFavorites(message) {
    let key = message.author.id;
    let favs = new Array();
    let keyList = await db.list();
    let newFavs = new Array();
    keyList = Array.from(keyList);
    if (keyList.includes(key)) {
        await db.set(key, newFavs);
        message.channel.send("Favorites cleared.");
    }
}

function swap(message) {
    let args = message.content.split(" ");
    let temp1 = queue[args[1]];
    let temp2 = queue[args[2]];
    queue[args[1]] = temp2;
    queue[args[2]] = temp1;
    message.channel.send("Swapped " + temp1.title + " & " + temp2.title);
}

function shuffle(message) {
    let shuffledQueue = new Array();
    let cloneQueue = queue;
    for (i = 0; i < cloneQueue.length; i++) {
        let randNum = Math.random() * (cloneQueue.Length - 0) + 0;
        shuffledQueue.push(cloneQueue[randNum]);
        cloneQueue.splice(randNum, 1);
        message.channel.send("Random song: " + cloneQueue[randNum]);
    }
    queue = shuffledQueue;
    message.channel.send("Queue shuffled. I hope I didn't lose any songs!");
}
//Unfinished
async function search(message) {
    let args = message.content.split(" ");
    args.splice(0, 1);
    let searchTerm = args.join(" ");
    let msg = "";
    let searchResults = ytSearch(searchTerm);

}

function logVar(message) {
    console.log("nowPlay: " + nowPlay);
    console.log("queue: " + queue);
    console.log("")
}

function test(message) {
    let expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
    let regex = new RegExp(expression);
    console.log(message.content);
    if (regex.test(message.content)) {
        console.log("Match");
    } else {
        console.log("No match");
    }

    if (regex.exec(message.content)) {
        console.log("Match");
    } else {
        console.log("no match");
    }
}

client.login(token);
