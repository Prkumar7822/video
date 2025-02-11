import React, { useState, useRef, useEffect } from "react";
import { View, Button, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import Video, { VideoRef } from "react-native-video";
import Slider from "@react-native-community/slider";
import Sound from "react-native-sound";
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";

const filters = [
    { name: "Normal", style: {}, command: "" },
    { name: "Grayscale", style: { filter: "grayscale(100%)" }, command: "format=gray" },
    { name: "Sepia", style: { filter: "sepia(100%)" }, command: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131" },
    { name: "Invert", style: { filter: "invert(100%)" }, command: "negate" },
    { name: "Vivid", style: { filter: "hue-rotate(90deg)" }, command: "hue=s=2" },
    { name: "Mono", style: { filter: "hue-rotate(0deg)" }, command: "hue=s=0" },
    { name: "Dramatic", style: { filter: "contrast(2)" }, command: "curves=r='0.0/0.1/0.5/0.9/1.0':g='0.0/0.1/0.5/0.9/1.0':b='0.0/0.1/0.5/0.9/1.0'" },
    { name: "Cool", style: { filter: "brightness(1.2)" }, command: "curves=r='0.0/0.1/0.5/0.9/1.0':g='0.0/0.2/0.6/0.8/1.0':b='0.0/0.3/0.7/1.0/1.0'" },
    { name: "Warm", style: { filter: "brightness(0.9)" }, command: "curves=r='0.0/0.1/0.5/0.8/1.0':g='0.0/0.3/0.7/1.0/1.0':b='0.0/0.2/0.6/1.0/1.0'" },
];

const VideoTrimmerUI = () => {
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [filteredVideoUri, setFilteredVideoUri] = useState<string | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [audioDuration, setAudioDuration] = useState<number>(0);
    const [startTime, setStartTime] = useState<number>(0);
    const [endTime, setEndTime] = useState<number>(10);
    const [audioStart, setAudioStart] = useState<number>(0);
    const [audioEnd, setAudioEnd] = useState<number>(10);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const videoRef = useRef<VideoRef>(null);
    const [audioPlayer, setAudioPlayer] = useState<Sound | null>(null);
    const [isCustomAudioAdded, setIsCustomAudioAdded] = useState<boolean>(false);
    const [selectedFilter, setSelectedFilter] = useState(filters[0]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isPlaybackReady, setIsPlaybackReady] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); 

    const uploadVideo = () => {
        launchImageLibrary({ mediaType: "video" }, (response) => {
            if (response.assets && response.assets[0]?.uri) {
                setVideoUri(response.assets[0].uri);
                setFilteredVideoUri(null); // Reset filtered video URI
                setStartTime(0);
                setEndTime(10);
            } else {
                Alert.alert("Error", "Video selection canceled or failed.");
            }
        });
    };

    const applyFilter = async (filter: any) => {
        if (!videoUri) {
            Alert.alert("Error", "Please select a video first.");
            return;
        }

        const outputPath = `${RNFS.CachesDirectoryPath}/filtered_video_${filter.name}.mp4`;
        const command = `-y -i ${videoUri} -vf "${filter.command}" ${outputPath}`;

        const currentPlaybackTime = currentTime; // Capture current playback position

        Alert.alert("Processing", "Applying filter, please wait...");
        FFmpegKit.execute(command).then(async (session) => {
            const returnCode = await session.getReturnCode();
            if (ReturnCode.isSuccess(returnCode)) {
                setFilteredVideoUri(`file://${outputPath}`);
                setSelectedFilter(filter); // Update selected filter state
                if (videoRef.current) {
                    videoRef.current.seek(currentPlaybackTime); // Seek to the captured position
                }
                setIsPlaying(true); // Ensure playback resumes
            } else {
                Alert.alert("Error", "Failed to apply filter.");
            }
        });
    };



    const onVideoLoad = (data: any) => {
        const videoDuration = data.duration;
        setDuration(videoDuration);
        setEndTime(videoDuration > 10 ? 10 : videoDuration);
        setIsVideoReady(true);

        if (isAudioReady) setIsPlaybackReady(true);

        if (isPlaying && videoRef.current) {
            videoRef.current.seek(currentTime); // Seek to the last playback position
        }
    };

    const onProgress = (data: any) => {
        setCurrentTime(data.currentTime);
        if (data.currentTime >= endTime) {
            if (videoRef.current) videoRef.current.seek(startTime);
            setCurrentTime(startTime);
            if (audioPlayer) {
                audioPlayer.stop(() => {
                    audioPlayer.setCurrentTime(audioStart);
                    audioPlayer.play();
                });
            }
        }
    };

    const loadAudio = (contentUri: string) => {
        const filePath = RNFS.DocumentDirectoryPath + '/audio.mp3';
        RNFS.copyFile(contentUri, filePath).then(() => {
            const sound = new Sound(filePath, '', (error) => {
                if (error) {
                    Alert.alert("Error", "Failed to load the audio file.");
                } else {
                    setAudioDuration(sound.getDuration());
                    setAudioEnd(sound.getDuration() > 10 ? 10 : sound.getDuration());
                    setAudioPlayer(sound);
                    setIsCustomAudioAdded(true);
                    setIsAudioReady(true);
                    if (isVideoReady) setIsPlaybackReady(true);
                }
            });
        }).catch((err) => {
            Alert.alert("Error", "Failed to copy the audio file.");
        });
    };

    const uploadAudio = async () => {
        try {
            const response = await DocumentPicker.pick({ type: [DocumentPicker.types.audio] });
            if (response[0]?.uri) loadAudio(response[0].uri);
        } catch (err) {
            Alert.alert("Error", "Failed to select an audio file.");
        }
    };

    useEffect(() => {
        if (audioPlayer && isPlaybackReady) {
            audioPlayer.play();
        }
    }, [audioPlayer, isPlaybackReady]);

    return (
        <ScrollView>
            <View style={styles.container}>
                <Button title="Upload Video" onPress={uploadVideo} />
                <Button title="Upload Audio" onPress={uploadAudio} />

                {videoUri && (
                    <>
                        <Video
                            source={{ uri: filteredVideoUri || videoUri }}
                            style={[styles.video, selectedFilter.style]}
                            controls={true}
                            resizeMode="contain"
                            onLoad={onVideoLoad}
                            onProgress={onProgress}
                            paused={!isPlaying}
                            repeat={false}
                            muted={isCustomAudioAdded}
                            rate={playbackSpeed} // Set playback speed here
                            ref={videoRef}
                        />


                        {/* Trimming Options */}
                        <View style={styles.trimContainer}>
                            <Text style={styles.trimText}>Trim Range:</Text>
                            <Slider
                                value={startTime}
                                onValueChange={(value) => { setStartTime(value); videoRef.current?.seek(value); }}
                                minimumValue={0}
                                maximumValue={duration}
                                style={styles.slider}
                            />
                            <Text style={styles.trimText}>{startTime.toFixed(2)}s - {endTime.toFixed(2)}s</Text>
                            <Slider
                                value={endTime}
                                onValueChange={(value) => { setEndTime(value); }}
                                minimumValue={startTime}
                                maximumValue={duration}
                                style={styles.slider}
                            />
                            <Text>Playback Speed: {playbackSpeed}x</Text>
                            <Slider
                                style={styles.slider}
                                minimumValue={0.5}
                                maximumValue={2}
                                step={0.1}
                                value={playbackSpeed}
                                onValueChange={(value) => setPlaybackSpeed(value)} // Update playback speed state
                            />
                        </View>

                        {/* Audio Controls */}
                        {isCustomAudioAdded && (
                            <>
                                <View style={styles.trimContainer}>
                                    <Text style={styles.trimText}>Audio Start: {audioStart.toFixed(2)}s</Text>
                                    <Slider value={audioStart} onValueChange={setAudioStart} minimumValue={0} maximumValue={audioDuration} style={styles.slider} />
                                    <Text style={styles.trimText}>Audio End: {audioEnd.toFixed(2)}s</Text>
                                    <Slider value={audioEnd} onValueChange={setAudioEnd} minimumValue={audioStart} maximumValue={audioDuration} style={styles.slider} />
                                </View>
                            </>
                        )}

                        {/* Filter Buttons Side by Side */}
                        <View style={styles.filterContainer}>
                            {filters.map((filter) => (
                                <View key={filter.name} style={styles.filterButton}>
                                    <Button
                                        title={filter.name}
                                        onPress={() => applyFilter(filter)}
                                    />
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 10 },
    video: { width: "100%", height: 300, marginBottom: 20 },
    trimContainer: { width: "100%", alignItems: "center", marginBottom: 20 },
    trimText: { fontSize: 16, marginVertical: 5 },
    slider: { width: "80%", marginBottom: 20 },
    filterButtons: { flexDirection: "row", justifyContent: "space-around", width: "100%" },
    filterContainer: {
        flexDirection: "column", // Arrange buttons vertically
        alignItems: "center", // Center buttons horizontally
        marginVertical: 20, // Add spacing above and below the buttons
        width: "100%", // Full-width container
    },
    filterButton: {
        marginVertical: 5, // Spacing between buttons
        width: "80%", // Ensure buttons are consistently sized
    },

});

export default VideoTrimmerUI;
