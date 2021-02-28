import { Component, ViewChild } from '@angular/core';
import {
  Platform,
  Events,
  LoadingController,
  ToastController,
  AlertController,
  ModalController,
} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { PositioningPage } from '../pages/positioning/positioning';
import { BuildingsService, Building } from '../services/buildings.service';
import {
  WorkspaceService,
  Workspace,
  EdicionDelCreador,
  EdicionColaborativa,
  EdicionDelCreadorVersionFinal,
  VersionFinalPublica,
  RecorridoLineal,
  CrearLugaresRelevantes,
  CrearLugaresRelevantesConPreguntas,
} from '../services/workspace.service';
import { User } from '../services/login.service';
import { ModalNewWorkspace } from '../pages/nuevoWorkspace/newWorkspace';

/*import { app } from 'firebase';*/
import { ModalWorkspacesList } from '../pages/modalWorkspacesList/modalWorkspacesList';
import { Subscription } from 'rxjs';
import { Network } from '@ionic-native/network';
import { Diagnostic } from '@ionic-native/diagnostic'; //GPS ENCENDIDO
import { Situm, Fixed } from '../services/positioning.service';
declare var cordova: any;

@Component({
  templateUrl: 'app.html',
})
export class MyApp {
  rootPage: any = PositioningPage;
  loggedUser: User; //Propio
  private edificios: Building[];
  private qrAutorizado: any;
  public myWorkspaces: Workspace[];
  public myWorkSpacesAsCollaborator: Workspace[];
  public myWorkSpacesAsFinalUser: Workspace[];
  private loadedResources;
  private loadingTool;
  private loadingConnection;
  private subscriptionToStatusChange: Subscription;
  private disconnectSubscription: any;
  private connectSubscription: any;
  private aperturaWorkspace: boolean = true;
  constructor(
    public platform: Platform,
    private statusBar: StatusBar,
    private splashScreen: SplashScreen,
    private alertCtrl: AlertController,
    private events: Events,
    private buildingsService: BuildingsService,
    private workspaceService: WorkspaceService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private network: Network,
    private diagnostic: Diagnostic
  ) {
    this.initializeApp();
  }
  onViewDidEnter() {
    this.initializeApp();
  }

