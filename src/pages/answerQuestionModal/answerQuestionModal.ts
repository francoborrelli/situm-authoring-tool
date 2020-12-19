import { Component, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
import {
  Platform,
  NavParams,
  ViewController,
  AlertController,
  ModalController,
  Events,
  LoadingController,
  NavController,
} from 'ionic-angular';
import { ModalDeletePOI } from '../modalDeletePoi/modalDeletePoi';
import { PoisService, Poi } from '../../services/pois.service';
import { WorkspaceService } from '../../services/workspace.service';
import {
  Workspace,
  EdicionDelCreador,
  EdicionColaborativa,
  EdicionDelCreadorVersionFinal,
  VersionFinalPublica,
} from '../../services/workspace.service';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner'; //lee QR
import { GameService } from '../../services/game.service';
import { environment } from '../../env/environment';
import { NuevoQuestionPoiPage } from '../nuevoQuestionPoi/nuevoQuestionPoi';

@Component({
  selector: 'page-modalquestion',
  templateUrl: 'answerQuestionModal.html',
})
export class ModalQuestionContentPage {
  poi: Poi;
  editedPoi: Poi;
  icon;
  character;
  colorString;
  workspace: Workspace;
  visible: boolean;
  editionMode: boolean;
  loadingSave: any;
  userLogged: any;
  options: any;
  statusString: string;
  isWorkspaceOwner: boolean;
  mustShowEditAndDelete: boolean;
  mustShowSwitchPoiVisibility: boolean;
  qrOptionSelected: any;
  qrAutorizado: boolean;
  ionApp: any;
  pageModal: any;
  ionModal: any;
  modelQRPoi: string;
  loggedUser: any;
  question: any;

  userText = '';
  clicked = false;

  answer: '';

  isFinalUser: boolean;
  constructor(
    public platform: Platform,
    public viewCtrl: ViewController,
    private navParams: NavParams,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private poisService: PoisService,
    private workspaceService: WorkspaceService,
    private qrScanner: QRScanner,
    private zone: NgZone,
    public events: Events,
    private navCtrl: NavController,
    public loadingCtrl: LoadingController,
    private gameService: GameService,
    private cd: ChangeDetectorRef
  ) {
    this.editionMode = false;
    this.poi = this.navParams.get('poi');
    this.editedPoi = Object.assign({}, this.poi);
    this.workspace = this.navParams.get('workspace');
    this.userLogged = this.navParams.get('userLogged');
    this.question = this.navParams.get('question');

    this.options = ['Usando WLAN', 'Nuevo QR', 'QR Existente'];
    this.colorString = this.poi.colour.substring(1);
    this.statusString = this.workspace.status.idStatus;
    this.isWorkspaceOwner = this.isOwner();

    if (this.poi.hasQRCode) {
      this.icon =
        'assets/img/' +
        'pinPoiQR' +
        this.workspace.applicationColour.substring(1) +
        '.png';
    } else {
      this.icon =
        'assets/img/' +
        'pinPoi' +
        this.workspace.applicationColour.substring(1) +
        '.png';
    }

    this.workspaceService.subscribeToWorkspaceStateChangesFromModal(
      this.workspace,
      this
    );
  }
  public unregisterBackButtonAction: any; //Boton hacia atrás

  navigateToPoi() {
    this.viewCtrl.dismiss(this.poi);
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  changePoiVisual(visible) {
    this.poisService
      .updatePoiVisibility(this.poi, this.workspace, visible)
      .then((response) => {
        if (!response) {
          this.alertText(
            'ERROR',
            'Hubo un error al intentar cambiar la visibilidad del POI. Intente nuevamente.'
          );
        }
      });
  }

  public confirmText() {}

  public scanToUseExistingQR() {
    // Optionally request the permission early
    this.qrScanner
      .prepare()
      .then((status: QRScannerStatus) => {
        if (status.authorized) {
          this.qrAutorizado = true;
          this.inicializarSalidaHaciaAtras();
          this.ionApp = <HTMLElement>(
            document.getElementsByTagName('ion-app')[0]
          );
          this.pageModal = <HTMLElement>(
            document.getElementsByTagName('page-modal')[0]
          );
          this.ionModal = <HTMLElement>(
            document.getElementsByTagName('ion-modal')[0]
          );
          this.ionApp.style.opacity = '0';
          this.pageModal.style.opacity = '0';
          this.ionModal.style.opacity = '0';
          // camera permission was granted
          // start scanning
          let scanSub = this.qrScanner.scan().subscribe((text: string) => {
            //var splitted = text.split(" ", 3);
            //console.log(splitted);
            this.ionApp.style.opacity = '1';
            this.pageModal.style.opacity = '1';
            this.ionModal.style.opacity = '1';
            this.editedPoi.hasQRCode = true;

            this.editedPoi.QRCodeID = text.toString();

            //this.alertText("LO ESCANEADO:", text.toString());
            this.qrScanner.hide(); // hide camera preview
            scanSub.unsubscribe(); // stop scanning
            this.closeQRScanner(true);
            //console.log('Scanned something', text);
          });
        } else if (status.denied) {
          // camera permission was permanently denied
          // you must use QRScanner.openSettings() method to guide the user to the settings page
          // then they can grant the permission from there
        } else {
          // permission was denied, but not permanently. You can ask for permission again at a later time.
        }
      })
      .catch((e: any) => console.log('Error is', e));
  }

  inicializarSalidaHaciaAtras() {
    this.unregisterBackButtonAction = this.platform.registerBackButtonAction(
      () => {
        this.customHandleBackButton(false);
      }
    );
  }

  private customHandleBackButton(aBoolean): void {
    this.closeQRScanner(aBoolean);
    this.ionApp.style.opacity = '1';
    this.pageModal.style.opacity = '1';
    this.ionModal.style.opacity = '1';
  }

  public closeQRScanner(seHaEscaneado) {
    this.qrScanner.destroy();
    this.qrAutorizado = false;
    this.unregisterBackButtonAction && this.unregisterBackButtonAction();
    if (!seHaEscaneado) {
      this.alertText(
        'ATENCIÓN:',
        'Se volvió a seleccionar la opción "' +
          this.editedPoi.asociatedTrigger +
          '" debido a que no ha escaneado ningún código.'
      );
    } else {
      if (this.editedPoi.QRCodeID == this.poi.QRCodeID) {
        //NO SE MODIFICÓ
        this.alertText('ATENCIÓN', 'Se debe escanear un código distinto.');
        this.editedPoi.asociatedTrigger = this.poi.asociatedTrigger;
      }
    }
  }

  private cambioFormaBrindarPoi(anElection) {
    this.editedPoi.QRCodeID = ' ';

    if (anElection == 'Usando WLAN') {
      this.editedPoi.hasQRCode = false;
      this.editedPoi.base64 = null;
      this.editedPoi.QRCodeID = null;
    } else {
      if (anElection == 'QR Existente') {
        this.scanToUseExistingQR(); //ALGUN QR QUE YA EXISTA (DEBERIA SER HASHEADO)
      }
      if (anElection == 'Nuevo QR') {
        this.editedPoi.QRCodeID = this.editedPoi.poiName; //EL NOMBRE (DEBERIA SER HASHEADO)
      }
      this.editedPoi.hasQRCode = true;
    }
  }

  alertText(aTitle, aSubTitle) {
    let alert = this.alertCtrl.create({
      title: aTitle,
      subTitle: aSubTitle,
      buttons: ['Cerrar'],
    });
    alert.present();
  }

  private createLoading(msg) {
    return this.loadingCtrl.create({
      content: msg,
    });
  }

  private hideLoading(loading) {
    if (typeof loading != undefined && typeof loading != null) {
      loading.dismissAll();
      loading = null;
    }
  }

  public updateWorkspaceState(newStatusString) {
    this.statusString = newStatusString;
    this.showEditAndDelete();
    this.showSwithPoiVisibility();
    if (this.workspace) {
      this.workspace.status = this.getSelectedWorkspaceStatus(newStatusString);
      // this.alertText("CAMBIO EL ESTADO A:", newStatusString);
    }
  }

  getSelectedWorkspaceStatus(aStringStatusclass) {
    switch (aStringStatusclass) {
      case 'EdicionDelCreador': {
        return new EdicionDelCreador();
      }
      case 'EdicionColaborativa': {
        return new EdicionColaborativa();
      }
      case 'EdicionDelCreadorVersionFinal': {
        return new EdicionDelCreadorVersionFinal();
      }
      case 'VersionFinalPublica': {
        return new VersionFinalPublica();
      }
    }
  }

  isOwner() {
    return this.workspace.idOwner == this.userLogged.uid;
  }

  showSwithPoiVisibility() {
    this.mustShowSwitchPoiVisibility =
      this.isWorkspaceOwner &&
      this.statusString == 'EdicionDelCreadorVersionFinal';
    //SI SOY OWNER Y SÓLO SI ESTÁ EN ESTADO "NO EDITABLE"
  }

  showEditAndDelete() {
    this.mustShowEditAndDelete =
      (this.isWorkspaceOwner && this.statusString != 'VersionFinalPublica') ||
      (!this.isWorkspaceOwner && this.statusString == 'EdicionColaborativa');
    //SI SOY OWNER Y AÚN ES EDITABLE o... SI NO SOW OWNER Y SE ENCUENTRA EN ESTADO DE EDICIÓN COLABORATIVA
  }

  // GAME

  saveAnswer(answer: any, text) {
    this.answer = answer;
    this.clicked = text || true;
    this.cd.detectChanges();
  }

  sendAnswer() {
    if (this.question.type === 'Closed') {
      this.gameService.answerQuestion(this.poi, this.question, this.userText);
      this.viewCtrl.dismiss(this.userText);
      this.userText = '';
    } else {
      this.userText = '';
      this.gameService.answerQuestion(this.poi, this.question, this.answer);
      this.viewCtrl.dismiss(String(this.answer));
    }
  }

  get hasQuestions(): boolean {
    return this.poi.question ? true : false;
  }

  get isFinal() {
    return this.statusString === 'VersionFinalPublica';
  }

  get expectedAnswer() {
    if (this.poi.question) {
      switch (this.poi.question.type) {
        case 'TrueFalse':
          return this.poi.question.trueFalseAnwser ? 'Verdadero' : 'Falso';
        case 'MultipleChoice':
          return this.poi.question.options.filter((a) => a.correct)[0].text;
        case 'Closed':
          return this.poi.question.correctAnwser;
        default:
          return false;
      }
    }
    return false;
  }

  get isFreeGame() {
    const { kind } = this.workspace;
    return (
      kind &&
      kind.idKind === 'CrearLugaresRelevantesConPreguntas' &&
      this.workspace.configuration.type === 'free'
    );
  }
}
