import { Component } from '@angular/core';
import {
  Platform,
  NavParams,
  ViewController,
  AlertController,
  LoadingController,
  Keyboard,
} from 'ionic-angular';

import { PoisService } from '../../services/pois.service';

import {
  Workspace,
  WorkspaceService,
  EdicionDelCreador,
  EdicionColaborativa,
  EdicionDelCreadorVersionFinal,
  VersionFinalPublica,
} from '../../services/workspace.service';

import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner'; //lee QR

declare var cordova: any;

@Component({
  selector: 'add-question',
  templateUrl: 'addQuestion.html',
})
export class AddQuestion {
  newQuestion: any;
  workspace: Workspace;
  qrOptionSelected: any;
  qrAutorizado: boolean;
  ionApp: any;
  pagenewQuestion: any;
  ionModal: any;
  options: any;
  modelQRPoi: string;
  loggedUser: any;
  keyword: any;
  isEdit = false;

  constructor(
    public platform: Platform,
    public params: NavParams,
    private viewCtrl: ViewController,
    private navParams: NavParams,
    private alertCtrl: AlertController,
    private qrScanner: QRScanner,
    private loadingCtrl: LoadingController,
    private poisService: PoisService,
    private keyboard: Keyboard,
    private workspaceService: WorkspaceService
  ) {
    this.workspace = this.navParams.get('workspace');
    this.loggedUser = this.navParams.get('loggedUser');
    this.isEdit = this.navParams.get('isEdit');

    this.qrAutorizado = false;

    if (this.isEdit) {
      this.newQuestion = this.navParams.get('question');
    } else {
      this.newQuestion = {
        id: new Date().getTime(),
        ...this.navParams.get('question'),
        options: [
          { name: '', correct: '' },
          { name: '', correct: '' },
        ],
      };
    }

    this.modelQRPoi = 'A';
    this.workspaceService.subscribeToWorkspaceStateChangesFromModal(
      this.workspace,
      this
    );
    this.keyword = this.keyboard;
  }
  public unregisterBackButtonAction: any; //Boton hacia atrás

  okEncrypt(aBase64, loading) {
    loading.dismiss();
    this.newQuestion.base64 = aBase64;
    this.workspace.status.addPoi(this, this.isOwner(), this.newQuestion); //STATE PATTERN
  }

  notOkEncrypt(loading, err) {
    loading.dismiss();
    console.dir(err);
    this.alertText(
      'Error',
      'Se produjo un error al generar el código QR. Intente nuevamente.'
    );
  }

  addControl() {
    this.newQuestion.options = [
      ...this.newQuestion.options,
      { name: '', correct: '' },
    ];
  }

  correctControl(control) {
    this.newQuestion.options.forEach((element) => {
      element.correct = false;
    });
    control.correct = true;
    this.newQuestion.options = [...this.newQuestion.options];
  }
  removeControl(control) {
    this.newQuestion.options = this.newQuestion.options.filter(
      (a) => a !== control
    );
  }

  dismissWithoutSave() {
    //CIERRO SIN GUARDAR
    this.newQuestion = {
      options: [
        { name: '', correct: '' },
        { name: '', correct: '' },
      ],
    };
    this.viewCtrl.dismiss(undefined);
  }

  savePoiToFirebaseAtDismiss(poiToSave) {
    //SE LLAMA DESDE EL PATRÓN STATE
    this.viewCtrl.dismiss(poiToSave);
  }

  justOwnerCanAdd() {
    this.alertText(
      'No se puede agregar',
      'Solo se permite que el propietario del workspace agregue POIs.'
    );
  }

  cantAdd() {
    this.alertText(
      'No se puede agregar',
      'El propietario ha cerrado el workspace y no admite modificaciones.'
    );
  }

  alertText(aTitle, aSubTitle) {
    let alert = this.alertCtrl.create({
      title: aTitle,
      subTitle: aSubTitle,
      buttons: ['Cerrar'],
    });
    alert.present();
  }

  closeQRScanner() {
    this.qrScanner.destroy();
    this.qrAutorizado = false;
    this.unregisterBackButtonAction && this.unregisterBackButtonAction();
    if (this.newQuestion.QRCodeID == ' ') {
      //NO SE MODIFICÓ
      this.qrOptionSelected = 'Usando WLAN';
      this.alertText(
        'ATENCIÓN:',
        'Se volvió a seleccionar la opción "Usando WLAN" debido a que no ha escaneado ningún código.'
      );
    }
  }

  scanToUseExistingQR() {
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
          this.pagenewQuestion = <HTMLElement>(
            document.getElementsByTagName('page-newQuestion')[0]
          );
          this.ionModal = <HTMLElement>(
            document.getElementsByTagName('ion-modal')[0]
          );
          this.ionApp.style.opacity = '0';
          this.pagenewQuestion.style.opacity = '0';
          this.ionModal.style.opacity = '0';
          // camera permission was granted
          // start scanning
          let scanSub = this.qrScanner.scan().subscribe((text: string) => {
            //var splitted = text.split(" ", 3);
            //console.log(splitted);
            this.ionApp.style.opacity = '1';
            this.pagenewQuestion.style.opacity = '1';
            this.ionModal.style.opacity = '1';
            this.newQuestion.hasQRCode = true;

            this.newQuestion.QRCodeID = text.toString();

            //this.alertText("LO ESCANEADO:", text.toString());
            this.qrScanner.hide(); // hide camera preview
            scanSub.unsubscribe(); // stop scanning
            this.closeQRScanner();
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
        this.customHandleBackButton();
      }
    );
  }

  hideLoading(loading) {
    if (typeof loading != undefined && typeof loading != null) {
      loading.dismissAll();
      loading = null;
    }
  }

  createLoading(msg) {
    return this.loadingCtrl.create({
      content: msg,
    });
  }

  isOwner() {
    return this.workspace.idOwner == this.loggedUser.uid;
  }

  updateWorkspaceState(newStatusString) {
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

  private customHandleBackButton(): void {
    this.closeQRScanner();
    this.ionApp.style.opacity = '1';
    this.pagenewQuestion.style.opacity = '1';
    this.ionModal.style.opacity = '1';
  }

  public acceptAddPoi() {
    this.modelQRPoi = this.newQuestion.poiName;
    let loading;
    if (this.newQuestion.hasQRCode) {
      loading = this.createLoading('Encriptando QR');
      loading.present();
      this.poisService
        .encriptQR(this.newQuestion, this, loading)
        .then((result) => {});
    } else {
      this.workspace.status.addPoi(this, this.isOwner(), this.newQuestion); //STATE PATTERN
    }
  }

  get hasQuestions() {
    const { kind } = this.workspace;
    return kind && kind.idKind === 'CrearLugaresRelevantesConPreguntas';
  }

  get completeQuestion() {
    if (!this.hasQuestions) return;

    if (!this.newQuestion.question) return false;

    if (this.newQuestion.type === 'TrueFalse') {
      return true;
    }

    if (this.newQuestion.type === 'MultipleChoice') {
      return (
        this.newQuestion.options &&
        this.newQuestion.options.length >= 2 &&
        this.newQuestion.options.every((e) => !!e.text) &&
        this.newQuestion.options.some((e) => !!e.correct)
      );
    }

    if (this.newQuestion.type === 'Closed') {
      return !!this.newQuestion.correctAnwser;
    }

    return true;
  }
}
