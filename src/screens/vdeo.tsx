
import React, { useState, useRef, useEffect } from "react";
import { View, Button, Text, StyleSheet, Alert, PanResponder } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import Video, { VideoRef } from "react-native-video";
import Slider from "@react-native-community/slider";
import Sound from "react-native-sound";
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

const VideoTrimmerUI = () => {

  const filters = [
    { name: "Normal", style: {} },
    { name: "Grayscale", style: { filter: "grayscale(100%)" } },
    { name: "Sepia", style: { filter: "sepia(100%)" } },
    { name: "Brightness", style: { filter: "brightness(1.5)" } },
    { name: "Contrast", style: { filter: "contrast(2)" } },
    { name: "Hue Rotate", style: { filter: "hue-rotate(90deg)" } },
    { name: "Invert", style: { filter: "invert(100%)" } },
    { name: "Saturate", style: { filter: "saturate(3)" } },
    { name: "Blur", style: { filter: "blur(2px)" } },
    { name: "Opacity", style: { filter: "opacity(50%)" } },
  ];


  const [videoUri, setVideoUri] = useState<string | null>(null);
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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Add this state
  const [isVideoReady, setIsVideoReady] = useState(false);
const [isAudioReady, setIsAudioReady] = useState(false);
const [isPlaybackReady, setIsPlaybackReady] = useState(false);



  const onFilterChange = (index: number) => {
    setSelectedFilter(filters[index]);
  };

  // PanResponder to detect swipe gestures
  const [currentIndex, setCurrentIndex] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, gestureState) => Math.abs(gestureState.dx) > 10, // Detect horizontal movement
      onPanResponderMove: (e, gestureState) => {
        if (Math.abs(gestureState.dx) > 10) { // Ensure it triggers only for horizontal swipes
          if (gestureState.dx < 0) { // Left swipe
            const nextIndex = (currentIndex + 1) % filters.length;
            setCurrentIndex(nextIndex);
            onFilterChange(nextIndex);
          } else { // Right swipe
            const prevIndex = (currentIndex - 1 + filters.length) % filters.length;
            setCurrentIndex(prevIndex);
            onFilterChange(prevIndex);
          }
        }
      },
      onPanResponderRelease: () => { },
    })
  ).current;

  // Select video
  const uploadVideo = () => {
    launchImageLibrary({ mediaType: "video" }, (response) => {
      if (response.assets && response.assets[0]?.uri) {
        setVideoUri(response.assets[0].uri);
        setStartTime(0);
        setEndTime(10);
      } else {
        Alert.alert("Error", "Video selection canceled or failed.");
      }
    });
  };

  // Load custom audio after selecting it
  const loadAudio = (contentUri: string) => {
    const filePath = RNFS.DocumentDirectoryPath + '/audio.mp3';
  
    RNFS.copyFile(contentUri, filePath)
      .then(() => {
        const sound = new Sound(filePath, '', (error) => {
          if (error) {
            console.error("Failed to load audio file:", error);
            Alert.alert("Error", "Failed to load the audio file.");
          } else {
            console.log("Audio loaded successfully");
            setAudioDuration(sound.getDuration());
            setAudioEnd(sound.getDuration() > 10 ? 10 : sound.getDuration());
            setAudioPlayer(sound);
            setIsCustomAudioAdded(true);
  
            setIsAudioReady(true); // Mark audio as ready
  
            // Check if both video and audio are ready
            if (isVideoReady) {
              setIsPlaybackReady(true);
            }
          }
        });
      })
      .catch((err) => {
        console.error("Error copying audio file:", err);
        Alert.alert("Error", "Failed to copy the audio file.");
      });
  };
  
  // Select audio
  const uploadAudio = async () => {
    try {
      const response = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
      });

      if (response[0]?.uri) {
        const audioUri = response[0].uri;
        loadAudio(audioUri);
      } else {
        Alert.alert("Error", "No audio file selected.");
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        Alert.alert("Canceled", "Audio selection canceled.");
      } else {
        console.error("Error picking audio:", err);
        Alert.alert("Error", "Failed to select an audio file.");
      }
    }
  };

  // Handle video load to get the duration
  const onVideoLoad = (data: any) => {
    const videoDuration = data.duration;
    setDuration(videoDuration);
    setEndTime(videoDuration > 10 ? 10 : videoDuration);
  
    setIsVideoReady(true); // Mark video as ready
  
    // Check if both video and audio are ready
    if (isAudioReady) {
      setIsPlaybackReady(true);
    }
  };

  // Synchronize trimmed audio with video
  const onProgress = (data: any) => {
  const currentTime = data.currentTime;
  setCurrentTime(currentTime);

  // Check if current video time exceeds end time, then loop
  if (currentTime >= endTime) {
    if (videoRef.current) {
      videoRef.current.seek(startTime); // Reset video to start
    }
    setCurrentTime(startTime);

    if (audioPlayer) {
      audioPlayer.stop(() => {
        audioPlayer.setCurrentTime(audioStart); // Reset audio time
        audioPlayer.play();
      });
    }
  } else {
    if (audioPlayer) {
      const audioTime = currentTime - startTime + audioStart;

      // Ensure audio is within the expected range
      if (audioTime >= audioStart && audioTime <= audioEnd) {
        if (!audioPlayer.isPlaying()) {
          audioPlayer.play();
        }
      } else {
        if (audioPlayer.isPlaying()) {
          audioPlayer.pause(); // Pause if out of sync
        }
      }
    }
  }
};

