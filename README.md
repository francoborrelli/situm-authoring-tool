# Situm Authoring tool


![Ionic](https://img.shields.io/badge/Ionic-%233880FF.svg?style=for-the-badge&logo=Ionic&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-000000?style=for-the-badge&logo=ios&logoColor=white)

[![inciscos](https://img.shields.io/badge/doi-10.1109/INCISCOS49368.2019.00060-blue.svg)](https://ieeexplore.ieee.org/abstract/document/9052313)
[![enfoque](https://img.shields.io/badge/doi-10.29019/enfoque.v11n1.586-blue.svg)](http://scielo.senescyt.gob.ec/scielo.php?pid=S1390-65422020000100001&script=sci_abstract&tlng=en)

## 📄 Description

> [!NOTE]  
> This app is only a use-case for testing purposes. It may not be up to date or optimized.

An authoring tool that allows creating context-aware games using Situm for indoor positioning.

## 🛠️ Requirements

[![Ionic](https://img.shields.io/badge/Ionic-%233880FF.svg?style=for-the-badge&logo=Ionic&logoColor=white)](https://ionicframework.com/docs/intro/cli)
[![Android Studio](https://img.shields.io/badge/android%20studio-346ac1?style=for-the-badge&logo=android%20studio&logoColor=white)](https://ionicframework.com/docs/developing/android)
![Xcode](https://img.shields.io/badge/Xcode-007ACC?style=for-the-badge&logo=Xcode&logoColor=white)

## 🚀 Usage

1. Ionic installation : https://ionicframework.com/docs/intro/installation/

2. Initialize project:

```
npm install
ionic cordova prepare android
```

3. Link development plugin folder:

```
  $ cd situm-cordova-getting-started
  $ cordova plugin add --link <path_to_plugin_folder>/situm-cordova-plugin/
```

Before launching the application it is necessary to cover the credentials in the `src/services/situm.ts` file.

So, `config.xml` file should contain one line like this:

    <plugin name="situm-cordova-plugin" spec="file:../situm-cordova-plugin" />

## ⚡ Firebase Configuration

Firebase configuration file can be found it `src/firebaseConfig.ts`. In order to define a new firebase project you should go to https://console.firebase.google.com/ and:

- Create a new project.

- Register a web project.

- Copy the given credentials to `src/firebaseConfig.ts`.

## 🤖 Run Android version

- **Run from command line**: `$ ionic cordova run android -l --ssl`

- **Run from Android Studio**: Go to plaftforms/android folder. Create android studio project and run `MainActivity` class

## 🍎 Run iOS version

- **Run from command line**: `$ ionic cordova run ios`

- **Run from Xcode**: Go to platforms/ios folder and open `Situm Cordova Getting Started.xcworkspace`

## 📲 Images

<div align="center">
    <table >
     <tr>
       <td>
         <img src="images/1.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/2.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/3.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/4.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/5.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/6.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/7.jpg?raw=true"/>
       </td>
        <td>
         <img src="images/8.jpg?raw=true"/>
       </td>
     </tr>
    </table>
    </div>

