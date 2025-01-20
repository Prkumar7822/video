import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Button,
  Text,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  Modal,
  Animated,
} from "react-native";
import { launchImageLibrary, ImageLibraryOptions, MediaType } from "react-native-image-picker";
import Video from "react-native-video";
import { PanGestureHandler } from "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Slider from '@react-native-community/slider'; // Slider component
 
const Animation = () => {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState<number>(0); // Add a state variable for video key
  const [userText, setUserText] = useState<string>("");
  const [displayText, setDisplayText] = useState<string>("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState<boolean>(false);
  const [textStartTime, setTextStartTime] = useState<number>(0);
  const [textEndTime, setTextEndTime] = useState<number>(0);
  const [imageStartTime, setImageStartTime] = useState<number>(0);
  const [imageEndTime, setImageEndTime] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
 
  // Size states
  const [textSize, setTextSize] = useState<number>(18);
  const [imageSize, setImageSize] = useState<number>(65);
 
  // State arrays for multiple texts and images
  const [texts, setTexts] = useState<{ text: string; startTime: number; endTime: number; position: { x: number; y: number }; size: number }[]>([]);
  const [images, setImages] = useState<{ uri: string; startTime: number; endTime: number; position: { x: number; y: number }; size: number }[]>([]);
 
  // Animated values for opacity, position, bounce, color, and rotation
  const textOpacity = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const textPosition = useRef(new Animated.ValueXY({ x: 100, y: 100 })).current;
  const imagePosition = useRef(new Animated.ValueXY({ x: 150, y: 150 })).current;
  const textBounce = useRef(new Animated.Value(1)).current;
  const textColor = useRef(new Animated.Value(0)).current;
  const imageRotation = useRef(new Animated.Value(0)).current;
 
  // Upload video
  const uploadVideo = () => {
    const options: ImageLibraryOptions = {
      mediaType: "video" as MediaType,
      videoQuality: "high",
    };
 
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        Alert.alert("Cancelled", "You cancelled video selection.");
      } else if (response.errorMessage) {
        Alert.alert("Error", response.errorMessage);
      } else if (response.assets && response.assets[0]?.uri) {
        setVideoUri(response.assets[0].uri);
        setVideoKey(prevKey => prevKey + 1); // Update the video key
      }
    });
  };
 
  // Upload image
  const uploadImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: "photo" as MediaType,
    };
 
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        Alert.alert("Cancelled", "You cancelled image selection.");
      } else if (response.errorMessage) {
        Alert.alert("Error", response.errorMessage);
      } else if (response.assets && response.assets[0]?.uri) {
        setImageUri(response.assets[0].uri);
        setIsImageModalVisible(true);
      }
    });
  };
 
  // Upload text
  const uploadText = () => {
    setIsModalVisible(true);
  };
 
  const saveText = () => {
    const newText = {
      text: userText,
      startTime: textStartTime,
      endTime: textEndTime,
      position: { x: 100, y: 100 },
      size: textSize,
    };
    setTexts([...texts, newText]); // Add the new text to the texts array
    setIsModalVisible(false);
  };
 
  const saveImage = () => {
    const newImage = {
      uri: imageUri!,
      startTime: imageStartTime,
      endTime: imageEndTime,
      position: { x: 150, y: 150 },
      size: imageSize,
    };
    setImages([...images, newImage]); // Add the new image to the images array
    setIsImageModalVisible(false);
  };
 
  // Handle dragging
  const handlePanGesture = Animated.event(
    [{ nativeEvent: { translationX: textPosition.x, translationY: textPosition.y } }],
    { useNativeDriver: false }
  );
 
  const handleImagePanGesture = Animated.event(
    [{ nativeEvent: { translationX: imagePosition.x, translationY: imagePosition.y } }],
    { useNativeDriver: false }
  );
 
  // Track video progress
  const handleProgress = (data: { currentTime: number }) => {
    setCurrentTime(data.currentTime);
  };
 
  useEffect(() => {
    // Reset and animate text opacity
    textOpacity.setValue(0);
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [texts]);
 
  useEffect(() => {
    // Reset and animate image opacity
    imageOpacity.setValue(0);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [images]);
 
  useEffect(() => {
    // Reset and animate text bounce and color
    textBounce.setValue(1);
    textColor.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(textBounce, {
          toValue: 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textBounce, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
 
    Animated.loop(
      Animated.sequence([
        Animated.timing(textColor, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textColor, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [texts]);
 
  useEffect(() => {
    // Reset and animate image rotation
    imageRotation.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(imageRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(imageRotation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [images]);
 
  const textAnimatedStyle = {
    transform: [
      { scale: textBounce },
      { translateX: textPosition.x },
      { translateY: textPosition.y },
    ],
    color: textColor.interpolate({
      inputRange: [0, 1],
      outputRange: ["red", "blue"],
    }),
  };
 
  const imageAnimatedStyle = {
    transform: [
      { translateX: imagePosition.x },
      { translateY: imagePosition.y },
      {
        rotateY: imageRotation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
    ],
  };
 
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {!videoUri && <Button title="Upload Video" onPress={uploadVideo} />}
 
        {videoUri && (
          <>
            <View style={styles.videoContainer}>
              <Video
                key={videoKey} // Add key prop to force re-render
                source={{ uri: videoUri }}
                style={styles.video}
                controls={true}
                resizeMode="contain"
                onProgress={handleProgress}
              />
 
              {/* Render multiple texts with bouncing effect */}
              {texts.map((text, index) => (
                currentTime >= text.startTime && currentTime <= text.endTime && (
                  <PanGestureHandler key={index} onGestureEvent={handlePanGesture}>
                    <Animated.View
                      style={[
                        styles.overlayText,
                        { opacity: textOpacity },
                        textAnimatedStyle,
                      ]}
                    >
                      <Animated.Text
                        style={[
                          styles.overlayTextContent,
                          { fontSize: text.size },
                        ]}
                      >
                        {text.text}
                      </Animated.Text>
                    </Animated.View>
                  </PanGestureHandler>
                )
              ))}
 
              {/* Render multiple images */}
              {images.map((image, index) => (
                currentTime >= image.startTime && currentTime <= image.endTime && (
                  <PanGestureHandler key={index} onGestureEvent={handleImagePanGesture}>
                    <Animated.View
                      style={[
                        styles.overlayImage,
                        { opacity: imageOpacity },
                        imageAnimatedStyle,
                      ]}
                    >
                      <Image source={{ uri: image.uri }} style={{ width: image.size, height: image.size }} />
                    </Animated.View>
                  </PanGestureHandler>
                )
              ))}
            </View>
 
            <View style={styles.bottomButtonsContainer}>
              <Button title="Add Image" onPress={uploadImage} />
              <Button title="Add Text" onPress={uploadText} />
            </View>
          </>
        )}
 
        {/* Text Input Modal */}
        <Modal visible={isModalVisible} transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TextInput placeholder="Enter text" value={userText} onChangeText={setUserText} />
              <TextInput placeholder="Start Time (seconds)" keyboardType="numeric" onChangeText={(val) => setTextStartTime(Number(val))} />
              <TextInput placeholder="End Time (seconds)" keyboardType="numeric" onChangeText={(val) => setTextEndTime(Number(val))} />
              <Slider minimumValue={10} maximumValue={40} step={1} value={textSize} onValueChange={setTextSize} />
              <Button title="Save" onPress={saveText} />
            </View>
          </View>
        </Modal>
 
        {/* Image Input Modal */}
        <Modal visible={isImageModalVisible} transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TextInput placeholder="Start Time (seconds)" keyboardType="numeric" onChangeText={(val) => setImageStartTime(Number(val))} />
              <TextInput placeholder="End Time (seconds)" keyboardType="numeric" onChangeText={(val) => setImageEndTime(Number(val))} />
              <Slider minimumValue={30} maximumValue={150} step={5} value={imageSize} onValueChange={setImageSize} />
              <Button title="Save" onPress={saveImage} />
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  videoContainer: {
    position: "relative",
    width: "100%",
    height: 300, // Or any dynamic size you want
  },
  video: {
    width: "100%",
    height: "100%", // Make video take full space of its container
  },
  overlayText: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Optional: for better readability
    padding: 5,
    borderRadius: 5,
  },
  overlayTextContent: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  overlayImage: {
    position: "absolute",
  },
  imageOverlay: {
    width: 65,
    height: 65, // Set image size as required
    resizeMode: 'contain',
  },
  bottomButtonsContainer: {
    marginTop: 10, // Adjust margin as needed
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
  },
  textInput: {
    padding: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
});
 
export default Animation;
 