useEffect(() => {
  if (audioPlayer && isPlaybackReady) {
    audioPlayer.play((success) => {
      if (!success) {
        console.error("Audio playback failed due to an issue.");
      }
    });
  }
}, [audioPlayer, isPlaybackReady]);


  return (
    <View style={styles.container}>
      <Button title="Upload Video" onPress={uploadVideo} />
      <Button title="Upload Audio" onPress={uploadAudio} />

      {videoUri && (
        <>
          <View
            style={styles.swipeArea}
            {...panResponder.panHandlers} // Attach panResponder to the swipeable area
          >
            <Text style={styles.infoText}>
              Swipe left or right to change the filter
            </Text>
          </View>

          <Video
            source={{ uri: videoUri }}
            style={[styles.video, selectedFilter.style]}
            controls={false}
            resizeMode="contain"
            onLoad={onVideoLoad}
            onProgress={onProgress}
            paused={false}
            repeat={false}
            muted={isCustomAudioAdded}
            ref={videoRef}
            rate={playbackSpeed} // Apply playback speed here

          />

          <Text style={styles.durationText}>
            Trim Range: {startTime.toFixed(2)}s - {endTime.toFixed(2)}s
          </Text>

          <View style={styles.sliderContainer}>
            <Text>Video Start: {startTime.toFixed(2)}s</Text>
            <Slider
              value={startTime}
              onValueChange={(value) => {
                setStartTime(value);
                if (videoRef.current) {
                  videoRef.current.seek(value);
                  setCurrentTime(value);
                }
              }}
              minimumValue={0}
              maximumValue={duration}
            />
            <Text>Video End: {endTime.toFixed(2)}s</Text>
            <Slider
              value={endTime}
              onValueChange={(value) => {
                setEndTime(value);
                if (currentTime > value && videoRef.current) {
                  videoRef.current.seek(startTime);
                  setCurrentTime(startTime);
                }
              }}
              minimumValue={startTime}
              maximumValue={duration}
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


            {isCustomAudioAdded && (
              <>
                <Text>Audio Start: {audioStart.toFixed(2)}s</Text>
                <Slider
                  value={audioStart}
                  onValueChange={(value) => setAudioStart(value)}
                  minimumValue={0}
                  maximumValue={audioDuration}
                />
                <Text>Audio End: {audioEnd.toFixed(2)}s</Text>
                <Slider
                  value={audioEnd}
                  onValueChange={(value) => setAudioEnd(value)}
                  minimumValue={audioStart}
                  maximumValue={audioDuration}
                />
               
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  video: {
    width: "100%",
    height: 300,
    marginVertical: 10,
  },
  infoText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  sliderContainer: {
    width: "100%",
    marginTop: 20,
  },
  swipeArea: {
    width: "100%",
    height: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  durationText: {
    fontSize: 16,
    marginBottom: 10,
  },
  slider: {
    width: "80%",
  },
});

export default VideoTrimmerUI;