  initializeApp() {
    this.loadedResources = 0;
    this.myWorkSpacesAsCollaborator = new Array<Workspace>();
    this.myWorkSpacesAsFinalUser = new Array<Workspace>();
    if (!this.disconnectSubscription) {
      this.disconnectSubscription = this.network
        .onDisconnect()
        .subscribe(() => {
          //PREGUNTAR SI TENGO PRENDIDO EL WIFI O LOS DATOS
          this.diagnostic.isWifiEnabled().then((isEnabled) => {
            if (!isEnabled) {
              //SI ESTÁ PRENDIDO EL WIFI...
              let alert = this.alertCtrl.create({
                title: 'AVISO',
                subTitle:
                  'Se logra una conexión más estable a través de una conexión wifi.',
                buttons: ['Cerrar'],
              });
              alert.present();
              alert.onDidDismiss((data) => {
                this.loadingConnection = this.createLoading(
                  'Conexión de internet perdida. Reconectando...'
                );
                this.loadingConnection.present();
              });
            } else {
              //SI NO ESTÁ PRENDIDO EL WIFI
              this.loadingConnection = this.createLoading(
                'Conexión de internet perdida. Reconectando...'
              );
              this.loadingConnection.present();
            }
          });
        });
    }

    if (!this.connectSubscription) {
      this.connectSubscription = this.network.onConnect().subscribe(() => {
        if (this.loadingConnection) {
          this.hideLoading(this.loadingConnection);
        }
        // We just got a connection but we need to wait briefly
        // before we determine the connection type. Might need to wait.
        // prior to doing any api requests as well.
        // setTimeout(() => {
        //   if (this.network.type === 'wifi') {
        //     console.log('we got a wifi connection, woohoo!');
        //   }
        // }, 3000);
      });
    }

    this.platform
      .ready()
      .then(() => {
        // Okay, so the platform is ready and our plugins are available.
        // Here you can do any higher level native things you might need.
        //statusBar.styleDefault();
        this.statusBar.overlaysWebView(false);
        this.statusBar.backgroundColorByHexString('#000000');
        this.splashScreen.hide();
        this.platform.pause.subscribe(() => {
          //Subscribe al "minimizado de la aplicación"
          this.minimizeApp();
        });
      })
      .catch((error) => {
        console.log(error);
      });

    this.events.subscribe('functionCall:successLogin', (aUserLogged) => {
      this.loadingTool = this.createLoading(
        'Cargando entorno de Authoring Tool...'
      );
      this.loadingTool.present();
      /*INICIO LLAMADOS A SITUM Para crear un workspace necesito EL EDIFICIO DE SITUM CON SUS PISOS que le voy a asociar*/
      this.buildingsService.fetchBuildings().then((resPromesa) => {
        if (resPromesa) {
          this.edificios = resPromesa;
          console.log('EDIFICIOS TRAIDOS');
          console.log(resPromesa);
          this.loadedResources = this.loadedResources + 1;
          this.hideLoadingResources();
        }
      });
      /*FIN DE LLAMADOS A SITUM */

      /*INICIO DE LLAMADOS A FIREBASE*/
      this.loggedUser = aUserLogged; //MANDO LOS DATOS DEL USUARIO LOGUEADO A LA APP PRINCIPAL PARA QUE TENGA ACCESO EL MENU PRINCIPAL
      this.workspaceService
        .getWorkspaces(this.loggedUser.uid)
        .then((ownWorkspacesResult) => {
          console.log('ownWorkspacesResult', ownWorkspacesResult);
          this.initializeWorskpaces(ownWorkspacesResult);
        });

      this.workspaceService
        .getWorkspacesReferences(this.loggedUser.uid)
        .then((references) => {
          this.initializeReferences(references);
        });
      /*FIN DE LLAMADOS A FIREBASE*/
    });

    this.events.subscribe('addWorkspaceAsCollaborator', (wsReference) => {
      this.importWorkspaceFromAnotherUser2(wsReference);
      //this.alertText("idOwner: "+idOwnerAndIdWorkspaceStringArray[0], "idWorkspace: "+idOwnerAndIdWorkspaceStringArray[1])
    });

    this.events.subscribe('logout', () => {
      this.myWorkspaces = undefined;
      this.myWorkSpacesAsCollaborator = new Array<Workspace>();
      this.myWorkSpacesAsFinalUser = new Array<Workspace>();
      this.edificios = undefined;
      this.loggedUser = undefined;
    });
  }

  initializeWorskpaces(ownWorkspacesResult) {
    if (ownWorkspacesResult) {
      console.log('WORKSPACES PROPIOS TRAIDOS');
      console.log(ownWorkspacesResult);
      this.loadedResources = this.loadedResources + 1;
      this.hideLoadingResources();
      this.setWorkspaces(ownWorkspacesResult);
    } else {
      let message =
        'Hubo un error al obtener los workspaces, intente nuevamente.';
      this.presentToast(message, 'top', null);
    }
  }

  initializeReferences(references) {
    console.log('QUE TENIAN LAS REFERENCIAS?');
    console.log(references);
    console.log('EL USER TENIA:');
    console.log(this.loggedUser);
    if (references.length != 0) {
      this.getWorkspacesFromReferences(references);
    } else {
      this.loadedResources = this.loadedResources + 1; //SI NO TIENE REFERENCIAS TENGO QUE ASUMIR QUE YA SE CARGÓ
      this.hideLoadingResources();
    }
  }

  hideLoadingResources() {
    //Edificios, Workspaces y Workspaces as collaborator (3 recursos en total)
    console.log('CANTIDAD DE RECURSOS CARGADOS');
    console.log(this.loadedResources);
    if (this.loadedResources == 3) {
      //Por eso pregunto por 3.
      this.hideLoading(this.loadingTool);
      this.loadedResources = 0;
    }
  }

