import * as OfflinePluginRuntime from "offline-plugin/runtime";
import { Component, render } from "preact";
import { Controls } from "./controls";
import { DrawingList } from "./drawing-list";
import { Footer } from "./footer";
import { draw } from "./card-draw";
import styles from "./app.css";
import { TOURNAMENT_MODE, detectedLanguage } from "./utils";
import { IntlProvider, Text, withText } from "preact-i18n";
import i18n from "./assets/i18n.json";

let songs;
let songDataLoading = null;
function loadSongData(dataName) {
  songDataLoading = import(
    /* webpackChunkName: "songData" */ `./songs/${dataName}.json`
  ).then(data => {
    songs = data;
    songDataLoading = null;
  });
}

class App extends Component {
  state = {
    drawings: [],
    lastDrawFailed: false,
    hasUpdate: false
  };

  componentDidMount() {
    OfflinePluginRuntime.install({
      onUpdateReady() {
        OfflinePluginRuntime.applyUpdate();
      },
      onUpdated: () => {
        this.setState({
          hasUpdate: true
        });
      }
    });
    window.addEventListener("beforeunload", this.handleUnload);
    loadSongData("a20");
  }

  componentWillUnmount() {
    window.removeEventListener("beforeunload", this.handleUnload);
  }

  render() {
    return (
      <div className={styles.container}>
        {this.state.hasUpdate && (
          <p className={styles.updateBanner}>
            <Text id="updateReady">
              Update available, refresh for the freshest code around!
            </Text>
          </p>
        )}
        <Controls
          onDraw={this.doDrawing}
          onSongListChange={loadSongData}
          canPromote={
            TOURNAMENT_MODE &&
            this.state.drawings.length > 1 &&
            !!this.state.drawings[0]
          }
          onPromote={this.handlePromote}
          lastDrawFailed={this.state.lastDrawFailed}
        />
        <DrawingList drawings={this.state.drawings} />
        <Footer />
      </div>
    );
  }

  doDrawing = configData => {
    // wait for async load of song data, if necessary
    if (songDataLoading) {
      songDataLoading.then(() => doDrawing(configData));
      return;
    }

    const drawing = draw(songs, configData);
    if (!drawing.charts.length) {
      this.setState({
        lastDrawFailed: true
      });
      return;
    }

    this.setState(prevState => ({
      drawings: [drawing].concat(prevState.drawings).filter(Boolean),
      lastDrawFailed: false
    }));
  };

  handlePromote = () => {
    if (!this.state.drawings.length || !this.state.drawings[0]) {
      return;
    }

    this.setState(prevState => ({
      drawings: [null].concat(prevState.drawings),
      lastDrawFailed: false
    }));
  };

  handleUnload = e => {
    if (this.state.drawings.length) {
      e.returnValue = this.props.confirmText;
    }
  };
}

const AppWithText = withText({ confirmText: "confirmClose" })(App);

const languageSet = i18n[detectedLanguage] || i18n["en"];
render(
  <IntlProvider definition={languageSet}>
    <AppWithText />
  </IntlProvider>,
  document.body
);
