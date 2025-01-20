import React, { useState, useRef, useEffect } from "react";
import { View, Button, Text, StyleSheet, Alert, PanResponder } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { GLView, ExpoWebGLRenderingContext } from "expo-gl"; 
import Slider from "@react-native-community/slider";
import Sound from "react-native-sound";
import DocumentPicker from "react-native-document-picker";
import RNFS from "react-native-fs";
import Video, { VideoRef } from "react-native-video";
import { Renderer, TextureLoader } from "expo-three";
import * as THREE from "three";

// Define shaders
const vertexShader = `
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform sampler2D videoTexture;
  uniform float filterAmount;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(videoTexture, vUv);
    color.rgb *= filterAmount;  // Apply filter effect
    gl_FragColor = color;
  }
`;

const VideoT = () => {
  const filters = [
    { name: "Normal", style: {} },
    { name: "Vivid", style: { filterAmount: 2 } },
    { name: "Vivid Warm", style: { filterAmount: 2 } },
    { name: "Vivid Cool", style: { filterAmount: 2 } },
    { name: "Dramatic", style: { filterAmount: 1.8 } },
    { name: "Mono", style: { filterAmount: 0 } },
  ];

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const videoRef = useRef<VideoRef>(null);

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

  const onVideoLoad = (data: any) => {
    setDuration(data.duration);
    setEndTime(data.duration > 10 ? 10 : data.duration); // Default to 10 seconds or full video
    if (videoRef.current) {
      videoRef.current.seek(startTime);
    }
  };

  const onProgress = (data: any) => {
    const currentTime = data.currentTime;
    setCurrentTime(currentTime);
    if (currentTime >= endTime) {
      videoRef.current?.seek(startTime);
      setCurrentTime(startTime);
    }
  };

  // PanResponder for swipe gestures
  const [currentIndex, setCurrentIndex] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (e, gestureState) => {
        if (gestureState.dx < 0) {
          // Left swipe
          const nextIndex = (currentIndex + 1) % filters.length;
          setSelectedFilter(filters[nextIndex]);
          setCurrentIndex(nextIndex);
        } else if (gestureState.dx > 0) {
          // Right swipe
          const prevIndex = (currentIndex - 1 + filters.length) % filters.length;
          setSelectedFilter(filters[prevIndex]);
          setCurrentIndex(prevIndex);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const onGLContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const renderer = new THREE.WebGLRenderer({ context: gl });
    const textureLoader = new TextureLoader();

    const videoTexture = textureLoader.load(videoUri);

    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        videoTexture: { value: videoTexture },
        filterAmount: { value: selectedFilter.style.filterAmount || 1 },
      },
      vertexShader,
      fragmentShader,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, shaderMaterial);

    const scene = new THREE.Scene();
    scene.add(mesh);

    const camera = new THREE.Camera();

    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
  };

  return (
    <View style={styles.container}>
      <Button title="Upload Video" onPress={uploadVideo} />
      {videoUri && (
        <>
          <View
            style={styles.swipeArea}
            {...panResponder.panHandlers}
          >
            <Text style={styles.infoText}>
              Swipe left or right to change the filter
            </Text>
          </View>

          <GLView
            style={styles.video}
            onContextCreate={onGLContextCreate}
          />

          <Text style={styles.durationText}>
            Trim Range: {startTime.toFixed(2)}s - {endTime.toFixed(2)}s
          </Text>

          <View style={styles.sliderContainer}>
            <Text>Start: {startTime.toFixed(2)}s</Text>
            <Slider
              value={startTime}
              onValueChange={(value) => {
                setStartTime(value);
                if (videoRef.current) {
                  videoRef.current.seek(value);
                }
              }}
              minimumValue={0}
              maximumValue={duration}
            />
            <Text>End: {endTime.toFixed(2)}s</Text>
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
          </View>
          <Text style={styles.currentTimeText}>
            Current Playback Time: {currentTime.toFixed(2)}s
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  videoContainer: {
    width: "100%",
    height: 400,
  },
  sliderContainer: {
    marginVertical: 10,
  },
  durationText: {
    textAlign: "center",
    marginVertical: 10,
  },
  currentTimeText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 10,
  },
  swipeArea: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 4,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
  },
  video: {
    width: "100%",
    height: 300,
    marginVertical: 10,
  },
});

export default VideoT;
