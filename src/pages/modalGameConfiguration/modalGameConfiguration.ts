import { Component } from '@angular/core';
import {
  Platform,
  NavParams,
  ViewController,
  AlertController,
  LoadingController,
  Keyboard,
  ToastController,
} from 'ionic-angular';

import {
  Workspace,
  WorkspaceService,
  EdicionDelCreador,
  EdicionColaborativa,
  EdicionDelCreadorVersionFinal,
  VersionFinalPublica,
} from '../../services/workspace.service';

declare var cordova: any;

@Component({
  selector: 'modalGameConfiguration',
  templateUrl: 'modalGameConfiguration.html',
})
export class ModalGameConfiguration {
  nuevoPoi: any;
  workspace: Workspace;

  ionApp: any;
  ionModal: any;
  loggedUser: any;
  keyword: any;

  configuration = {};
  initial: boolean;

  constructor(
    public platform: Platform,
    public params: NavParams,
    private viewCtrl: ViewController,
    private navParams: NavParams,
    public toastController: ToastController,
    private loadingCtrl: LoadingController,
    private keyboard: Keyboard,
    private workspaceService: WorkspaceService
  ) {
    this.initial = this.navParams.get('initial');
    this.workspace = this.navParams.get('workspace');
    this.loggedUser = this.navParams.get('loggedUser');
    this.configuration = this.workspace.configuration || {};

    this.workspaceService.subscribeToWorkspaceStateChangesFromModal(
      this.workspace,
      this
    );

    this.keyword = this.keyboard;
  }
  public unregisterBackButtonAction: any; //Boton hacia atrás

  dismissWithoutSave() {
    //CIERRO SIN GUARDAR
    this.viewCtrl.dismiss(undefined);
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

  public save() {
    let loading;
    loading = this.createLoading('Guardando...');
    loading.present();
    this.workspace.configuration = this.configuration;
    this.workspaceService
      .saveWorkspace(this.workspace)
      .then((result) => {
        loading.dismiss();
        const toast = this.toastController.create({
          message: this.initial
            ? 'Configuración de juego creada.'
            : 'Configuración Actualizada.',
          duration: 2000,
        });
        toast.present();
        this.viewCtrl.dismiss(this.workspace);
      })
      .catch(() => {
        loading.dismiss();
        const toast = this.toastController.create({
          message: 'Ocurrió un error al guardar los datos.',
          duration: 2000,
        });
        toast.present();
      });
  }
}