  getCurrentStatus(aStringStatusClass) {
    //DEBERÍA SER POR REFLECTION
    switch (aStringStatusClass) {
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
  getKind(aStringKindClass) {
    //DEBERÍA SER POR REFLECTION
    switch (aStringKindClass) {
      case 'CrearLugaresRelevantes': {
        return new CrearLugaresRelevantes();
      }
      case 'CrearLugaresRelevantesConPreguntas': {
        return new CrearLugaresRelevantesConPreguntas();
      }
      case 'RecorridoLineal': {
        return new RecorridoLineal();
      }
    }
  }

  public getPositioning(aStringPositioningClass) {
    //DEBERÍA SER POR REFLECTION
    switch (aStringPositioningClass) {
      case 'Fixed': {
        return new Fixed();
      }
      case 'Situm':
      default: {
        return new Situm();
      }
    }
  }

  prepareWorkspacesStatusesAndKind(aWorkspaces) {
    aWorkspaces.forEach((ws) => {
      if (ws) {
        let statusClassString = ws.status.idStatus;
        let kindClassString = ws.kind.idKind;
        let positioningClassString = ws.positioning.idPositioning;
        ws.status = this.getCurrentStatus(statusClassString);
        ws.kind = this.getKind(kindClassString);
        ws.positioning = this.getPositioning(positioningClassString);
      }
    });
  }

  workspacePreviouslyImported(anIdWorkspace) {
    if (this.myWorkSpacesAsCollaborator.length == 0) {
      return false;
    }
    let wasImported = this.myWorkSpacesAsCollaborator.find(function (ws) {
      return ws.idWorkspace == anIdWorkspace;
    });
    if (wasImported == undefined) {
      return false;
    } else {
      return true;
    }
  }

  importWorkspaceFromAnotherUser2(workspaceReference) {
    let wasMyWorkspace = workspaceReference.idOwner == this.loggedUser.uid;
    if (!wasMyWorkspace) {
      let loadingUniendose;
      let collaboratorData = {
        idCollaborator: '',
        idColour: '',
        isFinalUser: false,
        isCollaborator: false,
      };
      let collaboratorFound;
      let userColour = workspaceReference.idColour;
      this.workspaceService
        .getWorkspaceFromReference(workspaceReference)
        .then((ws) => {
          ws.status = this.getCurrentStatus(ws.status.idStatus);

          if (ws.collaborators) {
            //SI HAY COLABORADORES, BUSCO A VER SI ESTOY
            var collaboratorsArray = Object.keys(ws.collaborators).map(
              function (index) {
                let col = ws.collaborators[index];
                return col;
              }
            );
            collaboratorFound = collaboratorsArray.find(
              (col) => col.idCollaborator == this.loggedUser.uid
            );
          }

          console.log('ws', ws);

          if (ws.status.idStatus == 'VersionFinalPublica') {
            if (!collaboratorFound) {
              //SI NO ESTABA EN LA COLECCION
              collaboratorData.idCollaborator = this.loggedUser.uid;
              collaboratorData.idColour = userColour;
              collaboratorData.isFinalUser = true;
              collaboratorData.isCollaborator = false;
              loadingUniendose = this.createLoading('Uniéndose...');
              loadingUniendose.present();
              this.workspaceService
                .addMeAsFinalUser(workspaceReference, collaboratorData)
                .then(
                  (response) => {
                    console.log('ws', ws);
                    console.log('response', response);
                    if (
                      ws.kind.idKind === 'CrearLugaresRelevantesConPreguntas'
                    ) {
                      this.alertText(
                        'Éxito',
                        'Se ha unido al Juego Móvil correctamente, accediendo a la opción del menú Aplicaciones finales puede empezar a jugar.'
                      );
                    } else {
                      this.alertText(
                        'Éxito',
                        'Se ha unido a la aplicación final correctamente. Ahora puede verlo en el listado de aplicaciones finales.'
                      );
                    }

                    this.addWorkspaceAsFinalUser(ws, collaboratorData); //ACTUALIZA LA COLECCION ACTUAL
                    console.log(response);
                    this.hideLoading(loadingUniendose);
                  },
                  (error) => {
                    console.log(error);
                    this.hideLoading(loadingUniendose);
                    this.alertText(
                      'Error',
                      'Hubo un error al unirse , intente nuevamente.'
                    );
                    const message =
                      'Hubo un error al unirse, intente nuevamente.';
                    this.presentToast(message, 'top', null);
                  }
                );
            } else {
              //ESTABA EN LA COLECCION, LO ENCONRO
              if (!collaboratorFound.isFinalUser) {
                //SI NO ES USUARIO FINAL
                collaboratorData.idCollaborator =
                  collaboratorFound.idCollaborator;
                collaboratorData.idColour = collaboratorFound.idColour;
                collaboratorData.isCollaborator =
                  collaboratorFound.isCollaborator;
                collaboratorData.isFinalUser = true;
                loadingUniendose = this.createLoading('Uniéndose...');
                loadingUniendose.present();
                this.workspaceService
                  .updateFinalUserOrCollaborator(
                    workspaceReference,
                    collaboratorData
                  )
                  .then(
                    (response) => {
                      this.alertText(
                        'Éxito',
                        'Se ha unido a la aplicación final correctamente. Ahora puede verlo en el listado de aplicaciones finales.'
                      );
                      this.addWorkspaceAsFinalUser(ws, collaboratorData); //ACTUALIZA LA COLECCION ACTUAL
                      console.log(response);
                      this.hideLoading(loadingUniendose);
                    },
                    (error) => {
                      console.log(error);
                      this.hideLoading(loadingUniendose);
                      this.alertText(
                        'Error',
                        'Hubo un error al unirse , intente nuevamente.'
                      );
                      const message =
                        'Hubo un error al unirse, intente nuevamente.';
                      this.presentToast(message, 'top', null);
                    }
                  );
              } else {
                this.alertText(
                  'AVISO',
                  'Ud. Ya había importado esta aplicación.'
                );
              }
            }
          } else {
            //SI NO ESTA EN ESTADO VERSION FINAL PUBLICO
            if (!collaboratorFound) {
              //SI NO ESTABA EN LA COLECCION
              collaboratorData.idCollaborator = this.loggedUser.uid;
              collaboratorData.idColour = userColour;
              collaboratorData.isFinalUser = false;
              collaboratorData.isCollaborator = true;
              loadingUniendose = this.createLoading('Uniéndose...');
              loadingUniendose.present();
              this.workspaceService
                .addMeAsCollaborator(workspaceReference, collaboratorData)
                .then(
                  (result) => {
                    this.hideLoading(loadingUniendose);
                    this.alertText(
                      'Éxito',
                      'Se ha unido al workspace correctamente. Ahora puede verlo en el listado de workspaces en los que colabora.'
                    );
                    this.addWorkspaceAsCollaborator(ws, collaboratorData); //ACTUALIZA LA COLECCION ACTUAL
                  },
                  (error) => {
                    console.log(error);
                    this.hideLoading(loadingUniendose);
                    this.alertText(
                      'Error',
                      'Hubo un error al unirse al workspace, intente nuevamente.'
                    );
                    const message =
                      'Hubo un error al unirse, intente nuevamente.';
                    this.presentToast(message, 'top', null);
                  }
                );
            } else {
              //SI ESTABA EN LA COLECCION
              if (!collaboratorFound.isCollaborator) {
                //SI NO ERA COLABORADOR
                collaboratorData.idCollaborator =
                  collaboratorFound.idCollaborator;
                collaboratorData.idColour = collaboratorFound.idColour;
                collaboratorData.isFinalUser = collaboratorFound.isFinalUser;
                collaboratorData.isCollaborator = true;
                loadingUniendose = this.createLoading('Uniéndose...');
                loadingUniendose.present();
                this.workspaceService
                  .updateFinalUserOrCollaborator(
                    workspaceReference,
                    collaboratorData
                  )
                  .then(
                    (response) => {
                      this.alertText(
                        'Éxito',
                        'Se ha unido al workspace correctamente. Ahora puede verlo en el listado de workspaces en los que colabora.'
                      );
                      this.addWorkspaceAsFinalUser(ws, collaboratorData); //ACTUALIZA LA COLECCION ACTUAL
                      console.log(response);
                      this.hideLoading(loadingUniendose);
                    },
                    (error) => {
                      console.log(error);
                      this.hideLoading(loadingUniendose);
                      this.alertText(
                        'Error',
                        'Hubo un error al unirse al workspace, intente nuevamente.'
                      );
                      const message =
                        'Hubo un error al unirse, intente nuevamente.';
                      this.presentToast(message, 'top', null);
                    }
                  );
              } else {
                this.alertText('AVISO', 'Ud. Ya se había unido al workspace');
              }
            }
          }
        });
    } else {
      this.alertText(
        'AVISO',
        'Ud. Es el creador y no puede unirse a un workspace propio como colaborador o usuario final.'
      );
    }
  }

  foundCollaborator(colFound, type) {
    let cData;
    switch (type) {
      case 'Final': {
        cData = {
          idCollaborator: colFound.idCollaborator,
          idColour: colFound.idColour,
          isFinalUser: true,
          isCollaborator: colFound.isCollaborator,
        };
      }
      case 'Collaborator': {
        cData = {
          idCollaborator: colFound.idCollaborator,
          idColour: colFound.idColour,
          isFinalUser: colFound.isFinalUser,
          isCollaborator: true,
        };
      }
    }
    return cData;
  }

  newCollaborator(
    idCollaborator: string,
    idColour: string,
    isFinalUser: boolean,
    isCollaborator: boolean
  ) {
    let cData = { idCollaborator, idColour, isFinalUser, isCollaborator };
    return cData;
  }

  importWorkspaceFromAnotherUser(workspaceReference) {
    //SI NO SOY YO O YA ESTABA IMPORTADO NO TENGO QUE DEJAR IMPORTAR
    let wasMyWorkspace = workspaceReference.idOwner == this.loggedUser.uid;
    let userColour = workspaceReference.idColour;
    let workspacePreviouslyImported = this.workspacePreviouslyImported(
      workspaceReference.idWorkspace
    );

    if (!wasMyWorkspace && !workspacePreviouslyImported) {
      let importingWorkspace = this.createLoading('Uniéndose al workspace...');
      importingWorkspace.present();
      this.workspaceService
        .importWorkspaceFromAnotherUser(workspaceReference)
        .then(
          (result) => {
            if (result) {
              let userCollaboratorAndColour = {
                idCollaborator: this.loggedUser.uid,
                idColour: userColour,
              };
              this.addWorkspaceAsCollaborator(
                result,
                userCollaboratorAndColour
              );
              //this.workspaceService.saveWorkspaceAsCollaborator()
              this.hideLoading(importingWorkspace);
              this.workspaceService
                .addMeAsCollaborator(
                  workspaceReference,
                  userCollaboratorAndColour
                )
                .then((result) => {
                  this.alertText(
                    'Éxito',
                    'Se ha unido al workspace correctamente. Ahora puede verlo en el listado de workspaces en los que colabora.'
                  );
                });
            }
          },
          (error) => {
            this.hideLoading(importingWorkspace);
            this.alertText(
              'Error',
              'Hubo un error al unirse al workspace, intente nuevamente.'
            );
            const message =
              'Hubo un error al unirse al workspace, intente nuevamente.';
            this.presentToast(message, 'top', null);
          }
        );
    } else {
      if (wasMyWorkspace) {
        this.alertText(
          'AVISO',
          'No se puede unir como colaborador a un workspace propio.'
        );
      } else {
        if (workspacePreviouslyImported) {
          this.alertText(
            'AVISO',
            'Ya se había unido a este workspace anteriormente.'
          );
        }
      }
    }
  }

  addWorkspaceAsCollaborator(anExternalWorkspace, collaboratorData) {
    if (anExternalWorkspace.collaborators == undefined) {
      //CREO UNA LISTA ITERABLE DE COLABORADORES
      anExternalWorkspace.collaborators = new Array<any>();
    } else {
      //SI YA TENIA DATOS LO TENGO QUE CONVERTIR A ITERABLE
      let cols;
      cols = Object.keys(anExternalWorkspace.collaborators).map(function (
        index
      ) {
        let col = anExternalWorkspace.collaborators[index];
        return col;
      });
      anExternalWorkspace.collaborators = cols;
    }
    anExternalWorkspace.collaborators.push(collaboratorData); //SIEMPRE ME PUSHEO COMO COLABORADOR
    this.myWorkSpacesAsCollaborator.push(anExternalWorkspace); //AGREGO EL WORKSPACE ARMADO A MI COLECCION DE WORKSPACE AS COLLABORATOR
  }

  addWorkspaceAsFinalUser(anExternalWorkspace, collaboratorData) {
    if (anExternalWorkspace.collaborators == undefined) {
      //CREO UNA LISTA ITERABLE DE COLABORADORES
      anExternalWorkspace.collaborators = new Array<any>();
    } else {
      //SI YA TENIA DATOS LO TENGO QUE CONVERTIR A ITERABLE
      let cols;
      cols = Object.keys(anExternalWorkspace.collaborators).map(function (
        index
      ) {
        let col = anExternalWorkspace.collaborators[index];
        return col;
      });
      anExternalWorkspace.collaborators = cols;
    }
    anExternalWorkspace.collaborators.push(collaboratorData); //SIEMPRE ME PUSHEO COMO COLABORADOR
    this.myWorkSpacesAsFinalUser.push(anExternalWorkspace); //AGREGO EL WORKSPACE ARMADO A MI COLECCION DE WORKSPACE AS COLLABORATOR
  }

  //ACA VA UN METODO DE SUSCRIPCION AL CAMBIO DE ESTADO
  buscarWorkspaceEnElListadoYActualizar(obj) {
    if (obj) {
      let workspaceActualizado = this.myWorkSpacesAsCollaborator.find(function (
        ws
      ) {
        return obj.idWorkspace == ws.idWorkspace;
      });

      let index = this.myWorkSpacesAsCollaborator.indexOf(workspaceActualizado);
      workspaceActualizado.status = this.getCurrentStatus(obj.idStatus);
      this.myWorkSpacesAsCollaborator[index] = workspaceActualizado;
    }
  }

  getWorkspacesFromReferences(references) {
    let allReferences = references.length;
    let referencesOk = 0;
    references.forEach((ref) => {
      this.workspaceService.getWorkspaceFromReference(ref).then((ws) => {
        referencesOk = referencesOk + 1;
        /*SUBSCRIBE DE CADA WORKSPACE DE LA LISA */
        this.workspaceService.subscribeToWorkspaceStateChangeForList(ws, this);
        /*SUBSCRIBE DE CADA WORKSPACE DE LA LISTA */

        let collaborators = Object.keys(ws.collaborators).map(function (index) {
          let col = ws.collaborators[index];
          return col;
        });
        let u = collaborators.find(
          (uc) => uc.idCollaborator == this.loggedUser.uid
        );
        if (u.isCollaborator == true) {
          this.myWorkSpacesAsCollaborator.push(ws);
        }
        if (u.isFinalUser == true) {
          ws.status = this.getCurrentStatus(ws.status.idStatus);

          this.myWorkSpacesAsFinalUser.push(ws);
        }
        if (referencesOk == allReferences) {
          //Si se trajeron todas
          console.log(
            'SE TRAJERON TODAS LOS WORKSPACES A TRAVES DE LAS REFERENCIAS'
          );
          console.log(this.myWorkSpacesAsCollaborator);
          this.prepareWorkspacesStatusesAndKind(
            this.myWorkSpacesAsCollaborator
          );

          this.myWorkSpacesAsFinalUser.map((ws) => {
            ws.positioning = this.getPositioning(ws.positioning.idPositioning);
          });
          // this.prepareWorkspacesStatusesAndKind(this.myWorkSpacesAsFinalUser);
          this.loadedResources = this.loadedResources + 1;
          this.hideLoadingResources();
        }
      });
    });
  }

  nameUsedInOtherWorkspace = (aName) => {
    let wasUsed = this.myWorkspaces.find(function (ws) {
      return ws.name == aName;
    });
    if (wasUsed == undefined) {
      return false;
    } else {
      return true;
    }
  };

  setWorkspaces = (aWorkspacesCollection) => {
    this.myWorkspaces = aWorkspacesCollection;
    this.prepareWorkspacesStatusesAndKind(aWorkspacesCollection);
    console.log(this.myWorkspaces);
    console.log(aWorkspacesCollection);
  };

  findBuildingToWorkspace(aBuildingIdentifier) {
    return this.edificios.filter(
      (edif) => edif.buildingIdentifier === aBuildingIdentifier
    );
  }

  createWorkspace() {
    //GUARDA UN WORKSPACE CON UN EDIFICIO ASOCIADO EN OTRA COLECCIÓN EN LA BASE

    let newWorkspaceModal = this.modalCtrl.create(
      ModalNewWorkspace,
      this.edificios
    ); //Le paso el poi casi completo
    newWorkspaceModal.onDidDismiss((ws) => {
      //CUANDO SE CIERRE EL MODAL VUELVE CON DATOS
      let message;
      if (ws) {
        //SI GUARDO ALGO CON LA VENTANA MODAL

        if (!this.nameUsedInOtherWorkspace(ws.name)) {
          let loadingSavingWS = this.createLoading('Creando workspace...');
          loadingSavingWS.present();
          ws.idOwner = this.loggedUser.uid; //PONGO EL ID DEL PROPIETARIO
          let buildingToSave = this.findBuildingToWorkspace(
            ws.buildingIdentifier
          ); //BUSCO EL EDIFICIO EN LA COLECCION
          ws.building = buildingToSave; //SETEO EN EL WORKSPACE EL EDIFICIO DE SITUM
          this.workspaceService.saveWorkspace(ws).then((savedWorkspace) => {
            //GUARDA EL WORKSPACE Y EL EDIFICIO PERO EL EDIFICIO EN OTRA COLECCION (VER EL CODIGO)
            if (savedWorkspace) {
              this.hideLoading(loadingSavingWS);
              message = 'Se ha creado el workspace.';
              this.presentToast(message, 'top', null);
              this.myWorkspaces.push(ws); //LO AGREGO A LA COLECCIÓN LOCAL, A LA BASE YA LO AGREGUÉ
            } else {
              this.hideLoading(loadingSavingWS);
              message =
                'Hubo un error al crear el workspace, intente nuevamente.';
              this.presentToast(message, 'top', null);
            }
          });
        } else {
          this.alertText(
            'ERROR:',
            'El nombre ya fue utilizado, por favor intente con otro nombre.'
          );
        }
      }
    });
    newWorkspaceModal.present();
  }

  private hideLoading(loading) {
    if (typeof loading != undefined && typeof loading != null) {
      loading.dismissAll();
      loading = null;
    }
  }

  private createLoading(msg) {
    return this.loadingCtrl.create({
      content: msg,
    });
  }

  presentToast(text, position, toastClass) {
    const toast = this.toastCtrl.create({
      message: text,
      duration: 3000,
      position: position,
      cssClass: toastClass ? toastClass : '',
    });
    toast.present();
  }

  inspeccionarDatos() {}

  setWorkspaceState(newStringStatus) {
    if (newStringStatus) {
      this.events.publish('workspace:setWorkspaceState', newStringStatus);
    } else {
      console.log(
        'HUBO UN ERROR AL CAMBIAR EL ESTADO DEL WORKSPACE. Por favor inténtelo nuevamente.'
      );
    }
  }

  updateWorkspaceState(newStringStatus) {
    if (newStringStatus) {
      this.events.publish('workspace:updated', newStringStatus);
    } else {
      console.log(
        'HUBO UN ERROR AL CAMBIAR EL ESTADO DEL WORKSPACE. Por favor inténtelo nuevamente.'
      );
    }
  }

  private esWorkspacePropio(aWorkspace) {
    return aWorkspace.idOwner == this.loggedUser.uid;
  }

  private subscribeToStatusChange(aWorkspace) {
    //if (!this.esWorkspacePropio(aWorkspace)) { //SI NO ES MI PROPIO WORKSPACE TENGO QUE MIRAR SI CAMBIA EL ESTADO
    this.workspaceService.subscribeToWorkspaceStateChanges(aWorkspace, this);
    //}
  }

  openWorkspace(aWorkspace) {
    this.subscribeToStatusChange(aWorkspace);
    /*
    strategyToShowPoIWLAN: StrategyToShowMarker;
    strategyToShowPoIQR: StrategyToShowMarker
    strategyToShowInformationPoIWLAN: StrategyToShowInformation;
    strategyToShowInformationPoIQR: StrategyToShowInformation;
    */

    if (aWorkspace.strategyToShowPoIWLAN) {
      aWorkspace.strategyToShowPoIWLAN = this.workspaceService.getStrategyToShowMarker(
        aWorkspace.strategyToShowPoIWLAN.idStrategyShowMarker
      );
      aWorkspace.strategyToShowPoIQR = this.workspaceService.getStrategyToShowMarker(
        aWorkspace.strategyToShowPoIQR.idStrategyShowMarker
      );
      aWorkspace.strategyToShowInformationPoIWLAN = this.workspaceService.getStrategyToShowInformation(
        aWorkspace.strategyToShowInformationPoIWLAN.idStrategyShowInformation
      );
      aWorkspace.strategyToShowInformationPoIQR = this.workspaceService.getStrategyToShowInformation(
        aWorkspace.strategyToShowInformationPoIQR.idStrategyShowInformation
      );
    }

    console.log(aWorkspace);
    let loadWS = this.createLoading('Cargando workspace...');
    loadWS.present();
    this.buildingsService
      .getBuildingForWorkspace(aWorkspace.buildingIdentifier)
      .then(
        (result) => {
          aWorkspace.building = result;
          this.hideLoading(loadWS);
          this.events.publish('workspace:ready', aWorkspace);
        },
        (error) => {
          const message =
            'Hubo un error al cargar el workspace, intente nuevamente.';
          this.presentToast(message, 'top', null);
          this.hideLoading(loadWS);
        }
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

  scanToImportWorkspace() {
    this.events.publish('scanToImportWorkspace');
  }
  openModalFinalApps() {
    let parameters;
    parameters = {
      workspaces: this.myWorkSpacesAsFinalUser,
      theyAreMyWorkspaces: true,
      loggedUser: this.loggedUser,
    };
    let workspacesListModal = this.modalCtrl.create(
      ModalWorkspacesList,
      parameters
    ); //Le paso la lista de workspaces
    workspacesListModal.onDidDismiss((ws) => {
      //CUANDO SE CIERRE EL MODAL VUELVE CON DATOS

      if (ws != undefined) {
        this.openWorkspace(ws);
      }
    });
    workspacesListModal.present();
  }
  /*
  <button ion-item text-wrap menuToggle (click)="openModal('misWorkspaces')">
            <ion-icon color="myBlueColour" style="font-size: 26px;" ios="ios-list-box" md="md-list-box" item-start></ion-icon>
            Mis workspaces
        </button>
        <button ion-item text-wrap menuToggle (click)="openModal('workspacesDondeColaboro')">
            <ion-icon color="myBlueColour" style="font-size: 26px;" ios="ios-list" md="md-list" item-start></ion-icon>
            Workspaces en los que colaboro
        </button>
        <button ion-item text-wrap menuToggle (click)="openModalFinalApps('aplicacionesFinales')">
  */

  openModal(tipoWorkspaces) {
    let parameters;
    if (tipoWorkspaces == 'misWorkspaces') {
      parameters = {
        workspaces: this.myWorkspaces,
        tipoWorkspaces: 'misWorkspaces',
        loggedUser: this.loggedUser,
      }; //MIS WORKSPACES
    } else {
      if (tipoWorkspaces == 'workspacesDondeColaboro') {
        parameters = {
          workspaces: this.myWorkSpacesAsCollaborator,
          tipoWorkspaces: 'workspacesDondeColaboro',
          loggedUser: this.loggedUser,
        }; //MIS WORKSPACES
      } else {
        if (tipoWorkspaces == 'aplicacionesFinales') {
          parameters = {
            workspaces: this.myWorkSpacesAsFinalUser,
            tipoWorkspaces: 'aplicacionesFinales',
            loggedUser: this.loggedUser,
          }; //MIS WORKSPACES
        }
      }
    }

    let workspacesListModal = this.modalCtrl.create(
      ModalWorkspacesList,
      parameters
    ); //Le paso la lista de workspaces
    workspacesListModal.onDidDismiss((ws) => {
      //CUANDO SE CIERRE EL MODAL VUELVE CON DATOS

      if (ws != undefined) {
        this.openWorkspace(ws);
      }
    });
    workspacesListModal.present();
  }

  killApp() {
    //LLAMA A UN EVENTO DEL POSITIONING
    this.events.publish('killApp');
  }
  minimizeApp() {
    this.connectSubscription.unsubscribe(); //CHEQUEAR
    this.events.publish('minimizeApp');
  }
}
