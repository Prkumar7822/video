import React, { useState, useRef, useEffect } from "react";
import { View, Button, Alert, StyleSheet } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import Video from "react-native-video";
import RNFS from "react-native-fs";
import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";

const filters = [
  { name: "Normal", command: "" },
  { name: "Grayscale", command: "format=gray" },
  { name: "Sepia", command: "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131" },
  { name: "Invert", command: "negate" },
  { name: "Vivid", command: "hue=s=2" }, // Adjusting saturation directly without eq
  { name: "Mono", command: "hue=s=0" }, // Turns the video to black & white
  { name: "Dramatic", command: "curves=r='0.0/0.1/0.5/0.9/1.0':g='0.0/0.1/0.5/0.9/1.0':b='0.0/0.1/0.5/0.9/1.0'" },  // Updated Dramatic filter
  { name: "Cool", command: "curves=r='0.0/0.1/0.5/0.9/1.0':g='0.0/0.2/0.6/0.8/1.0':b='0.0/0.3/0.7/1.0/1.0'" },
  { name: "Warm", command: "curves=r='0.0/0.1/0.5/0.8/1.0':g='0.0/0.3/0.7/1.0/1.0':b='0.0/0.2/0.6/1.0/1.0'" },
];


const VideoTrimmerUI = () => {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [filteredVideoUri, setFilteredVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const videoRef = useRef<any>(null);

  const applyFilter = async (filter: any) => {
    if (!videoUri) {
      Alert.alert("Error", "Please select a video first.");
      return;
    }

    const outputPath = `${RNFS.CachesDirectoryPath}/filtered_video.mp4`;

    const command = `-y -i ${videoUri} -vf "${filter.command}" ${outputPath}`;
    console.log("Executing FFmpeg Command:", command);

    Alert.alert("Processing", "Applying filter, please wait...");

    FFmpegKit.execute(command).then(async (session) => {
      const returnCode = await session.getReturnCode();
      if (ReturnCode.isSuccess(returnCode)) {
        setFilteredVideoUri(`file://${outputPath}`);
        Alert.alert("Success", "Filter applied successfully!");

        // Reset to the start of the video and play
        if (videoRef.current) {
          videoRef.current.seek(0); // Reset to the start of the video
          videoRef.current.play(); // Start playing from the beginning
          setIsPlaying(true); // Ensure video is playing
        }
      } else if (ReturnCode.isCancel(returnCode)) {
        Alert.alert("Cancelled", "Operation was cancelled.");
      } else {
        Alert.alert("Error", "Failed to apply filter.");
      }
    });
  };

  const handleProgress = (data: any) => {
    if (data.currentTime !== undefined) {
      setIsPlaying(data.isPlaying);
    }
  };

  const handleLoad = (data: any) => {
    setIsPlaying(true);
  };

  const handleEnd = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.seek(0); // Reset to the start of the video
    }
  };

  const handleFilterChange = (filter: any) => {
    // Pause the video and apply the new filter
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedFilter(filter); // Update selected filter
    setFilteredVideoUri(null); // Reset filtered video URI
    setIsPlaying(false); // Pause the video
    applyFilter(filter); // Apply the new filter
  };

  useEffect(() => {
    if (filteredVideoUri && videoRef.current) {
      videoRef.current.seek(0); // Reset to start if the filtered video URI changes
      if (isPlaying) {
        videoRef.current.play(); // Start video playback from the beginning
      }
    }
  }, [filteredVideoUri]);

  return (
    <View style={styles.container}>
      <Button
        title="Upload Video"
        onPress={() =>
          launchImageLibrary({ mediaType: "video" }, (response) => {
            if (response.assets && response.assets[0]?.uri) {
              setVideoUri(response.assets[0].uri);
              setFilteredVideoUri(null); // Reset filtered video URI when a new video is selected
            } else {
              Alert.alert("Error", "Video selection canceled or failed.");
            }
          })
        }
      />

      {videoUri && (
        <View>
          {filters.map((filter) => (
            <Button
              key={filter.name}
              title={filter.name}
              onPress={() => handleFilterChange(filter)}
            />
          ))}
        </View>
      )}

      {filteredVideoUri && (
        <Video
          ref={videoRef}
          source={{ uri: filteredVideoUri }}
          style={styles.video}
          controls={true}
          resizeMode="contain"
          repeat={true}
          onProgress={handleProgress}
          onLoad={handleLoad}
          onEnd={handleEnd}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: 300,
  },
});

export default VideoTrimmerUI;
