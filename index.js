/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {name as appName} from './app.json';
// import Vdeo from './src/screens/vdeo';
// import VideoTrimmerUI from './src/screens/vdeo';
// import VideoT from './src/screens/new';
//  import ImgTextOverly from './src/screens/ImgTextOverly';
// import blur from './src/screens/blur';
//import VideoWithEffects from './src/screens/blur';
// import Blur from './blur';
import VideoTrimmerUI from './src/screens/full';
AppRegistry.registerComponent(appName, () => VideoTrimmerUI);
